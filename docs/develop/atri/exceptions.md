# 异常处理模块说明

本文档面向开发者，说明 `ATRI.exceptions` 模块如何定义项目的统一异常体系、保存错误信息、生成追踪 ID，以及过滤 traceback 以便定位真实问题。

## 模块定位

异常相关代码位于：

- `ATRI/exceptions.py`

它提供了：

- 全局错误信息保存
- 基础异常类
- 统一错误类型
- traceback 精简输出

---

## 1. 总体设计

这个模块并不是简单的 `try/except` 工具集，而是一层统一的异常抽象。它让业务代码和底层框架能够使用同一套语义：

- 配置缺失
- 文件读取失败
- 请求失败
- 插件错误
- 机器人运行时错误
- 事件运行错误

这样开发者在上层调用时，就不必不断重复构造不同的异常对象，而是直接抛出项目内置异常类型。

---

## 2. 错误保存：`save_error()` / `load_error()`

```python
def save_error(prompt: str, content: str) -> str:
    track_id = gen_random_str(8)
    data = ErrorInfo(
        track_id=track_id,
        prompt=prompt,
        time=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        content=content,
    )
    path = ERROR_DIR / f"{track_id}.json"
    data.write_into_file(path)
    return track_id
```

```python
def load_error(track_id: str) -> ErrorInfo:
    path = ERROR_DIR / f"{track_id}.json"
    return ErrorInfo.read_from_file(path)
```

### 2.1 设计说明

`ERROR_DIR` 定义为：

```python
ERROR_DIR = Path(".") / "data" / "errors"
ERROR_DIR.mkdir(parents=True, exist_ok=True)
```

它会在运行时自动创建一个错误目录，保存所有异常详情为 JSON 文件。

`ErrorInfo` 模型：

```python
class ErrorInfo(BaseModel):
    track_id: str
    prompt: str
    time: str
    content: str
```

字段含义：

- `track_id`：唯一追踪 ID
- `prompt`：错误提示语
- `time`：时间戳
- `content`：错误正文内容

这个机制非常适合：

- 调试错误
- 排查线上问题
- 把错误信息存档
- 在 WebUI 或后台中进行查询

---

## 3. 错误追踪 ID

项目生成错误时，会用：

```python
track_id = gen_random_str(8)
```

返回值是一个随机字符串，长度为 8。这样每个错误都可唯一定位，后续查阅日志或错误 JSON 文件时很方便。

典型调用思路：

```python
track_id = save_error("插件错误", "某个插件执行异常")
print(track_id)
```

之后通过 `load_error(track_id)` 即可重新读取对应异常记录。

---

## 4. 基础异常：`BaseBotException`

```python
class BaseBotException(Exception):
    prompt: Optional[str] = "ignore"

    def __init__(self, prompt: Optional[str]) -> None:
        self.prompt = prompt or self.__class__.prompt or self.__class__.__name__
        super().__init__(self.prompt)
```

这是整个项目异常体系的根类。它的特点是：

- 继承自 `Exception`
- 提供默认 `prompt`
- 可通过构造参数覆盖提示语
- 统一了异常命名与提示文本

### 4.1 提示语设计

例如：

```python
class NotConfigured(BaseBotException):
    prompt = "缺少配置"
```

这样在抛出异常时，默认 `prompt` 就是“缺少配置”。

如果业务代码传入了更具体的说明：

```python
raise NotConfigured("缺少 BotConfig.host")
```

则 `self.prompt` 会被覆盖为更具体的提示。

---

## 5. 预定义异常类型

下面是当前项目定义的异常分类：

### 配置相关

- `NotConfigured`：缺少配置
- `InvalidConfigured`：无效配置

### 文件 IO

- `WriteFileError`：写入错误
- `ReadFileError`：读取文件失败

### 请求 / 格式

- `RequestError`：网页 / 接口请求错误
- `FormatError`：格式错误

### 服务 / 插件相关

- `ServiceRegisterError`：服务注册错误
- `ServiceNotFoundError`：找不到指定服务
- `PluginError`：插件错误

### 运行时相关

- `BotRuntimeError`：机器人运行时错误
- `EventRuntimeError`：事件运行错误

### 5.1 `EventRuntimeError`

```python
class EventRuntimeError(BaseBotException):
    prompt = "事件运行错误"

    def __init__(self, prompt: str, content: str) -> None:
        self.content = content
        super().__init__(prompt)
```

它与普通异常的区别在于：

- 额外保存 `content` 字段
- 用于事件链路中记录更详细的运行上下文

这类异常通常适用于事件总线或消息处理器场景。

---

## 6. traceback 精简：`str_traceback()`

```python
def str_traceback(e) -> str:
    return _str_traceback(traceback.format_exception(type(e), e, e.__traceback__))
```

```python
def _str_traceback(traceback_msg: list) -> str:
    filtered_lines = [traceback_msg[0]]
    for line in traceback_msg[1:-1]:
        if "site-packages" not in line:
            filtered_lines.append(line)
    filtered_lines.append(traceback_msg[-1])
    return "".join(filtered_lines)
```

### 6.1 作用

它的目的是：

- 保留最关键的异常头部
- 去掉 `site-packages` 中的第三方库堆栈噪音
- 让开发者更容易看到项目自身代码的位置

例如，原始 traceback 很可能会包含大量 Python 标准库或安装包的调用堆栈，导致日志不直观。这里会过滤掉包含 `site-packages` 的行。

这使得日志更像：

- 用户代码的错误
- 项目模块调用链
- 真正需要排查的栈帧

---

## 7. 典型使用方式

### 7.1 抛出项目内置异常

```python
from ATRI.exceptions import ReadFileError

try:
    open("missing.txt", "r", encoding="utf-8")
except FileNotFoundError:
    raise ReadFileError("配置文件不存在")
```

### 7.2 保存错误记录

```python
from ATRI.exceptions import save_error

try:
    1 / 0
except ZeroDivisionError as e:
    track_id = save_error("运行时错误", str(e))
    print(f"错误追踪 ID: {track_id}")
```

### 7.3 精简 traceback

```python
from ATRI.exceptions import str_traceback

try:
    raise ValueError("demo")
except ValueError as e:
    print(str_traceback(e))
```

---

## 8. 设计亮点

这个异常模块的价值主要体现在：

1. 统一错误语义
   - 项目中的各种错误都能映射到内容清晰的异常类型

2. 可追踪排查
   - `track_id` 提供了完整错误档案的唯一索引

3. 日志可读性更高
   - `str_traceback()` 移除了大量无关栈帧

4. 易于上层扩展
   - 新增异常类时只需继承 `BaseBotException`

---

## 9. 开发建议

### 9.1 新增异常时

新增异常类型时，一般遵循以下约定：

- 继承 `BaseBotException`
- 设置合理的 `prompt`
- 若需要额外上下文，扩展 `__init__`

例如：

```python
class CustomBizError(BaseBotException):
    prompt = "业务处理失败"
```

### 9.2 处理真实错误时

不要把所有异常都吞掉，建议：

- 记录 `save_error()`
- 使用 `str_traceback()` 输出简洁日志
- 对外抛出语义明确的项目异常

这样既能保留回溯信息，又能给调用方一个稳定的异常接口。

---

## 10. 总结

`ATRI.exceptions` 是整个项目错误治理的基础层。它让异常从“裸 Python 错误”升级为“带语义、可存档、可追踪”的统一错误体系。

对于开发者而言，理解这个模块的核心价值有三点：

- 统一异常类型，增强代码表达力
- 保存错误内容，方便排查和回放
- 精简 traceback，提高日志可读性

这也是 ATRI 在工程实践中非常重要的一层基础设施。

