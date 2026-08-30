# 规则模块说明

本文档说明 `ATRI.rule` 模块的作用：它用于定义项目中自定义的消息规则，尤其是判断一条消息是否是“@ 机器人”或“直接提及机器人”的事件。

## 模块定位

规则相关代码位于：

- `ATRI/rule.py`

目前该模块内容非常轻量，核心函数只有：

```python
def to_bot() -> Rule:
    ...
```

---

## 1. 设计目的

`ATRI.rule` 负责封装 NoneBot 的 `Rule`，让开发者可以以更语义化的方式表达判断条件，而不是直接硬编码条件判断。

这里的 `to_bot()` 表示：

- 这条消息是否是发送给当前 bot 的
- 通常在群消息中出现“@机器人”或“直接对机器人发消息”时生效

---

## 2. `to_bot()` 实现

```python
from nonebot.rule import Rule
from nonebot.adapters import Bot, Event


def to_bot() -> Rule:
    async def _to_bot(bot: Bot, event: Event) -> bool:
        return event.is_tome()

    return Rule(_to_bot)
```

它做的事情非常直接：

1. 定义一个异步判断函数 `_to_bot`
2. 接收 `bot` 和 `event`
3. 调用 `event.is_tome()`
4. 返回布尔值

如果事件对象表示“这条消息提到/指向机器人”，则返回 `True`，否则返回 `False`。

---

## 3. 与 NoneBot 规则机制的关系

`Rule` 是 NoneBot 事件匹配的核心概念之一。它允许在事件处理前执行条件判断：

- 是否是群消息
- 是否以某个命令前缀开头
- 是否为指定用户发送
- 是否提及机器人

这里的 `to_bot()` 只是其中一种非常简单的规则封装。

---

## 4. 使用方式

在命令或事件处理器中，可以这样使用：

```python
from ATRI.rule import to_bot

@matcher.handle()
@matcher.receive()
async def handle():
    ...
```

或者作为更具体的权限 / 事件规则组合的一部分：

```python
rule = to_bot()
```

如果需要在某个 matcher 上绑定规则，可按 NoneBot 的常规方式与其他规则合并使用。

---

## 5. 开发建议

### 5.1 规则越简单越好

`to_bot()` 这类规则很适合做“事件筛选器”，而不是包含复杂业务逻辑。

### 5.2 规则可以组合

在项目中，通常会把多个规则组合起来：

- `to_bot()`
- 命令前缀规则
- 权限规则
- 文本关键字规则

这样更容易形成清晰的事件链。

---

## 6. 总结

`ATRI.rule` 当前实现非常小，但它体现了项目在事件过滤层的设计思路：

- 把判断逻辑封装成语义化规则函数
- 让事件处理器更容易组合和复用
- 通过 NoneBot 原生 `Rule` 机制与框架自然集成

虽然目前只有一个 `to_bot()`，但它为后续扩展更多规则提供了清晰的入口。

