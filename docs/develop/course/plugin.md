# 基础插件实战教程

本节面向的是“最小可用的 ATRI 插件开发”，重点展示如何基于 `Service` 和 `on_command` 快速实现一个可被 ATRI 识别、可注册、可响应命令的插件。

> 适用对象：刚接触 ATRI / NoneBot 的开发者，想快速写出一个真正运行的插件。

---

## 1. 先看最小示例

在项目中，最简单的插件示例就是：

```python
from ATRI.service import Service

plugin = Service(
    "HelloWorld",
    "一个ATRI-LK插件示例模板。",
    "1.0.0",
    Service.ServiceType.OTHER,
    "l_o_o_k",
)

hello = plugin.on_command("hello", "helloworld")


@hello.handle()
async def _():
    await hello.send("World!")
```

这段代码做了几件事：

1. `Service(...)` 注册一个服务
2. `plugin.on_command(...)` 创建一个命令匹配器
3. `@hello.handle()` 注册处理函数
4. `hello.send(...)` 回复消息

它对应的插件功能非常简单：发送 `hello` 时，机器人返回 `World!`。

这个示例可以直接作为新插件的起始模板。

---

## 2. 插件文件结构

ATRI 允许插件是单文件模块，也允许是包形式。常见方式如下：

```text
plugins/
├── my_plugin.py
└── my_plugin_pack/
    ├── __init__.py
    └── some_helper.py
```

最常见的写法是：

- 直接写一个 `xxx.py`
- 或者写一个包目录 `xxx/__init__.py`

ATRI 在加载插件时会扫描并识别 `Service` 实例，所以只要插件中有合法注册即可。

---

## 3. 基础插件模板

下面是一份可直接复用的最小模板：

```python
from ATRI.service import Service

plugin = Service(
    "示例插件",
    "这是一个示例插件",
    "1.0.0",
    Service.ServiceType.OTHER,
    "你的名字",
)

cmd = plugin.on_command("你好", "问候命令")


@cmd.handle()
async def _():
    await cmd.send("你好，ATRI！")
```

说明：

- `Service` 的第一个参数是服务名，必须唯一
- `document()` 可以继续写说明文本
- `set_type()` 或 `Service.ServiceType.*` 可以定义服务分类
- `on_command()` 会创建命令对象，后续用 `handle` 注册业务逻辑

---

## 4. 使用 `Service` 进行注册

在 ATRI 中，所有插件都是先注册一个 `Service`，然后再绑定命令。核心 API 如下：

```python
from ATRI.service import Service

plugin = Service("服务名", "服务介绍", "1.0.0", Service.ServiceType.FUNCTION)
```

常用链式调用：

```python
plugin = (
    Service("服务名", "服务介绍", "1.0.0", Service.ServiceType.FUNCTION)
    .document("更新后的介绍")
    .version("1.1.0")
    .author("开发者")
    .allow_switch(True)
)
```

其中常用方法包括：

- `document(...)`：设置服务说明
- `version(...)`：设置版本号
- `set_type(...)`：设置服务类型
- `author(...)`：设置作者
- `allow_switch(...)`：允许是否可切换启用状态
- `permission(...)`：设置权限
- `rule(...)`：绑定规则

---

## 5. 命令注册：`on_command`

ATRI 的命令注册本质上是依附在 `Service` 实例上的 matcher。

```python
hello = plugin.on_command("hello", "helloworld")
```

这里的两个参数含义：

- 第一个参数：命令文本
- 第二个参数：命令说明

例如：

```python
weather = plugin.on_command("天气", "查询天气")
```

常见写法也可带 `aliases`、`permission`、`rule` 等参数，实际用法如下：

```python
from ATRI.permission import ADMIN

admin_cmd = plugin.on_command(
    cmd="重启",
    docs="管理员重启机器人",
    permission=ADMIN,
)
```

---

## 6. 处理函数：`handle()` 和 `got()`

### 6.1 简单回复

```python
@hello.handle()
async def _():
    await hello.send("World!")
```

### 6.2 获取参数

```python
from nonebot.params import CommandArg
from nonebot.adapters.onebot.v11 import Message

say = plugin.on_command("echo", "回显")


@say.handle()
async def _(args: Message = CommandArg()):
    text = args.extract_plain_text()
    await say.finish(f"你说的是：{text}")
```

### 6.3 交互式提问

```python
from nonebot.params import ArgPlainText

ask_name = plugin.on_command("设置昵称", "设置你的昵称")


@ask_name.handle()
async def _():
    pass


@ask_name.got("nickname", prompt="请输入你的昵称")
async def _(nickname: str = ArgPlainText("nickname")):
    await ask_name.finish(f"昵称已设置为：{nickname}")
```

`got()` 适合做“先收参数，再处理”的交互式命令。

---

## 7. 比较完整的例子：随机回复

下面这个例子更接近真实业务：

```python
from random import choice

from ATRI.service import Service

plugin = Service("随机笑话", "随机发一句笑话", "1.0.0", Service.ServiceType.FUNCTION)

joke = plugin.on_command("笑话", "随机输出一句笑话")


@joke.handle()
async def _():
    jokes = [
        "我今天没喝水，真的只是没喝水。",
        "我正在修复我的生活状态。",
        "程序员最喜欢的运动：修复 bug。",
    ]
    await joke.finish(choice(jokes))
```

这个插件的特点：

- 只依赖 `Service`
- 不需要额外的框架复杂结构
- 适合做小功能命令

---

## 8. 插件中的权限控制

ATRI 支持权限封装，典型代码：

```python
from ATRI.permission import ADMIN, MASTER

admin_cmd = plugin.on_command("禁言", "管理员禁言", permission=ADMIN)
master_cmd = plugin.on_command("重启", "重启机器人", permission=MASTER)
```

如果你想让命令只在某些条件下生效，可以配合 `rule()` 或自定义 rule 使用。

---

## 9. 真实开发建议

### 9.1 建议保持单一职责

一个插件最好只承担一类功能，例如：

- 计算类
- 查询类
- 娱乐类
- 管理类

不要把无关逻辑堆进同一个插件。

### 9.2 代码结构建议

```text
plugins/
└── mytool/
    ├── __init__.py
    ├── config.py
    ├── utils.py
    └── handlers.py
```

如果插件逻辑较多，可以拆成多个模块，但入口文件中仍然要保留：

```python
plugin = Service(...)
```

### 9.3 先写最小可运行版

开发插件时，推荐顺序：

1. 先注册 `Service`
2. 再写 `on_command`
3. 再加最简单的 `handle`
4. 最后再补参数解析和业务逻辑

这样最不容易踩坑。

---

## 10. 总结

ATRI 的基础插件本质上就是：

```python
from ATRI.service import Service

plugin = Service("插件名", "插件介绍", "版本", Service.ServiceType.OTHER)
cmd = plugin.on_command("命令", "说明")

@cmd.handle()
async def _():
    await cmd.send("回复内容")
```

只要遵循这个模式，就能开发出可被 ATRI 识别并运行的插件。

如果你已经掌握了这个基础模式，下一步就是进入 LK 插件开发，使用 `ATRI.system.lkbot` 提供的用户系统、背包、道具、商店和消息队列等能力。
