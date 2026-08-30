# bot 模块

`ATRI.bot` 是 ATRI 项目中与“具体机器人实例相关”的核心子模块。它负责三件事情：

- 统一抽象机器人用户/群组模型
- 管理机器人的全局/实例级黑白名单状态
- 记录消息与服务调用统计，并对外提供常用消息发送工具

与许多框架中单纯的适配层不同，这个模块更偏“运行时控制层”：它在 NoneBot 生命周期里接入连接/断开、消息预处理、统计埋点与错误上报，是机器人真正运行时的基础能力之一。

## 模块位置

- 代码目录：`ATRI/bot`
- 主要文件：
  - `ATRI/bot/__init__.py`
  - `ATRI/bot/model.py`
  - `ATRI/bot/status.py`
  - `ATRI/bot/utils.py`
  - `ATRI/bot/statistics/__init__.py`
  - `ATRI/bot/statistics/model.py`

---

## 1. 总体设计

`bot` 模块可以理解为“机器人状态 + 机器人数据 + 机器人动作”的集中管理单元。

它有三个重要层次：

1. 数据模型层
   - `User`、`Group`、`UserSex`
   - 定义机器人所关心的实体字段

2. 状态管理层
   - `Statu`、`BotStatus`、`GlobalStatus`
   - 负责控制用户或群组是否被允许访问/触发处理

3. 统计与工具层
   - `BotUtils.send_message()`
   - `add_message()` / `add_server_statistic()` / `manual_add_server_statistic()`
   - 用于消息埋点、服务调用埋点、错误保存和批量入库

这套设计让业务代码可以在不关心底层细节的情况下，直接用统一接口向机器人发消息、检查是否被阻挡、记录调用状态。

---

## 2. 数据模型：用户与群组

数据模型位于 `ATRI/bot/model.py`。

### 2.1 `UserSex`

```python
class UserSex(Enum):
    FEMALE = "female"
    MALE = "male"
    UNKNOWN = "unknown"
```

这是一个枚举类型，用于描述用户性别。这个枚举值没有复杂逻辑，只是对平台层返回的性别标识做标准化。

### 2.2 `User`

`User` 是一个 Pydantic `BaseModel`，字段覆盖常见的 QQ/机器人用户信息：

- `nickname`
- `user_id`
- `age`
- `birthday_day` / `birthday_month` / `birthday_year`
- `user_category_id` / `category_id` / `category_name`
- `email`
- `level`
- `login_days`
- `phone_num`
- `qid`
- `remark`
- `sex`

它的设计目标不是“业务对象”，而是“平台用户快照”。

也就是说：

- 获取好友列表时，用 `User.model_validate()` 把原始数据转换为结构化对象
- 后续逻辑可以安全访问字段，并避免字典键错误带来的运行时异常

### 2.3 `Group`

`Group` 定义群信息：

- `group_all_shut`
- `group_id`
- `group_name`
- `group_remark`
- `max_member_count`
- `member_count`

它同样是在获取群列表时使用 Pydantic 做校验与转换的模型。

> 这类模型的意义在于：机器人功能经常需要访问用户/群信息，而这些信息往往来自协议端原始 JSON，使用模型后可以在类型层面提高稳定性。

---

## 3. 状态管理：黑白名单与全局阻断

状态系统位于 `ATRI/bot/status.py`，是 bot 模块中最关键的运行时控制部分。

### 3.1 `Statu`

```python
class Statu(BaseModel):
    enable: bool = True
    is_group_black_list: bool = True
    is_user_black_list: bool = True
    group_black_list: list[str] = []
    user_black_list: list[str] = []
    group_white_list: list[str] = []
    user_white_list: list[str] = []
```

`Statu` 表示单个 bot 或全局状态容器。字段含义如下：

- `enable`：总开关，设为 `False` 时直接阻止所有访问
- `is_group_black_list`：群黑名单模式开关
- `is_user_black_list`：用户黑名单模式开关
- `group_black_list` / `user_black_list`：黑名单列表
- `group_white_list` / `user_white_list`：白名单列表

这里的设计采用“黑白名单可能互斥”的模式：

- 若 `is_xxx_black_list == True`，则在名单中出现时直接封禁
- 若 `False`，则表示进入白名单模式，只有名单中的允许对象才通过

### 3.2 `BotStatus`

`BotStatus` 是按 bot 实例维度保存状态的容器：

```python
class BotStatus:
    data: dict[str, Statu] = {}
```

关键方法：

- `add_bot_statu(bot_id)`
  - 在连接成功时给当前 bot 添加状态记录
- `remove_bot_statu(bot_id)`
  - 在断开时移除状态记录并同步写回文件
- `get_bot_status()`
  - 读取 `bot_status.json`
- `set_bot_status(bot_id, statu)`
  - 持久化到 JSON 文件
- `is_blocked(bot_id, user_id=None, group_id=None)`
  - 判定某个 bot + 某个用户/群是否被阻止

`bot_status.json` 的本质是一个 `dict[str, dict]`，以 bot_id 为 key 承载各自的 `Statu` 配置。

### 3.3 `GlobalStatusModel`

全局状态模型与 `BotStatus` 相似，但它是不区分 bot 的全局控制：

```python
class GlobalStatusModel:
    def __init__(self):
        self.status = Statu()
        self.read_from_file()
```

它保存到 `global_status.json`，并通过以下接口工作：

- `is_blocked(user_id=None, group_id=None)`
- `save_to_file()`
- `read_from_file()`

`GlobalStatus` 是单例对象：

```python
GlobalStatus: GlobalStatusModel = GlobalStatusModel()
```

它用于在框架级统一判断：例如全局禁用某些用户或群组时，所有事件都将提前拦截。

### 3.4 运行时拦截：`run_preprocessor`

这部分是 bot 模块真正发挥作用的关键：

```python
@run_preprocessor
async def _(event: Event):
    bot_id = str(event.self_id)
    user_id = str(getattr(event, "user_id", ""))
    group_id = str(getattr(event, "group_id", ""))

    if GlobalStatus.is_blocked(user_id, group_id):
        raise IgnoredException(...)
    if BotStatus.is_blocked(bot_id, user_id, group_id):
        raise IgnoredException(...)
```

这段逻辑会在消息处理前执行：

- 先检查全局状态
- 再检查当前 bot 实例状态
- 若命中黑名单或被总开关禁用，则抛出 `IgnoredException`

这使得“黑名单/白名单”不只是配置项，而是正式的消息处理前拦截机制。

### 3.5 生命周期事件

在 `ATRI/bot/__init__.py` 中注册了连接/断开事件：

```python
@driver().on_bot_connect
def _(bot: Bot):
    bot_id = str(bot.self_id)
    BotStatus.add_bot_statu(bot_id)

@driver().on_bot_disconnect
def _(bot: Bot):
    bot_id = str(bot.self_id)
    BotStatus.remove_bot_statu(bot_id)
```

这表示：

- 机器人上线后，status 记录会自动创建
- 下线后，对应 `bot_status` 中记录会移除

这样的设计是为了让状态管理跟随真实 bot 生命周期，避免僵尸状态残留。

---

## 4. 实用工具：消息发送与通用能力

工具类位于 `ATRI/bot/utils.py`，主要提供与“机器人动作”相关的通用函数。

### 4.1 `BotUtils.get_user_avatar_url()`

```python
@classmethod
def get_user_avatar_url(
    cls, user_id: str, platform: str, appid: str | None = None
) -> str | None:
```

作用：生成 QQ 用户头像 URL。

逻辑：

- 仅在 `platform == "qq"` 时生效
- 若 `user_id` 是纯数字，则走 QQ 头像通用 URL
- 否则走 `q.qlogo.cn` 的 app 模式

这个工具极其适合 UI 展示、提示信息卡片和系统消息里直接对应用户头像。

### 4.2 `BotUtils.get_friend_list()`

```python
async def get_friend_list(cls, bot: Bot) -> list[User]
```

它通过：

```python
raw_friend_list = await bot.get_friend_list()
friend_list = [User.model_validate(f) for f in raw_friend_list]
```

将协议端返回的原始字典列表转换为强类型 `User` 列表，方便后续业务逻辑处理。

### 4.3 `BotUtils.get_group_list()`

```python
async def get_group_list(cls, bot: Bot) -> list[Group]
```

同理，将原始群信息转换为 `Group` 列表。

### 4.4 `BotUtils.send_message()`

这是 bot 模块最重要的通用方法之一。

```python
async def send_message(
    cls,
    bot: Bot,
    service: str,
    message: str | Message,
    user_id: str | None = None,
    group_id: str | None = None,
)
```

它支持两种通道：

- 私聊：`user_id` 不为空
- 群聊：`group_id` 不为空

执行逻辑：

1. 先检查 `GlobalStatus` 是否阻止目标
2. 再检查 `BotStatus.is_blocked()` 是否阻止当前 bot 的此目标
3. 若不阻止，则调用：
   - `bot.send_private_msg(...)`
   - 或 `bot.send_group_msg(...)`
4. 发生异常时，使用 `save_error()` 和 `str_traceback()` 记录错误，并抛出异常
5. 在 `finally` 中无论成功失败都会调用：

```python
manual_add_server_statistic(
    bot=bot,
    service=service,
    call_type="send_message",
    target_id=target_id,
    target_type=target_type,
    track_id=track_id,
)
```

这说明它不仅负责发消息，也负责统计发消息行为，属于“一次动作 + 一次埋点”的封装方式。

### 4.5 `BotUtils.get_command_start()`

```python
def get_command_start(cls) -> str:
    return conf.BotConfig.command_start[0] if conf.BotConfig.command_start else ""
```

它从配置中读取命令前缀，通常用于：

- 构建命令帮助
- 识别命令起始符号
- 生成命令提示文本

---

## 5. 统计系统：消息与服务调用埋点

统计模块位于 `ATRI/bot/statistics`。

### 5.1 `MessageStatistics`

数据库模型：

```python
class MessageStatistics(Model):
    id = fields.BigIntField(pk=True)
    bot_id = fields.CharField(max_length=100, index=True)
    user_id = fields.CharField(max_length=100, index=True)
    group_id = fields.CharField(max_length=100, null=True, index=True)
    message_type = fields.CharField(max_length=20)
    content = fields.TextField()
    created_at = fields.DatetimeField(auto_now_add=True)
```

用途：

- 记录谁发了什么消息
- 记录消息属于群聊还是私聊
- 作为消息层面的使用统计基础表

### 5.2 `ServiceStatistics`

```python
class ServiceStatistics(Model):
    id = fields.BigIntField(pk=True)
    bot_id = fields.CharField(max_length=100, index=True)
    service_id = fields.CharField(max_length=100, index=True)
    call_type = fields.CharField(max_length=20, index=True)
    target_id = fields.CharField(max_length=100, index=True)
    target_type = fields.CharField(max_length=20)
    track_id = fields.CharField(max_length=8, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
```

用途：

- 记录哪个服务被调用了
- 记录调用方式（比如 `send_message`）
- 记录调用目标（用户或群）
- 记录错误追踪 ID，方便排查问题

### 5.3 消息事件自动统计

在 `ATRI/bot/__init__.py` 中注册了：

```python
@event_postprocessor
async def add_message(bot: Bot, event: Event):
```

它会在事件后处理阶段捕获：

- 普通消息事件
- `PokeNotifyEvent`
- 非消息 notice 事件也会过滤掉

并执行：

```python
await MessageStatistics.create(
    bot_id=bot_id,
    user_id=user_id,
    group_id=group_id,
    message_type=message_type,
    content=content,
)
```

这让消息统计不是手工插入，而是天然接入事件后处理链。

### 5.4 服务调用统计

`add_server_statistic()` 和 `manual_add_server_statistic()` 都将记录追加到 `TEMP_LIST`：

```python
TEMP_LIST.append(ServiceStatistics(...))
```

这是一种“批量缓存后写入”的模式：

```python
@heartbeat_1m()
@shutdown()
async def save_temp():
    call_list = TEMP_LIST.copy()
    TEMP_LIST.clear()
    if call_list:
        await ServiceStatistics.bulk_create(call_list)
```

也就是说：

- 每次调用统计先放入内存缓存
- 定时任务或关闭时批量落库
- 降低数据库 IO 压力

这是一个典型的“本地缓存 + 批量落表”的实现方式。

### 5.5 错误统计与回复

在 `run_postprocessor` 中，当事件处理抛出异常时，代码会：

- 识别 `EventRuntimeError`
- `BaseBotException`
- `ActionFailed`
- 普通 `Exception`

然后调用：

```python
track_id = save_error(prompt, error_content)
```

并生成提示消息：

```python
msg = (
    MessageBuilder("呜——出错了...请反馈维护者")
    .text(f"来自: {matcher.module_name}")
    .text(f"信息: {prompt}")
    .text(f"追踪ID: {track_id}")
)
```

这是一种非常实用的框架式错误反馈设计：

- 错误被持久化
- 回调链可追踪
- 用户收到提示并知晓追踪 ID

---

## 6. 使用方式与开发建议

### 6.1 发送消息

```python
from ATRI.bot.utils import BotUtils

async def example_send(bot):
    await BotUtils.send_message(
        bot=bot,
        service="example_service",
        message="你好，这是一条测试消息",
        user_id="12345678",
    )
```

如果通过群聊：

```python
await BotUtils.send_message(
    bot=bot,
    service="group_service",
    message="群消息测试",
    group_id="123456",
)
```

### 6.2 判断是否被拦截

```python
from ATRI.bot.status import BotStatus, GlobalStatus

is_blocked = BotStatus.is_blocked(bot_id="123456", user_id="10001")
if is_blocked:
    print("当前用户在该 bot 下被阻止")

if GlobalStatus.is_blocked(user_id="10001"):
    print("用户在全局范围内被阻止")
```

### 6.3 扩展建议

如果需要新增一个更丰富的机器人状态字段，推荐：

- 在 `Statu` 中增加明确定义的字段
- 保持 JSON 文件格式与 `model_dump()` 兼容
- 增加对应 `is_blocked` 判断逻辑，而不是散落到业务层

如果需要新增统计字段：

- 在对应 `Model` 中定义字段
- 让事件回调或发送方法统一走 `TEMP_LIST` + `bulk_create()` 结构
- 避免在业务逻辑中散乱插库

> 这一模块的设计理念非常明确：把“输入、状态判断、消息发送、事件统计、错误记录”统一封装成稳定接口，从而让业务服务层能更专注于功能本身。

---

## 7. 总结

`ATRI.bot` 模块不是一个简单的工具箱，而是 ATRI 运行时中的关键控制层。它几乎承接了以下能力：

- 用户/群模型的标准化表示
- 实例级与全局级状态控制
- 消息前置阻断与权限拦截
- 通用发送消息方法
- 自动消息与服务调用统计
- 错误追踪与提示上报

因此，对于 ATRI 开发者而言，理解这个模块等于理解了“机器人如何接入事件流、如何处理状态控制，以及如何把功能调用记录下来”。

如果要进一步开发新功能，最好的起点通常是：

1. 看 `ATRI/bot/status.py` 中的状态规则
2. 看 `ATRI/bot/utils.py` 中的发送接口
3. 看 `ATRI/bot/statistics` 中的埋点设计

这样就能快速掌握该框架的运行时惯例。
