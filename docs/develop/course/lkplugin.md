# LK 插件实战教程

LK 插件并不是“另一个框架”，它本质上仍然是 ATRI 的一个插件。当前推荐优先使用 `ATRI.system.lkapi` 统一访问 LK 相关能力，而不是直接依赖底层 `ATRI.system.lkbot`。这样可以让代码更稳定，也更符合当前的模块化设计。

也就是说，LK 插件往往更偏“业务型插件”，而不是单纯的命令转发器。

> 重要：开发新插件时，优先使用 `ATRI.system.lkapi`；只有在需要深入底层实现时，才考虑直接访问 `ATRI.system.lkbot`。

本节会用真实代码结构来演示如何开发一个最简单的 LK 插件，并统一使用 `lkapi` 入口。

---

## 1. LK 插件的核心特点

和普通 ATRI 插件相比，LK 插件通常具备以下特点：

- `Service.ServiceType.LKPLUGIN`
- 使用 `ATRI.system.lkbot` 中的数据和工具
- 依赖用户校验规则，如 `IsLkUser`
- 通过 `MessageEvent` 获取当前发消息用户
- 可使用背包、物品、签到、排行等已有能力

典型写法：

```python
from ATRI.service import Service
from ATRI.system import lkapi

plugin = Service(
    "用户",
    "ATRI的综合性用户系统插件",
    "1.0.0",
    Service.ServiceType.LKPLUGIN,
)

# 通过 lkapi 访问用户、物品、商店、消息队列等能力
```

这表示它属于 LK 扩展服务，而不是普通功能型插件。

同时，推荐在业务代码中优先使用：

- `lkapi.bot`
- `lkapi.entity`
- `lkapi.utils`

而不是直接写出很多 `ATRI.system.lkbot.*` 的调用。

---

## 2. 最小的 LK 插件示例

我们从最小 LK 插件开始：

```python
from ATRI.service import Service

plugin = Service(
    "我的LK插件",
    "一个最基础的 LK 插件示例",
    "1.0.0",
    Service.ServiceType.LKPLUGIN,
)

hello = plugin.on_command("lkhello", "测试LK插件")


@hello.handle()
async def _():
    await hello.send("LK 插件已加载")
```

它能工作，但它并没有使用任何 LK 侧能力；真正的 LK 插件通常都会结合用户和道具相关功能。

---

## 3. 真实 LK 插件结构：以用户信息为例

ATRI 自带的 LK 用户插件中有一段非常典型的写法：

```python
from ATRI.service import Service
from ATRI.system import lkapi

plugin = Service("用户", "ATRI的综合性用户系统插件", "1.0.0", Service.ServiceType.LKPLUGIN)

my_info = plugin.on_command(cmd="我的信息", docs="查询自己的信息")


@my_info.handle([lkapi.bot.checker.IsLkUser])
async def _(event):
    user = lkapi.entity.user.get_user_data(event.get_user_id())
    await my_info.finish(
        f"用户：{user.name}\n"
        f"等级：{user.lvl}\n"
        f"ATRI币：{user.money}\n"
        f"好感：{user.love}"
    )
```

这里体现了几个真实用法：

1. `plugin = Service(..., Service.ServiceType.LKPLUGIN)`
2. `plugin.on_command(...)` 注册命令
3. `@my_info.handle([lkapi.bot.checker.IsLkUser])` 表示只有 LK 用户才允许调用
4. `event.get_user_id()` 获取用户编号

这就是一个非常标准的 LK 插件命令处理链路。

---

## 4. `IsLkUser`：LK 插件最常见的检查器

在 `ATRI.system.lkapi.bot.checker` 中，最常见的规则是：

```python
from ATRI.system import lkapi

IsLkUser = lkapi.bot.checker.IsLkUser
```

它的作用是：

- 只有是 LK 用户，才允许继续处理事件
- 否则直接中断当前处理

例如：

```python
@my_info.handle([lkapi.bot.checker.IsLkUser])
async def _(event):
    ...
```

这类写法非常统一，适于用户体系型插件。

---

## 5. 物品查询与使用：更贴近 LK 业务

下面是更贴近真实 LK 业务的示例：

```python
from nonebot.adapters.onebot.v11.event import MessageEvent
from nonebot.params import ArgPlainText, CommandArg
from nonebot.matcher import Matcher

from ATRI.service import Service
from ATRI.system import lkapi

plugin = Service("我的背包", "查看背包和使用物品", "1.0.0", Service.ServiceType.LKPLUGIN)

use_item = plugin.on_command(cmd="使用", docs="使用指定物品")


@use_item.handle([lkapi.bot.checker.IsLkUser])
async def _(matcher: Matcher, event: MessageEvent, args=CommandArg()):
    if args.extract_plain_text():
        matcher.set_arg("use_item_name", args)


@use_item.got("use_item_name", prompt="要使用的物品呢？速速")
async def _(event: MessageEvent, item_name=ArgPlainText("use_item_name")):
    item_name = lkapi.entity.item.items.clean_name(item_name)
    if not lkapi.entity.item.items.has_item(item_name):
        await use_item.finish(f"找不到指定物品 {item_name}")

    msg = f"正在使用 {item_name}"
    await use_item.finish(msg)
```

它说明了 LK 插件的几个关键点：

- 通过事件对象拿到用户 ID
- 通过 `lkapi.entity.item.items` 查询物品
- 通过统一入口规范化输入
- 最终返回文本结果

---

## 6. 一个更完整的 LK 插件例子

下面是一个“我的信息 + 物品查询”组合版：

```python
from nonebot.adapters.onebot.v11.event import MessageEvent
from nonebot.params import CommandArg, ArgPlainText
from nonebot.matcher import Matcher

from ATRI.service import Service
from ATRI.system import lkapi

plugin = Service("LK示例", "LK插件练习", "1.0.0", Service.ServiceType.LKPLUGIN)

my_info = plugin.on_command("我的信息", "查看自己的信息")
query_item = plugin.on_command("查询物品", "查询某个物品")


@my_info.handle([lkapi.bot.checker.IsLkUser])
async def _(event: MessageEvent):
    user = lkapi.entity.user.get_user_data(event.get_user_id())
    await my_info.finish(
        f"用户：{user.name}\n"
        f"等级：{user.lvl}\n"
        f"ATRI币：{user.money}\n"
        f"好感：{user.love}"
    )


@query_item.handle()
async def _(matcher: Matcher, args=CommandArg()):
    if args.extract_plain_text():
        matcher.set_arg("item_name", args)


@query_item.got("item_name", prompt="请输入要查询的物品名")
async def _(item_name=ArgPlainText("item_name")):
    await query_item.finish(f"你要查询的是：{item_name}")
```

这类插件通常能比较自然地落到真实常见需求：

- 查看用户状态
- 查询物品
- 查看背包
- 使用道具
- 商店买卖

---

## 7. LK 插件中常用的模块

开发 LK 插件时，最常用的几个入口是：

- `ATRI.system.lkapi.bot.checker`
- `ATRI.system.lkapi.entity.user`
- `ATRI.system.lkapi.entity.item`
- `ATRI.system.lkapi.entity.shop`
- `ATRI.system.lkapi.utils.audio`
- `ATRI.system.lkapi.utils.picture`
- `ATRI.bot.BotUtils`

其中：

- `IsLkUser`：校验是否是 LK 用户
- `user.get_user_data()`：获取用户数据
- `item.items`：物品集合
- `shop.shops`：商店集合
- `utils.audio` / `utils.picture`：多媒体辅助工具

> 推荐：新插件优先使用 `ATRI.system.lkapi`，不要在业务层大量写 `ATRI.system.lkbot.*` 直接调用。

---

## 8. 开发 LK 插件的实战建议

### 8.1 优先使用现成能力

不要重复造轮子。LK 插件通常应优先使用：

- 用户基础数据
- 物品和商店数据
- 现成的消息和事件处理模式

这样能减少维护成本。

### 8.2 先做“命令 + 用户校验”

最稳妥的开发顺序是：

1. 先定义 `plugin = Service(..., Service.ServiceType.LKPLUGIN)`
2. 再写 `on_command`
3. 再加 `@handle([lkapi.bot.checker.IsLkUser])`
4. 再接 `lkapi.entity` / `lkapi.utils` 等数据
5. 最后把字段整理成文本再 `finish()` 发送

### 8.3 处理输入时尽量标准化

大部分 LK 业务的输入都要做清洗，比如：

```python
item_name = lk_util.clean_str(item_name)
```

这样可以避免输入中出现空格、全角、大小写等差异导致查询失败。

---

## 9. 适合 LK 插件的典型功能

你可以很容易基于 LK 体系做这些功能：

- 查询用户信息
- 查看背包
- 查询物品详情
- 使用道具
- 回收物品
- 商店列表和购买
- 签到、改名、排行榜等

这些功能在项目中都有对应实现，开发者可以直接参考现有插件的写法。

---

## 10. 总结

LK 插件的核心思想不是“另起一套系统”，而是在 ATRI 的基础服务上，直接使用 LK Bot 的用户、背包、商店和道具能力。

一个典型的 LK 插件大概是这样：

```python
from ATRI.service import Service
from ATRI.system import lkapi

plugin = Service("示例LK插件", "示例说明", "1.0.0", Service.ServiceType.LKPLUGIN)

cmd = plugin.on_command("测试", "LK插件命令")


@cmd.handle([lkapi.bot.checker.IsLkUser])
async def _(event):
    await cmd.send("LK 插件工作正常")
```

这是当前推荐的写法：通过 `lkapi` 统一入口访问 LK 能力，代码更规范，也更容易和后续 `ATRI.system` / `agent` 体系兼容。

如果你已经懂了普通插件的 `Service + on_command` 模式，再继续学习 LK 插件，你就能自然地把 ATRI 的用户系统、道具系统和交互能力接进自己的插件中。
