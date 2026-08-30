# 调度器模块说明

本文档面向开发者，说明 `ATRI.scheduler` 模块如何基于 APScheduler 提供计划任务注册、服务级任务控制和统一日志包装。

## 模块定位

调度相关代码位于：

- `ATRI/scheduler/__init__.py`
- `ATRI/scheduler/data_source.py`

对外导出：

```python
from ATRI.scheduler import (
    SchedulerJob,
    SchedulerController,
    ATRIScheduler,
    scheduler,
)
```

---

## 1. 总体设计

这个模块的核心目标是把 APScheduler 封装成项目内的统一调度器：

- 支持异步任务和同步任务
- 按“服务名”分组管理任务
- 自动包装日志输出
- 统一捕获任务异常
- 给服务对象提供 `SchedulerController`

这样一来，插件和系统组件不需要直接手写调度器细节，而是统一使用 `SchedulerController` 进行任务管理。

---

## 2. 调度器实例：`scheduler`

```python
scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")
```

它是 APScheduler 的异步调度器，时区固定为：

```text
Asia/Shanghai
```

这个时区选择对中国用户尤其关键，因为项目中很多任务（例如每日更新、定时清理）都与本地时间强相关。

另外还对 APScheduler 的 logger 进行了收敛：

```python
aps_logger = logging.getLogger("apscheduler")
aps_logger.setLevel(30)
aps_logger.handlers.clear()
aps_logger.addHandler(LoguruHandler())
```

这样可以让 APScheduler 的日志输出与项目整体日志风格更一致。

---

## 3. `SchedulerJob`

```python
class SchedulerJob:
    def __init__(self, func, id: str, trigger: str | BaseTrigger = "date", **kwargs):
        self.id = id
        self.job: Job = scheduler.add_job(
            func=func, trigger=trigger, id=id, name=id, **kwargs
        )
```

这个类是“任务对象”的抽象，它包装了 APScheduler 的 `Job`。

### 3.1 常用方法

```python
def status(self):
    if hasattr(self.job, "next_run_time"):
        status = (
            "next run at: "
            + self.job.next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z")
            if self.job.next_run_time
            else "paused"
        )
    else:
        status = "pending"
    return status
```

它可以返回任务状态，例如：

- 下次执行时间
- `paused`
- `pending`

```python
def pause(self):
    self.job.pause()


def resume(self):
    self.job.resume()
```

用于临时暂停或恢复任务。

---

## 4. `SchedulerController`

```python
class SchedulerController:
    service_schedulers: Dict[str, Dict[str, SchedulerJob]] = {}
```

它是一种“按服务分组”的调度器控制器。以服务名作为 key，把属于某个服务的任务放在一起：

```python
self.service_schedulers[service] = {}
```

### 4.1 `add_job()`

```python
def add_job(
    self,
    func,
    name: str,
    trigger: str | BaseTrigger = "date",
    args: list | None = None,
    kwargs: dict | None = None,
    use_log: bool = True,
    **job_kwargs,
) -> SchedulerJob:
```

它对 APScheduler 的 `add_job` 做了一层封装：

- 任务名唯一校验
- `args` / `kwargs` 统一处理
- 自动包装无日志的任务执行器
- 对异常统一记录日志

### 4.2 任务包装器

```python
def job_func(f):
    if inspect.iscoroutinefunction(f):
        async def wrapper(*args, **kwargs):
            try:
                if use_log:
                    log.debug(f"开始执行`{self.service}`的任务`{name}`")
                await f(*args, **kwargs)
                if use_log:
                    log.debug(f"`{self.service}`的任务`{name}`执行完毕")
            except Exception as e:
                log.error(
                    f"在执行`{self.service}`的任务`{name}`时失败:\n{str_traceback(e)}"
                )
```

它的作用是：

- 对异步任务做包装
- 同步任务通过 `asyncio.to_thread` 执行，避免阻塞事件循环
- 无论成功或失败都输出统一日志
- 错误会自动调用 `str_traceback(e)` 进行简化堆栈输出

这使任务执行更稳、一致性更强。

### 4.3 对重复任务的保护

```python
if name in self.service_schedulers[self.service]:
    raise BotRuntimeError(
        f"创建服务`{self.service}`的任务`{name}`失败：该任务名称已存在"
    )
```

这里不允许同名任务重复注册，避免任务冲突。

---

## 5. `ATRIScheduler`

```python
ATRIScheduler: SchedulerController = SchedulerController(service="ATRI")
```

这是项目全局的系统调度控制器，主要用于：

- 系统级定时任务
- 心跳任务
- 每日清理任务
- 周期调度

例如在 `ATRI.event.register` 中：

```python
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

这说明项目中的系统级计划任务统一归档到 `ATRIScheduler`。

---

## 6. 服务级任务管理

```python
def get_job(self, name) -> SchedulerJob:
    if not self.has_job(name):
        raise BotRuntimeError(f"找不到服务`{self.service}`的任务`{name}`")
    return self.service_schedulers[self.service][name]
```

```python
def remove_job(self, name):
    if not self.has_job(name):
        raise BotRuntimeError(f"找不到服务`{self.service}`的任务`{name}`")
    self.get_job(name).job.remove()
    del self.service_schedulers[self.service][name]
```

这意味着：

- 每个服务可拥有独立任务集合
- 任务可以按名称查询和删除
- 对于非法操作，抛 `BotRuntimeError`，而不是静默失败

---

## 7. 任务异常处理

任务内部统一捕获错误：

```python
except Exception as e:
    log.error(
        f"在执行`{self.service}`的任务`{name}`时失败:\n{str_traceback(e)}"
    )
```

它的好处是：

- 不让定时任务直接崩掉整个调度器
- 保留简洁 traceback 以便排查问题
- 任务失败不会中断后续调度执行

---

## 8. 开发者使用方式

### 8.1 注册一个每天任务

```python
from ATRI.scheduler import ATRIScheduler

async def cleanup():
    ...

ATRIScheduler.add_job(cleanup, "cleanup", "cron", hour=2, minute=0)
```

### 8.2 注册一个定时心跳任务

```python
ATRIScheduler.add_job(
    heartbeat,
    "heartbeat",
    "interval",
    minutes=5,
    max_instances=1,
    coalesce=True,
)
```

### 8.3 暂停 / 恢复任务

```python
job = ATRIScheduler.get_job("cleanup")
job.pause()
job.resume()
```

---

## 9. 开发建议

### 9.1 任务名需要唯一

尽量保证任务名唯一，否则 `SchedulerController.add_job()` 会直接报错。

### 9.2 异步任务优先

如果任务本身是 I/O 绑定型，优先写成 `async def`，这样更符合项目整体异步架构。

### 9.3 合理使用 `use_log`

`use_log=False` 适合：

- 高频心跳
- 低价值轮询任务

否则大规模任务可能产生大量日志噪音。

---

## 10. 总结

`ATRI.scheduler` 是一层非常实用的 APScheduler 封装，突出特点是：

- 按服务分组管理任务
- 对异步和同步任务统一包装
- 自动记录日志和异常
- 能在任务层面做到稳定运行

对 ATRI 这种插件型项目而言，这样的调度器层非常重要，因为它把复杂的时间控制能力抽象成了标准接口，开发者不需要重复实现“调度 + 日志 + 错误处理”的模板代码。

