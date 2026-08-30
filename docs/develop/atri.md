# ATRI 核心模块说明

ATRI 是整个机器人运行时的核心基础层。它把配置加载、初始化、插件发现、事件注册、服务治理、日志输出、消息处理和调度等多个能力组合在一个统一的运行时入口中，提供一个以服务为中心的机器人扩展框架。

从代码结构来看，ATRI 并不是一个单一的大模块，而是很多对象协作的运行体系：

- `ATRI.__init__` 负责初始化全局运行时对象
- `configs` 负责加载 `config.yml` 并转换为 Pydantic 模型
- `load` 负责扫描插件和系统模块并装载
- `service` 负责服务注册、命令识别、权限绑定、状态控制
- `event` / `scheduler` 管理事件和定时任务
- `bot` 管理机器人状态、黑白名单和统计埋点
- `utils` 提供通用工具与基础设施

本文档不仅是一个导航页，也是一张“ATRI 运行链路地图”，用于帮助开发者快速定位真正负责执行逻辑的代码入口。

## 1. 包入口：`ATRI.__init__`

入口文件是 `ATRI/__init__.py`，它决定了项目的全局上下文和启动流程。

### 1.1 配置初始化

```python
__conf_path = Path(".") / "config.yml"
conf_m = Config(__conf_path)
conf = conf_m.config_model
```

关键点：

- 程序启动时，读取项目根目录的 `config.yml`
- 通过 `Config` 类做校验和兼容处理
- 最终生成 `conf` 全局对象，供其他模块使用

这一层的作用是把 YAML 配置转换为结构化配置模型，避免后续代码直接读取原始字典，并提高类型安全性。

### 1.2 基础运行时工具函数

```python
def asgi():
    return nonebot.get_asgi()


def driver():
    return nonebot.get_driver()
```

这两个函数分别提供：

- `asgi()`：获取 NoneBot 的 ASGI 应用入口
- `driver()`：获取当前驱动实例，用于注册生命周期事件、适配器或启动回调

### 1.3 初始化流程：`init()`

```python
def init():
    nonebot.init(**conf_m.get_runtime_conf())
    from nonebot.adapters.onebot.v11 import Adapter

    driver().register_adapter(Adapter)
    from ATRI.load import load_atri

    load_atri()
```

这是整个框架最重要的启动入口之一，流程为：

1. 调用 `nonebot.init(...)`，使用配置对象初始化运行时
2. 注册 OneBot V11 适配器
3. 调用 `ATRI.load.load_atri()`，启动插件和系统模块装载

这里体现了 ATRI 的设计风格：它不直接管理所有插件脚本，而是交给 `load.py` 统一进行装载和依赖处理。

### 1.4 启动：`run()`

```python
def run():
    log_level = "debug" if conf.BotConfig.debug else "warning"
    nonebot.run(log_level=log_level)
```

它的逻辑很简洁：

- 若 `BotConfig.debug` 为真，运行时日志使用 `debug`
- 否则使用 `warning`
- 最终调用 `nonebot.run()` 启动机器人

因此，开发者通常的启动方式是：

```python
from ATRI import init, run

init()
run()
```

这条链路等价于：初始化运行时 → 装载系统和插件 → 启动 NoneBot。

---

## 2. 配置系统：`ATRI.configs`

配置模块负责从 `config.yml` 读取配置，并输出全局运行参数。

### 2.1 关键入口

- `ATRI.configs.Config`
- `Config.get_runtime_conf()`
- `ConfigModel` / `BotConfig` / `RuntimeConfig`

实际流程：

1. 若配置文件不存在，自动执行 `init_config()` 生成默认配置
2. 读取 `config.yml` 和默认配置，做版本比对
3. 在配置过旧或已废弃时进行备份和修正
4. 最终转换为结构化模型：`ConfigModel.model_validate(...)`
5. 通过 `get_runtime_conf()` 输出给 `nonebot.init()` 使用

这意味着：

- 运行时配置不是裸字典
- 它是强类型配置模型
- 配置版本兼容逻辑归入框架本身

详细说明见 [configs](./atri/configs.md)。

---

## 3. 加载系统：`ATRI.load`

`ATRI.load` 是“装载器”，负责激活系统模块和插件目录中的功能。

### 3.1 `load_system()`

```python
def load_system():
    import ATRI.adapter  # noqa: F401
    from ATRI.event.register import register_triggers

    register_triggers()
    nonebot.load_plugins("ATRI/system")
```

它做的事情包括：

- 导入适配器模块
- 注册框架级事件触发器
- 加载 `ATRI/system` 下的系统插件

### 3.2 `load_plugins()`

它会扫描 `plugins/` 目录，并对 plugin 的 `requirements.txt` 进行依赖检查：

- 解析依赖行
- 检查是否已安装
- 缺失时自动执行 `pip install`
- 记录 `package_requirements` 关系
- 将插件目录交给 `nonebot.load_plugins("plugins")` 加载

这层逻辑的意义在于：

- 让插件可以声明自己的运行依赖
- 避免插件启动前因缺包而报错
- 让框架更接近“插件自动装载”模式

### 3.3 `load_atri()`

```python
def load_atri():
    load_system()
    load_plugins()
    from ATRI.service import driver_startup

    driver().on_startup(driver_startup)
```

也就是说，框架启动时的顺序是：

1. 装载系统模块
2. 装载插件
3. 注册驱动启动回调

这个启动顺序非常关键，因为它确保：

- 事件和调度器先准备好
- 插件先进入运行时
- 最后再执行全局初始化回调

详细说明见 [load](./atri/load.md)。

---

## 4. 服务系统：`ATRI.service`

`ATRI.service` 是整个 ATRI 最核心的部分，它定义了“服务”抽象，并把功能模块统一管理起来。

### 4.1 `Service`

`Service` 是服务实例对象，负责：

- 绑定模块名和唯一服务名
- 生成该服务的配置文件
- 设定 docs/version/type/author 等元信息
- 添加 service 级规则和权限
- 注册消息/命令/关键词/正则 matcher
- 提供调度任务入口

关键特性：

- `Service.service`：服务名
- `Service.module_name`：对应模块名
- `Service._rule`：服务默认规则，通常由 `is_in_service(service)` 注入
- `Service._permission`：访问权限
- `Service.get_info()`：导出服务元信息

### 4.2 `ServiceTools`

`ServiceTools` 是服务注册表和查询工具：

```python
class ServiceTools:
    service_list: ClassVar[dict[str, Service]] = {}
```

它提供：

- `get_service(service)`：按名称获取服务
- `load_service_config()`：加载某个服务配置
- `save_service_config()`：保存服务配置
- `auth_service()`：判定用户或群组是否允许访问
- `service_controller()`：开/关某个服务

### 4.3 `is_in_service(service)`

这是服务默认规则的关键：

```python
def is_in_service(service: str) -> Rule:
    async def _is_in_service(event: Event) -> bool:
        user_id = str(getattr(event, "user_id", ""))
        group_id = str(getattr(event, "group_id", ""))
        return ServiceTools(service).auth_service(user_id, group_id)

    return Rule(_is_in_service)
```

它表示：

- 对于某个服务，事件要先经过服务级权限、开关与白名单校验
- 只有通过校验，才允许真正进入对应 matcher

### 4.4 服务注册接口

`Service` 提供一组注册 matcher 的接口：

- `on_message()`
- `on_notice()`
- `on_request()`
- `on_command()`
- `on_keyword()`
- `on_regex()`
- `cmd_as_group()`

这些接口本质上都在构建 `nonebot.matcher.Matcher`，并给每个功能绑定服务上下文。

详细说明见 [service](./atri/service.md)。

---

## 5. 事件系统：`ATRI.event`

事件模块用于定义、注册和触发系统事件，包括 heartbeat、shutdown 以及其它生命周期事件。

它围绕：

- `event` 相关的装饰器或注册器
- 定时事件（heartbeat）
- 系统关停事件（shutdown）
- 事件驱动回调机制

它和 `scheduler`、`bot` 模块往往协同工作：

- `bot` 负责统计和状态控制
- `event` 负责事件触发生命周期
- `scheduler` 负责周期任务调度

详细说明见 [event](./atri/event.md)。

---

## 6. 机器人状态与统计：`ATRI.bot`

`ATRI.bot` 模块管理机器人自身的运行状态、消息记录与服务调用记录。

### 6.1 状态管理

它包含：

- `Statu`
- `BotStatus`
- `GlobalStatus`

用于控制：

- 用户黑白名单
- 群黑白名单
- 全局禁用/启用
- 特定 bot 实例状态

状态检查通过 `run_preprocessor` 在事件处理前执行，提前阻断不符合条件的消息。

### 6.2 统计埋点

`ATRI.bot` 还负责：

- `MessageStatistics`：记录用户或群消息
- `ServiceStatistics`：记录服务调用情况
- `event_postprocessor`：自动写入消息统计
- `run_postprocessor`：记录异常和错误跟踪 ID

它将统计记录缓存到内存中，并通过定时任务批量写库，减少数据库开销。

详细说明见 [bot](./atri/bot.md)。

---

## 7. 工具层：`ATRI.utils`

`ATRI.utils` 是工程工具层，主要提供：

- 时间和字符串处理
- 文件/JSON 读写
- 图片绘制、压缩、转换
- 限流与锁
- SQLite 辅助
- HTTP 请求
- 包管理
- CPU / 内存 / 磁盘 / 网络状态获取
- 更新检查

它是 ATRI 运行时中最低层的基础设施组件，供其他模块直接调用，而不是业务功能主线。

详细说明见 [utils](./atri/utils.md)。

---

## 8. 其他核心模块导航

- [bot](./atri/bot.md) - 机器人状态、统计与消息发送工具
- [configs](./atri/configs.md) - 配置模型与运行时配置加载
- [database](./atri/database.md) - 数据库封装与数据模型
- [event](./atri/event.md) - 事件、心跳和生命周期触发
- [exceptions](./atri/exceptions.md) - 异常与错误跟踪机制
- [load](./atri/load.md) - 插件依赖检查与模块装载顺序
- [log](./atri/log.md) - 日志输出、文件输出与轮转配置
- [message](./atri/message.md) - 消息结构与消息构造辅助
- [permission](./atri/permission.md) - 权限体系与主人/管理员校验
- [rule](./atri/rule.md) - 规则判定和事件过滤
- [scheduler](./atri/scheduler.md) - 定时任务接口与任务控制器
- [service](./atri/service.md) - 服务注册、匹配器绑定与配置管理
- [utils](./atri/utils.md) - 通用工具函数与基础设施

---

## 9. 一个开发者应该如何阅读 ATRI

建议的阅读顺序是：

1. 先看入口：`ATRI.__init__` 和 `ATRI.load`
2. 再看 `ATRI.service`：理解服务注册和 matcher 绑定
3. 然后看 `ATRI.bot`：理解状态、统计和消息发送机制
4. 再看 `ATRI.configs`：理解配置来源和运行时参数
5. 最后查看 `ATRI.event`、`ATRI.scheduler`、`ATRI.utils`：补齐运行时行为和基础设施

这样的顺序最符合项目的真实执行链路，因为 ATRI 的本质是：

- 先初始化运行时
- 再加载系统和插件
- 再注册服务和事件
- 最后让业务功能按匹配器和调度器运行

如果你要扩展新功能，最好的起点通常是：

- `ATRI/service.py`
- `ATRI/load.py`
- `ATRI/configs/config.py`
- 以及对应业务模块的服务类

这样才能最少偏离框架设计原意，最快掌握 ATRI 的扩展方式。
