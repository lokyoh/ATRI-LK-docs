# 事件总线模块说明

本文档面向开发者，说明 `ATRI.event` 模块如何在项目中实现事件发布、事件订阅、中间件拦截以及定时心跳/每日更新触发。

## 模块定位

事件相关代码位于：

- `ATRI/event/__init__.py`
- `ATRI/event/data_source.py`
- `ATRI/event/register.py`

它们对外导出：

```python
from ATRI.event import (
    ATRIEventBus,
    AsyncEventBus,
    Event,
    Priority,
    logging_middleware,
    daily_update,
    heartbeat_1m,
    heartbeat_30m,
    shutdown,
    ATRIHeartbeat,
)
```

---

## 1. 设计目标

`ATRI.event` 的核心目标是让不同模块之间以“事件驱动”的方式通信，而不是直接相互调用。这样做的好处是：

- 模块解耦
- 逻辑更清晰
- 便于扩展定时任务与系统级回调
- 能统一管理日志与事件处理异常

在 ATRI 中，事件总线主要用于：

- 每日更新任务
- 心跳事件
- 关闭时回调
- 业务模块之间的通知与状态同步

---

## 2. 事件对象：`Event`

```python
@dataclass
class Event:
    type: str
    data: Any
    event_bus: str
    source: str
    timestamp: datetime = None
```

它表示一次实际的事件消息，包含：

- `type`：事件类型，例如 `heartbeat_1m`、`daily_update`
- `data`：事件(payload) 数据
- `event_bus`：事件总线名
- `source`：事件发布来源
- `timestamp`：事件时间，默认在初始化时自动写入

### 使用方式

```python
await ATRIEventBus.publish("heartbeat_1m", "ATRI", {"count": 1})
```

这会创建一个 `Event` 实例，然后分发给所有订阅该事件类型的处理器。

---

## 3. 事件优先级：`Priority`

```python
class Priority(IntEnum):
    HIGH = 0
    NORMAL = 1
    LOW = 2
```

事件处理器在注册时可以指定优先级，最终按优先级排序执行：

```python
@ATRIEventBus.subscribe("daily_update", priority=Priority.HIGH)
async def on_daily_update(event):
    ...
```

优先级越小，越先执行。通常：

- `HIGH`：关键系统逻辑
- `NORMAL`：默认处理
- `LOW`：次要或后台逻辑

---

## 4. 订阅模型：`Subscription`

```python
@dataclass
class Subscription:
    handler: Callable
    priority: Priority = Priority.NORMAL
    once: bool = False
```

它表示一个事件处理器订阅项：

- `handler`：回调函数
- `priority`：优先级
- `once`：是否仅执行一次

如果 `once=True`，事件被处理一次后会从订阅列表中移除。

---

## 5. 异步事件总线：`AsyncEventBus`

`AsyncEventBus` 是整个模块的核心类，实现了：

- 订阅事件
- 取消订阅
- 添加中间件
- 发布事件
- 处理同步/异步函数

### 5.1 订阅装饰器

```python
def subscribe(
    self, event_type: str, priority: Priority = Priority.NORMAL, once: bool = False
):
```

用法：

```python
@ATRIEventBus.subscribe("example_event")
async def on_example(event):
    print(event.data)
```

该方法会把处理器挂载到 `self._handlers[event_type]` 中，并按优先级排序。

### 5.2 中间件

```python
self._middlewares = []

def use(self, middleware):
    self._middlewares.append(middleware)
```

中间件会在事件真正分发前执行，通常用于：

- 日志记录
- 事件过滤
- 参数校验
- 安全检查

例如：

```python
async def logging_middleware(event: Event) -> Event:
    log.debug(f"{event.event_bus} 从 {event.source} 发布事件: {event.type}")
    return event
```

如果中间件返回 `None`，则整个事件发布流程会中断，不再继续执行处理器。

### 5.3 发布事件

```python
async def publish(self, event_type: str, source: str, data: Any = None) -> List[Any]:
    event = Event(type=event_type, data=data, event_bus=self._name, source=source)
    event = await self._apply_middlewares(event)
    if event is None:
        return []
```

发布时会：

1. 构造 `Event`
2. 执行中间件
3. 获取订阅的处理器列表
4. 根据处理器是否为异步/同步函数执行
5. 捕获异常并记录日志

### 5.4 同步发布

```python
def publish_sync(self, event_type: str, data: Any = None, source: str = "unidentified") -> List[Any]:
```

这适合不需要异步上下文的场景，但在项目里，异步 `publish()` 更常见。

---

## 6. 默认事件总线：`ATRIEventBus`

```python
ATRIEventBus: AsyncEventBus = AsyncEventBus("ATRIEventBus")
ATRIEventBus.use(aeb_logging_middleware)
```

这是系统默认事件总线，名字是 `ATRIEventBus`，默认挂载了 `aeb_logging_middleware`，它会忽略部分高频心跳日志，避免日志噪音过大。

```python
async def aeb_logging_middleware(event: Event) -> Event:
    if event.type == "heartbeat_1m" or event.type == "heartbeat_30m":
        return event
    log.debug(f"{event.event_bus} 从 {event.source} 发布事件: {event.type}")
    return event
```

这是一种典型的“过滤高频事件”的中间件处理。

---

## 7. 内置事件装饰器

### 7.1 `daily_update()`

```python
def daily_update(priority: Priority = Priority.NORMAL, once: bool = False):
    def decorator(func: Callable) -> Callable:
        ATRIEventBus.subscribe("daily_update", priority=priority, once=once)(func)
        return func
    return decorator
```

它用于注册每日更新事件，典型的处理函数是：

```python
@daily_update()
def clean_temp_files():
    ...
```

这里的 `clean_temp_files()` 会删除缓存目录下超过 24 小时的临时文件，并输出删除数量日志。

### 7.2 `heartbeat_1m()`

```python
def heartbeat_1m(priority: Priority = Priority.NORMAL, once: bool = False):
```

用于每分钟触发一次的心跳事件。适合：

- 维持状态检查
- 检测在线服务状态
- 验证周期性任务

### 7.3 `heartbeat_30m()`

用于每 30 分钟触发一次的聚合型心跳事件。

### 7.4 `shutdown()`

```python
def shutdown(priority: Priority = Priority.NORMAL, once: bool = False):
```

用于在程序关闭前触发清理动作，例如回收资源、保存状态等。

---

## 8. 心跳与调度注册：`ATRIHeartbeat`

`register.py` 中定义了 `ATRIHeartbeat` 和 `register_triggers()`：

```python
class ATRIHeartbeat:
    heartbeat_count = 0

    @classmethod
    async def heartbeat(cls):
        await ATRIEventBus.publish("heartbeat_1m", "ATRI")
        cls.heartbeat_count += 1
        if cls.heartbeat_count == 30:
            await ATRIEventBus.publish("heartbeat_30m", "ATRI")
            cls.heartbeat_count = 0
```

这意味着：

- 每分钟发布一次 `heartbeat_1m`
- 累计 30 次后发布一次 `heartbeat_30m`

### `register_triggers()`

```python
def register_triggers():
    ATRIScheduler.add_job(daily_update, "daily_update", "cron", hour=0, minute=0)
    ATRIScheduler.add_job(
        ATRIHeartbeat.heartbeat,
        "heartbeat",
        "interval",
        minutes=1,
        max_instances=1,
        coalesce=True,
        use_log=False,
    )
```

它注册了：

- 每日 00:00 触发 `daily_update`
- 每 1 分钟触发一次心跳任务

这说明事件总线与计划任务调度器是配合使用的：

- 调度器负责“时间到达”
- 事件总线负责“分发给所有订阅者”

---

## 9. 程序关闭事件

```python
@driver().on_shutdown
async def shutdown():
    await ATRIEventBus.publish("shutdown", "ATRI")
```

这里通过驱动的 `on_shutdown` 生命周期钩子，在退出前发布 `shutdown` 事件，允许其他模块在应用关闭前执行清理逻辑。

例如：

```python
@shutdown()
async def clean_resources(event):
    ...
```

这样可以避免直接写死到启动代码里，保持模块边界清晰。

---

## 10. 处理器的兼容性

`AsyncEventBus.publish()` 对处理器做了兼容处理：

- 如果处理器是 `async def`，则 `await` 执行
- 如果处理器是普通 `def`，则直接调用
- 如果处理器要求参数，则传入 `event` 对象
- 如果处理器无参数，则直接调用无参数版本

这使得事件处理函数能写成多种风格：

```python
@ATRIEventBus.subscribe("demo")
async def h1(event):
    ...

@ATRIEventBus.subscribe("demo")
def h2():
    ...
```

从而降低接入门槛。

---

## 11. 异常处理策略

在事件分发时，如果某个处理器抛异常：

```python
except Exception as e:
    log.error(
        f"{self._name} 来自 {source} 类型为 {event_type} 的事件处理器 {subscription.handler.__name__} 出错: {str_traceback(e)}"
    )
    results.append(e)
```

这有两个好处：

- 不会让整个事件总线因一个处理器异常而崩掉
- 事件处理错误会被详细记录到日志中

这是一种非常稳健的事件总线实现方式。

---

## 12. 实际开发建议

### 12.1 事件命名

建议将事件类型命名为清晰、稳定的语义：

- `heartbeat_1m`
- `daily_update`
- `shutdown`
- `user_login`
- `group_message`

不要使用过于模糊的名字。

### 12.2 处理器职责单一

一个订阅处理器尽量只做一件事，例如：

- 刷新缓存
- 更新状态
- 清理资源
- 写入统计

这样更容易维护和测试。

### 12.3 适度使用中间件

中间件适合放：

- 日志
- 监控
- 过滤
- 权限校验

不建议在中间件中塞大量业务逻辑，否则事件总线会变得难以理解。

---

## 13. 总结

`ATRI.event` 提供了一个轻量但实用的事件总线解决方案，适合基于插件与调度器结构的机器人系统。它整合了：

- 事件对象定义
- 事件订阅与取消
- 事件优先级机制
- 异步/同步处理兼容
- 中间件扩展
- 周期任务与系统生命周期事件

这使其既可以负责系统级事件，也可以作为模块间通信桥梁，适合 ATRI 的扩展式架构。

如果后续需要开发更复杂功能，可在此基础上扩展：

- 事件持久化队列
- 复杂事件 payload schema
- 分布式事件总线
- 事件追踪与链路监控

但对当前项目而言，这一实现已经足够稳健且易用。

