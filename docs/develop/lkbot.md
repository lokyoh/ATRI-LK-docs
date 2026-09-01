# LKBot / LKAPI 模块说明

`ATRI.system.lkapi` 是 ATRI 中对 LK Bot 相关能力的对外封装层。它并不负责实现核心业务逻辑，而是把底层的 LK Bot 运行时能力统一导出，方便其他模块或插件按稳定接口访问。

## 1. 模块定位

入口路径：

- `ATRI/system/lkapi`

其核心导出方式是：

```python
from ATRI.system import lkapi
```

或：

```python
from ATRI.system.lkapi import bot, entity, utils, API_VERSION
```

当前包的简单结构为：

- `__init__.py`：顶层导出
- `bot/`：机器人辅助配置、检查器、消息队列等
- `entity/`：用户、道具、商店等数据对象
- `utils/`：音频、图片等辅助能力

---

## 2. 顶层导出

`ATRI/system/lkapi/__init__.py` 中的主要内容为：

```python
from . import bot
from . import entity
from . import utils

API_VERSION = 1
```

这里的含义非常直接：

- `bot`：提供 bot 相关辅助能力
- `entity`：提供用户/道具/商店等结构化数据
- `utils`：提供图片与音频等工具
- `API_VERSION`：当前接口版本号

---

## 3. bot 模块

`bot` 模块位于：

- `ATRI/system/lkapi/bot`

它导出的能力包括：

- `checker`
- `config`
- `events`
- `setting`
- `message_queue`

### 3.1 `checker`

实际导出的是 LK Bot 中的检查器：

```python
from ATRI.system.lkbot.checker import (
    is_lk_user,
    not_safe_mode,
    is_test_mode,
    is_chat_switch_on,
    IsLkUser,
    NotSafeMode,
    IsTestMode,
    IsChatSwitchOn,
)
```

作用：用于鉴定当前用户/状态是否处于 LK Bot 的允许范围内，适合做：

- 用户校验
- 安全模式判断
- 测试模式判断
- 聊天开关判断

### 3.2 `config`

```python
from ATRI.system.lkbot.config import (
    config as configs,
    load_config,
    save_config,
)
```

用于访问和保存 LK Bot 的配置对象；对业务层来说，通常直接拿到 `configs`，然后读取配置信息或更新配置项。

### 3.3 `message_queue`

这是 `lkapi.bot` 中最实用的能力之一，位于：

- `ATRI/system/lkapi/bot/message_queue.py`

核心类：

- `MessageQueueObject`
- `MessageQueue`
- `msg_queue`

#### `MessageQueueObject`

```python
class MessageQueueObject:
    def __init__(self, message, target_user_id, description, source_plugin=None):
        self.msg = message
        self.uid = str(target_user_id)
        self.dec = description
        self.spg = source_plugin
```

它表示一条待发送消息，包含：

- 消息内容：`msg`
- 目标用户：`uid`
- 说明：`dec`
- 来源插件：`spg`

#### `MessageQueue`

它维护一个按用户分组的消息列表：

```python
self.messages: dict[str, list[MessageQueueObject]] = {}
```

主要方法：

- `add_msg()`：添加消息，避免重复插入
- `get_msg()`：按用户获取消息列表
- `has_msg()`：判定某用户是否已有指定消息
- `remove_msg()`：删除单条消息
- `remove_msgs()`：删除该用户的全部待处理消息
- `check_user()`：在用户下一次消息时把待发消息发送出去

#### `msg_queue`

```python
msg_queue = MessageQueue()
```

这是一个全局实例，通常用于在其它逻辑中暂存“用户下一次聊天时发送的提醒、通知或回执”。

### 3.4 `events` / `setting`

`bot` 还会导出事件与设置相关内容，例如：

- `events`：事件类型、监听器、用户名变更事件等
- `setting`：全局参数设置入口

这些能力通常用于对接底层 LK Bot 的事件流与运行时参数，但不一定是开发新功能时的第一入口。

---

## 4. entity 模块

`entity` 模块位于：

- `ATRI/system/lkapi/entity`

它主要负责对外暴露用户、道具、商店等实体对象，桥接底层 `ATRI.system.lkbot.data.*` 的数据层。

### 4.1 `user`

```python
from ATRI.system.lkbot.data.user import users as user_manager, UserData, BackPack, UserNameChangedEvent
```

导出的接口：

```python
def get_user_data(user_id: str | int) -> UserData:
    return user_manager.get_user_data(user_id)


def sign(user: str | UserData) -> tuple[bool, list]:
    if type(user) is UserData:
        return user_manager.sign_func(user)
    return user_manager.sign(str(user))
```

它的作用是：

- 获取用户对象
- 直接对用户执行签到逻辑
- 对外暴露统一的 `sign()` 与 `get_user_data()` 接口

### 4.2 `item`

`item.py` 会把底层的道具数据结构统一导出，主要包括：

- `items`
- `Item`
- `Meta`
- `Stack`
- `ItemType`
- `ItemMeta`
- `ItemStack`
- `ToolItemMeta`
- `ToolItemStack`
- `item_funcs`
- `ItemUsingFunc`
- `ItemFuncs`
- `load_item_data`
- `dict_to_item`
- `load_items`
- `dict_to_funcs`

它本质上是对 LK Bot 道具系统的兼容层，用于让外部代码按统一入口访问物品定义和物品使用逻辑。

### 4.3 `shop`

`shop.py` 对商店结构做了导出：

- `shops`
- `Shop`
- `load_shops`
- `dict_to_shop`

适合做商品配置读取和商店数据访问。

---

## 5. utils 模块

`utils` 模块位于：

- `ATRI/system/lkapi/utils`

当前主要包括：

- `audio`
- `picture`

### 5.1 `audio`

```python
from ATRI.system.lkbot.tools.rec_editor import RECEditor as AudioEditor
```

提供两个函数：

```python
def get_tts_audio(text: str) -> str:
    return AudioEditor.get_tts_file(text)


def audio_path_to_base64(audio_path: str) -> str:
    return AudioEditor.audio_to_base64(audio_path)
```

它的职责是：

- 把文本转换为语音文件
- 把音频文件转换为 Base64

这类能力通常用于富文本消息、语音发送和多媒体输出。

### 5.2 `picture`

```python
from ATRI.system.lkbot.tools.get_pic import (
    get_pic_from,
    lolicon as from_lolicon,
    lolicon_r18 as from_lolicon_r18,
    loli as from_loli,
    local_image as from_local_image,
    has_source,
)
```

它对外统一导出：

- `get_pic_from()`
- `from_lolicon()`
- `from_lolicon_r18()`
- `from_loli()`
- `from_local_image()`
- `has_source()`

用于图片资源获取、图片来源判断和本地图库读取。

---

## 6. 使用方式

### 6.1 读取配置

```python
from ATRI.system import lkapi

print(lkapi.bot.configs)
```

### 6.2 获取用户并签到

```python
from ATRI.system import lkapi

user = lkapi.entity.user.get_user_data(123456)
result = lkapi.entity.user.sign(user)
```

### 6.3 发送待处理消息

```python
from ATRI.system import lkapi
from ATRI.system.lkapi.bot.message_queue import MessageQueueObject

msg = MessageQueueObject(
    message="你好",
    target_user_id=123456,
    description="提醒",
    source_plugin="example",
)

lkapi.bot.message_queue.msg_queue.add_msg(msg)
```

### 6.4 生成语音

```python
from ATRI.system import lkapi

audio_path = lkapi.utils.audio.get_tts_audio("你好，ATRI")
```

---

## 7. 兼容性说明

当前 `lkapi` 更像是一个兼容层，而不是独立业务系统的完整实现。它的价值在于：

- 对外提供稳定入口
- 把底层 LK Bot 数据与工具统一导出
- 保持插件层调用方式尽量一致

---

## 8. 总结

`ATRI.system.lkapi` 主要承担的是“统一访问层”的职责：

- `bot`：机器人状态、检查器、消息队列、配置访问
- `entity`：用户/道具/商店等数据实体封装
- `utils`：图片/音频相关辅助工具

对开发者来说，最值得优先阅读和使用的是：

1. `ATRI/system/lkapi/entity/user.py`
2. `ATRI/system/lkapi/entity/item.py`

这样可以快速建立对 LK Bot 运行时能力的理解。