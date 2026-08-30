# service 模块

`ATRI.service` 模块是 ATRI 项目的核心服务层。它把“服务注册、命令绑定、权限校验、配置管理、调度管理、生命周期控制”统一到一个 `Service` 抽象中，使开发者可以像“声明一个功能模块”一样扩展机器人功能。

## 模块定位

服务相关代码位于：

- `ATRI/service.py`

它重点解决的问题包括：

- 服务统一注册到全局表 `ServiceTools.service_list`
- 按模块/服务维度管理命令与事件处理器
- 控制服务启用/禁用状态
- 支持插件配置与服务配置绑定
- 与 NoneBot 的 `Matcher`、`Rule`、`Permission` 体系结合
- 为服务提供调度任务管理器

---

## 1. 总体设计

`ATRI.service` 的设计思路非常接近“插件化服务注册中心”：

- 每个功能都包装成一个 `Service` 实例
- `Service` 负责声明自身的元信息、规则和权限
- `Service` 还可以注册消息处理、命令、关键词、正则等 matcher
- 运行时通过 `ServiceTools` 做全局查询和状态控制

这样做带来的好处是：

- 功能模块解耦
- 命令统一收口
- 服务可启用/禁用
- 便于做帮助系统、服务列表管理和权限控制

---

## 2. `Service` 类

`Service` 是整个模块的核心，负责描述一个服务。它本质上充当：

- 一个模块容器
- 一个命令注册器
- 一个规则、权限、状态绑定器
- 一个配置管理入口

### 2.1 构造函数

```python
Service(
    service: str,
    docs: str = "无介绍",
    version: str = "",
    type_: Service.ServiceType = Service.ServiceType.OTHER,
    author: str | None = None,
)
```

参数说明：

- `service`：服务名，必须唯一且非空
- `docs`：服务说明
- `version`：版本号
- `type_`：服务类型
- `author`：作者信息

关键动作：

```python
self._rule = is_in_service(service)
self._path = PLUGIN_DATA_DIR / self.service
self.__generate_service_conf()
ServiceTools.service_list[service] = self
```

也就是说，实例化时会：

1. 默认绑定一个“服务是否可用”的规则
2. 创建该服务的数据目录
3. 自动生成配置文件
4. 注册到全局服务表中

### 2.2 服务类型：`Service.ServiceType`

```python
class ServiceType(Enum):
    SYSTEM = "系统服务"
    LKPLUGIN = "LK扩展服务"
    FUNCTION = "功能性服务"
    ENTERTAINMENT = "娱乐服务"
    GAME = "游戏服务"
    SUBSCRIBE = "订阅服务"
    OTHER = "其他服务"
    CLOSED = "已关闭的服务"
    HIDDEN = "隐藏服务"
```

这些类型具有语义化价值：

- `SYSTEM`：框架级服务
- `FUNCTION`：功能型插件
- `GAME`：游戏类
- `SUBSCRIBE`：订阅类
- `HIDDEN`：隐藏型服务

其中：

```python
if type_ is self.ServiceType.CLOSED:
    raise ServiceRegisterError("无法注册`CLOSED`服务类型")
```

说明关闭型服务不能正常注册。

---

## 3. `Service` 的常用配置方法

这些方法属于“声明式配置”，非常适合服务初始化时使用。

### 3.1 `document()`

```python
def document(self, context: str) -> "Service":
    self._docs = context
    return self
```

用法：

```python
svc = Service("demo").document("这是一个示例服务")
```

### 3.2 `version()` / `author()`

```python
def version(self, version: str) -> "Service":
    self._version = version
    return self
```

```python
def author(self, author: str) -> "Service":
    self._author = author
    return self
```

### 3.3 `allow_switch()`

```python
def allow_switch(self, _is: bool) -> "Service":
    self._allow_switch = _is
    return self
```

表示服务是否允许被开关控制。

### 3.4 `rule()`

```python
def rule(self, rule: Rule | T_RuleChecker | None) -> "Service":
    self._rule = self._rule & rule
    return self
```

它会把当前服务的基准规则和新增规则组合起来，一起用于事件判定。

### 3.5 `permission()`

```python
def permission(self, perm: Permission) -> "Service":
    self._permission = perm
    return self
```

用于给服务绑定权限，例如：

```python
from ATRI.permission import MASTER
svc.permission(MASTER)
```

### 3.6 `handlers()` / `priority()` / `state()`

```python
def handlers(self, hand: list[T_Handler] | None) -> "Service":
    self._handlers = hand
    return self
```

```python
def priority(self, level: int) -> "Service":
    self._priority = level
    return self
```

```python
def state(self, state: T_State | NotImplementedError) -> "Service":
    self._state = state
    return self
```

这些方法用于统一设置：

- 默认处理函数
- 优先级
- 状态对象

### 3.7 `main_cmd()`

```python
def main_cmd(self, cmd: str) -> "Service":
    self._main_cmd = (cmd,)
    return self
```

该方法用于主命令前缀，适合 `cmd_as_group` 这种命令分组模式。

### 3.8 `temp()`

```python
def temp(self, _is: bool) -> "Service":
    self._temp = _is
    return self
```

用于设置临时服务。

---

## 4. 服务配置与数据目录

### 4.1 `get_path()`

```python
def get_path(self) -> Path:
    if not self._path.exists():
        self._path.mkdir(parents=True, exist_ok=True)
    return self._path
```

它会为每个服务创建一个专属数据目录，方便存储：

- 缓存
- JSON 配置
- 生成文件
- 运行态数据

### 4.2 自动配置生成

```python
def __generate_service_conf(self):
    path = CONFIG_DIR / f"{self.service}.json"
    if path.is_file():
        return
    data = ServiceConfig(
        enabled=True,
        white_list_mode=False,
    )
    try:
        data.write_into_file(path)
    except Exception:
        raise WriteFileError("Write service config failed")
```

也就是说，服务创建时，如果还没有配置文件，就会生成默认配置：

```python
ServiceConfig(enabled=True, white_list_mode=False)
```

这点很重要，因为服务启用状态和白名单规则都通过这里保存。

---

## 5. `ServiceInfo` / `ServiceConfig` / `CommandInfo`

### 5.1 `ServiceInfo`

```python
class ServiceInfo(BaseModel):
    service: str
    docs: str
    version: str
    type: str
    author: str | None
    permission: str | None | list
    cmd_list: dict | None
    allow_switch: bool
```

它用于描述服务对外可见的信息。比如：

```python
info = service.get_info()
print(info.service)
print(info.cmd_list)
```

### 5.2 `ServiceConfig`

```python
class ServiceConfig(BaseModel):
    enabled: bool = True
    disable_user: ClassVar[list[str]] = []
    disable_group: ClassVar[list[str]] = []
    white_list_mode: bool = False
    white_list: ClassVar[list[str]] = []
```

该配置对象用于：

- 控制服务启用状态
- 禁止指定用户
- 禁止指定群
- 允许白名单模式

### 5.3 `CommandInfo`

```python
class CommandInfo(BaseModel):
    type: str
    docs: str
    aliases: list
```

用于记录某个命令的说明和别名，以便后续帮助文档或插件管理功能展示。

---

## 6. 命令与事件注册接口

`Service` 为开发者提供了若干注册方法，能快速将消息/事件监听器挂接到 NoneBot。

### 6.1 `on_message()`

```python
def on_message(
    self,
    name: str = "",
    docs: str = "",
    rule: Rule | T_RuleChecker | None = None,
    permission: Permission | T_PermissionChecker | None = None,
    handlers: list[T_Handler | Dependent] | None = None,
    block: bool = True,
    priority: int = 10,
    state: T_State | None = None,
) -> type[Matcher]:
```

这是最通用的入口。它会：

- 默认使用当前服务的 `self._rule`
- 默认使用当前服务的 `self._permission`
- 默认使用当前服务的 `self._handlers`
- 生成 `Matcher.new("message", ...)`

此方法对开发者来说是最基础的服务注册入口。

### 6.2 `on_notice()`

```python
def on_notice(self, name: str, docs: str, block: bool = True) -> type[Matcher]:
```

用于注册通知事件。它会记录：

```python
self._cmd_list[name + "-onntc"] = CommandInfo(...)
```

### 6.3 `on_request()`

用于注册请求事件。逻辑与 `on_notice()` 类似。

### 6.4 `on_command()`

```python
def on_command(
    self,
    cmd: str | tuple[str, ...],
    docs: str,
    rule: Rule | T_RuleChecker | None = None,
    aliases: set[str | tuple[str, ...]] | None = None,
    block: bool = True,
    **kwargs,
) -> type[Matcher]:
```

这是最常用的命令注册方法：

- 支持字符串命令
- 支持命令元组
- 支持别名集合
- 最终仍通过 `on_message()` 生成 matcher

示例：

```python
@svc.on_command("hello", docs="打招呼")
async def hello(matcher, event):
    await matcher.finish("hello")
```

### 6.5 `on_keyword()`

```python
def on_keyword(
    self,
    keywords: set[str],
    docs: str,
    rule: Rule | T_RuleChecker | None = None,
    **kwargs,
) -> type[Matcher]:
```

它内部将关键词转换成 `nonebot.rule.keyword(*keywords)`。

### 6.6 `on_regex()`

```python
def on_regex(
    self,
    pattern: str,
    docs: str,
    flags: int | re.RegexFlag = 0,
    rule: Rule | T_RuleChecker | None = None,
    **kwargs,
) -> type[Matcher]:
```

适合：

- 解析结构化文本
- 关键词模式匹配
- 事件过滤

### 6.7 `cmd_as_group()`

```python
def cmd_as_group(self, cmd: str, docs: str, **kwargs) -> type[Matcher]:
    if not cmd:
        raise TypeError("cmd is required")

    sub_cmd = (cmd,)
    _cmd = self._main_cmd + sub_cmd
    return self.on_command(_cmd, docs, **kwargs)
```

它把命令变成“主命令 + 子命令”的分组形式，便于组织较复杂的命令体系。

---

## 7. 运行时生命周期

### 7.1 `on_startup()`

```python
def on_startup(self, func):
    if not self.driver_started:
        driver().on_startup(func)
    else:
        if (func.__code__.co_flags & 80) != 0:
            asyncio.run(func())
        else:
            func()
```

它用于注册启动时执行函数：

- 如果驱动还没启动，则挂在驱动启动回调上
- 如果已经启动了，则直接执行

这意味着开发者可以在服务初始化时注册一个启动逻辑，确保在系统启动后执行。

### 7.2 `unload()`

```python
async def unload(self):
    # 清理 matchers
    for priority, matcher_group in list(matchers.items()):
        matcher_group[:] = [
            matcher
            for matcher in matcher_group
            if getattr(matcher, "module_name", None) != self.service
        ]
        if not matcher_group:
            del matchers[priority]

    # 清理定时任务
    jobs = SchedulerController.service_schedulers.get(self.service, {})
    for job_name, job in list(jobs.items()):
        try:
            job.job.remove()
        except Exception as e:
            log.warning(f"移除定时任务 {job_name} 失败: {e}")
        finally:
            jobs.pop(job_name, None)
    SchedulerController.service_schedulers.pop(self.service, None)

    # 执行卸载回调
    hooks = list(getattr(self, "_on_unload_handlers", []))
    self._on_unload_handlers.clear()
    for func in hooks:
        if not callable(func):
            continue
        result = func()
        if inspect.isawaitable(result):
            await result
```

它完成了服务卸载时需要处理的三件事：

1. 清理该服务注册的 matcher
2. 清理该服务在调度器中的任务
3. 触发服务卸载钩子

这使服务热卸载更稳定。

### 7.3 `on_unload()`

```python
def on_unload(self, func):
    self._on_unload_handlers.append(func)
    return func
```

用于注册卸载时执行的回调。

---

## 8. 服务配置控制：`ServiceTools`

`ServiceTools` 是管理服务全局状态和配置的工具类。

### 8.1 全局服务表

```python
service_list: ClassVar[dict[str, Service]] = {}
```

这是一张全局注册表，键是服务名，值是对应的 `Service` 实例。

### 8.2 `load_service()`

```python
def load_service(self) -> ServiceInfo:
    return self.get_service(self.service).get_info()
```

用于查询服务元信息。

### 8.3 `load_service_config()` / `save_service_config()`

```python
def load_service_config(self) -> ServiceConfig:
    path = CONFIG_DIR / f"{self.service}.json"
    if not path.is_file():
        raise ReadFileError(f"无法找到服务 {self.service} 对应的信息文件\n请重新启动")
    return ServiceConfig.read_from_file(path)
```

```python
def save_service_config(self, service_config: ServiceConfig):
    path = CONFIG_DIR / f"{self.service}.json"
    service_config.write_into_file(path)
```

用于保存/读取每个服务的运行状态配置。

### 8.4 `auth_service()`

```python
def auth_service(
    self, user_id: str | None = None, group_id: str | None = None
) -> bool:
    data = self.load_service_config()
    auth_global = data.enabled
    if not auth_global:
        return False

    auth_user = data.disable_user
    if user_id and user_id in auth_user:
        return False

    auth_group = data.disable_group
    if group_id:
        if group_id in auth_group:
            return False
        if data.white_list_mode and group_id not in data.white_list:
            return False
    return True
```

这就是服务权限可用性的核心判定：

- 服务全局是否启用
- 指定用户是否被禁止
- 指定群是否被禁止
- 若启用白名单模式，则只有白名单群可用

### 8.5 `service_controller()`

```python
def service_controller(self, is_enabled: bool):
    data = self.load_service_config()
    data.enabled = is_enabled
    self.save_service_config(data)
```

用于统一启用/禁用某个服务。

### 8.6 `get_service()` / `get_typed_service_dict()`

```python
@classmethod
def get_service(cls, service) -> Service | None:
    if service in cls.service_list:
        return cls.service_list[service]
    return None
```

```python
@classmethod
def get_typed_service_dict(cls):
    s_d = {}
    for s_t in Service.ServiceType:
        if s_t == Service.ServiceType.CLOSED:
            continue
        s_d[s_t.value] = []
    for s in cls.service_list.values():
        info = s.get_info()
        s_d[info.type].append(info.service)
    return s_d
```

这两个方法用于：

- 按名称获取服务实例
- 按服务类型分组返回列表，常用于后台管理或帮助系统

---

## 9. 服务启用规则：`is_in_service()`

```python
def is_in_service(service: str) -> Rule:
    async def _is_in_service(event: Event) -> bool:
        user_id = str(getattr(event, "user_id", ""))
        group_id = str(getattr(event, "group_id", ""))
        return ServiceTools(service).auth_service(user_id, group_id)

    return Rule(_is_in_service)
```

这是一个非常关键的全局规则。它允许：

- 在事件进入服务处理逻辑前先判断服务是否允许当前用户/群使用
- 让服务级别的可用性本身成为事件规则的一部分

因此，服务并不是“无条件可运行”，而是会自然地受到：

- 全局开关
- 用户黑名单
- 群黑名单
- 白名单模式控制

---

## 10. 启动回调：`driver_startup()`

```python
def driver_startup():
    log.success("启动函数执行完成")
    Service.driver_started = True
```

这是一个非常简洁的启动流程标记：

- 说明驱动已经完成启动
- 让 `Service.on_startup()` 之后的逻辑知道它可以直接执行

---

## 11. `send_to_master()`

```python
@staticmethod
async def send_to_master(message: str | Message):
    bot = get_bot()
    for m in MASTER_LIST:
        await bot.send_private_msg(user_id=m, message=message)
```

这个方法把消息发送给所有主人：

- 先拿到当前 bot
- 遍历 `MASTER_LIST`
- 向每个主人私聊发送消息

适合：

- 告警通知
- 运行状态广播
- 关机/重启提醒

---

## 12. 使用示例

### 12.1 创建一个简单服务

```python
from ATRI.service import Service

svc = Service("demo", docs="示例服务", version="1.0.0")
svc.permission(MASTER)

@svc.on_command("hello", docs="问候")
async def hello(matcher, event):
    await matcher.finish("hello, ATRI")
```

### 12.2 绑定插件配置

```python
from ATRI.service import Service
from ATRI.utils.model import BaseModel

class DemoConfig(BaseModel):
    enabled: bool = True
    max_times: int = 10

svc = Service("demo")
config = svc.add_plugin_config(DemoConfig)
print(config.config().enabled)
```

### 12.3 获取服务信息

```python
info = svc.get_info()
print(info.service)
print(info.type)
print(info.permission)
```

### 12.4 启用 / 禁用服务

```python
svc.conf().enabled = False
svc.conf().write_into_file(...)  # 也可通过 ServiceTools 统一机制进行保存
```

或者通过 `ServiceTools`：

```python
from ATRI.service import ServiceTools

st = ServiceTools("demo")
st.service_controller(False)
```

---

## 13. 实际开发中的注意事项

### 13.1 服务名不能重复

构造函数已经显式校验：

```python
if service in ServiceTools.service_list or service == "ATRI":
    raise ServiceRegisterError("服务重复注册或服务名违规")
```

这保证了全局唯一性。

### 13.2 需要在 NoneBot 生态中使用

这个模块直接与：

- `Matcher`
- `Rule`
- `Permission`
- `event`
- `bot`

强相关，因此它最适合在 NoneBot 环境中使用。

### 13.3 服务配置应该一并维护

服务不是只存在于内存中，最好同时关注：

- `Service` 对象配置
- 存盘的 JSON 配置
- 命令元信息 `cmd_list`
- 插件配置模型

这样才不会出现“运行时正常但配置丢失”之类的问题。

---

## 14. 设计亮点

`ATRI.service` 的关键价值是：

1. 把功能模块抽象成统一的 `Service`
2. 将事件、命令、权限、配置绑定到同一对象上
3. 通过 `ServiceTools` 做全局管理和状态判断
4. 通过 `Rule` 把“服务是否可用”放进事件过滤层
5. 通过 `ServiceConfig` 做服务可控性和白名单管理

这使它不仅是“命令注册器”，而更像项目里的服务控制中心。

---

## 15. 总结

`ATRI.service` 是 ATRI 体系中最核心的基础设施之一，它把复杂的插件化系统压缩为一个统一抽象：

- 服务创建
- 命令注册
- 权限绑定
- 插件配置
- 调度任务
- 生命周期管理
- 服务启用/禁用控制

理解这个模块之后，后续开发新功能、增加插件、扩展命令系统会变得非常自然。几乎所有 ATRI 中的服务都遵循同一套抽象接口，这也是整个项目架构稳定性的关键来源。
