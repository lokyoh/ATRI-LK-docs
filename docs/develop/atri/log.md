# 日志模块说明

本文档面向开发者，说明 `ATRI.log` 模块如何基于 NoneBot 的 `logger` 和 Loguru 统一管理控制台输出与文件日志。

## 模块定位

日志相关代码位于：

- `ATRI/log.py`

它主要负责：

- 初始化日志目录
- 配置控制台输出
- 按级别输出到不同文件
- 重命名插件日志来源
- 依据配置切换 DEBUG / INFO 输出级别

---

## 1. 总体设计

这个模块不是一个独立的日志库封装，而是对 NoneBot 自带日志器进行统一配置。具体来说：

```python
from nonebot.log import logger as log
```

项目直接复用 NoneBot 的 `logger`，然后用 `log.remove()` 和 `log.add()` 重新注册处理器，以达到统一规范输出的目的。

这样做的优势是：

- 保持与 NoneBot 生态一致
- 能同时输出控制台和文件日志
- 方便按日志级别分类保存
- 能改写插件日志名称，方便区分模块来源

---

## 2. 日志目录

```python
LOGGER_DIR = Path(".") / "data" / "logs"
LOGGER_DIR.mkdir(exist_ok=True, parents=True)
```

日志默认保存在项目根目录下的：

```text
data/logs/
```

按需创建了以下子目录：

- `info/`
- `warning/`
- `error/`
- `debug/`

这样能把不同级别的日志分开，便于排查问题。

---

## 3. 记录时间与输出格式

```python
_NOW_TIME = datetime.now().strftime("%Y%m%d-%H")

_LOG_FORMAT = (
    "\033[36mATRI\033[0m "
    "| <g>{time:MM-DD HH:mm:ss}</g> "
    "| <lvl>{level}</lvl> "
    "<c><u>{name}</u></c> >> "
    "{message}"
)
```

这里定义了：

- `ATRI` 前缀标识
- 时间格式：`MM-DD HH:mm:ss`
- 日志级别
- 日志名
- 真正的消息内容

它的输出很适合终端观察，因为颜色和分层明显，便于快速定位问题。

---

## 4. 日志命名处理器：`LoguruNameDealer`

```python
class LoguruNameDealer:
    def __call__(self, record):
        log_handle = record["name"]
        if "nonebot.plugin.manager" in log_handle:
            plugin_name = log_handle.split(".")[-1]
            record["name"] = f"plugin.{plugin_name}"
        else:
            record["name"] = record["name"].split(".")[0]

        return record
```

### 4.1 目的

这个处理器会把日志名规范化：

- 如果日志来自 NoneBot 插件管理器，则显示为：

```text
plugin.xxx
```

这样插件日志会非常清晰。

- 如果不是插件，则只保留第一段名称，例如：

```text
ATRI
```

或者其他模块名。

这是一种常见的日志可读性优化。

---

## 5. 控制台输出配置

```python
log.remove()
log.add(
    sys.stdout,
    level="DEBUG" if conf.BotConfig.debug else "INFO",
    colorize=True,
    filter=LoguruNameDealer(),
    format=_LOG_FORMAT,
)
```

关键点：

- 先移除默认处理器
- 再添加自定义控制台处理器
- 当 `conf.BotConfig.debug` 为 `True` 时，使用 `DEBUG` 级别输出
- 否则只输出 `INFO` 及以上日志
- `colorize=True` 让输出更容易区分级别

因此，开发者在调试模式下可以看到更详细的日志。线上环境则更安静。

---

## 6. 文件日志配置

项目会向不同级别分开写入文件：

```python
log.add(
    LOGGER_DIR / "info" / f"{_NOW_TIME}.log",
    rotation="10 MB",
    enqueue=True,
    level="INFO",
    encoding="utf-8",
    format=_LOG_FORMAT,
)
```

同样还有：

- `warning`：警告日志
- `error`：错误日志
- `debug`：调试日志

### 6.1 日志切分

```python
rotation="10 MB"
```

意味着每个日志文件最多 10MB，超出后自动滚动生成新文件。它是非常实用的日志管理方式，避免单个文件过大。

### 6.2 异步写入

```python
enqueue=True
```

启用了异步日志写入，避免阻塞主事件循环或影响机器人处理速度。

---

## 7. 日志级别设计

文件日志按级别分类，通常代表：

- `INFO`：常规运行状态
- `WARNING`：潜在问题
- `ERROR`：错误发生
- `DEBUG`：开发调试信息

而控制台日志级别由配置决定：

```python
"DEBUG" if conf.BotConfig.debug else "INFO"
```

这意味着：

- 调试模式下输出全部日志
- 非调试模式下屏蔽 `DEBUG`，便于稳定运行

---

## 8. 开发中的使用方式

在项目中直接使用：

```python
from ATRI.log import log

log.info("开始初始化...")
log.warning("配置文件缺失，使用默认值")
log.error("插件加载失败")
log.debug("调用栈细节：{}", data)
```

### 8.1 与 NoneBot 兼容

由于本模块复用的是 `nonebot.log.logger`，所以它和 NoneBot 的其他模块没有断层。也就是说：

- 插件中使用 `logger` 或 `log` 都能很自然地输出到同一日志系统
- 控制台和文件日志保持统一格式

---

## 9. 设计亮点

`ATRI.log` 的设计有几个重点：

1. 集中日志配置
   - 统一控制台和文件输出，不散落在各处

2. 按级别分文件
   - 便于后续问题排查

3. 插件日志命名规范化
   - 提高日志可读性

4. 可根据调试模式自动调整输出量
   - 小心平衡信息量与运行效率

---

## 10. 开发建议

### 10.1 日志分层

建议开发者在代码中遵循：

- `info`：正常流程信息
- `warning`：不影响运行但值得注意的情况
- `error`：真正的错误或异常
- `debug`：调试信息，仅在开发阶段使用

### 10.2 记录上下文

日志最好不要只写一句“失败了”，而应该尽量补充：

- 模块名
- 发生在哪个步骤
- 相关对象或参数
- 可能的原因

### 10.3 避免过度 debug

调试日志虽然有用，但在生产环境中过量输出会影响性能。因此应遵循：

- 开发时打开 `debug`
- 生产环境保持 `INFO` 或以上

---

## 11. 总结

`ATRI.log` 是整个项目运行状态的可视化窗口。它把 NoneBot 的日志体系接入到 ATRI 的工程化需求中：

- 控制台输出清晰
- 文件按级别归档
- 插件日志更易识别
- 调试模式和生产模式可以切换

这使其成为项目开发、运维和排障中不可缺少的一层基础设施。

