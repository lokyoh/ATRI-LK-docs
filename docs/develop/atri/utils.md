# utils 模块

`ATRI.utils` 是 ATRI 项目的通用工具层，作用是为其他模块提供低耦合、可复用的基础能力。它不负责业务流程本身，而是为插件、事件、调度、适配器、监控和本地存储等模块提供公共设施：

- 文件读写与 JSON 处理
- 时间与时区处理
- 防重放 / 限流与线程安全保护
- 图片编辑与图像消息生成
- HTTP 请求和 Python 包管理
- SQLite 轻量存储
- 事件订阅与通知机制
- 平台、CPU、内存、磁盘、网络状态监控
- GitHub 版本与更新检查
- 日志与配置相关的辅助封装

从设计来看，这个模块属于“框架底座”，本质上是把常见工程能力抽离出来，减少各业务模块重复实现的风险。

## 模块位置

- 代码目录：`ATRI/utils`
- 关键文件：
  - `ATRI/utils/__init__.py`
  - `ATRI/utils/datetime.py`
  - `ATRI/utils/event.py`
  - `ATRI/utils/curve.py`
  - `ATRI/utils/model.py`
  - `ATRI/utils/limiter.py`
  - `ATRI/utils/lock.py`
  - `ATRI/utils/img_editor.py`
  - `ATRI/utils/machine.py`
  - `ATRI/utils/package_manager.py`
  - `ATRI/utils/request.py`
  - `ATRI/utils/sqlite.py`
  - `ATRI/utils/check_update.py`

---

## 1. 总体设计

`ATRI.utils` 采用“工具类 + 函数 + 数据模型 + 事件机制”混合组织方式，核心特点有：

1. 强调“最小依赖”：多数工具直接依赖标准库或稳定的第三方库，例如 `httpx`、`psutil`、`Pillow`。
2. 面向运行时使用：大量工具用于消息发送、任务调度、状态展示、缓存和日志处理。
3. 面向直接调用：缺少过重的抽象层，通常适合插件在运行时直接接入。
4. 兼顾开发效率和稳定性：例如 `RequestClient`、`FileDealer`、`PackageManager`、`BaseEvent` 等都属于实用型公共能力。
5. 兼容新版本 Python：如 `datetime.py` 使用 `ZoneInfo`，`model.py` 使用 Pydantic v2 的 `model_validate` / `model_dump()`。

这使得它非常适合上层模块继续调用，而不是优先设计成一个复杂工程框架。

---

## 2. 通用工具函数

### 2.1 `gen_random_str(k: int)`

```python
def gen_random_str(k: int) -> str:
    return str().join(sample(string.ascii_letters + string.digits, k))
```

作用：随机生成长度为 `k` 的字符串。

常见用途：

- 生成随机文件名
- 临时标识符
- 任务 ID / 会话 ID
- 验证码或占位标识

它使用 Python 的 `string.ascii_letters + string.digits` 作为字符池，再以随机采样生成结果。

---

## 3. 时间处理：`TimeDealer` 与 `ATRI.utils.datetime`

项目中时间工具并不只在 `__init__.py` 中，一共有两层：

- `TimeDealer`：按时间戳进行格式化和转换
- `ATRI.utils.datetime`：以统一时区管理为核心的函数模块

### 3.1 `TimeDealer`

```python
class TimeDealer:
    def __init__(self, timestamp: float, timezone):
        self.timestamp = timestamp
        self.timezone = timezone
```

`TimeDealer` 的职责是把 Unix 时间戳转换为可读文本或 `datetime` 对象：

```python
def to_str(self, format: str = "%Y-%m-%d %H:%M:%S") -> str:
    return datetime.fromtimestamp(self.timestamp, self.timezone).strftime(format)


def to_datetime(self) -> datetime:
    return datetime.fromtimestamp(self.timestamp, self.timezone)


def int_now(self) -> float:
    time = datetime.fromtimestamp(self.timestamp, self.timezone)
    return time.hour + time.minute / 60
```

其中 `int_now()` 会把时间转换成一天中的浮点时段，例如 `09:30 -> 9.5`，适合做“时间段判断”。

### 3.2 `ATRI.utils.datetime`

`datetime.py` 是较新的统一时区模块，允许项目在运行时切换时区，而不是直接硬编码：

```python
TIMEZONE = ZoneInfo("Asia/Shanghai")

def set_timezone(tz_name: str):
    global TIMEZONE
    try:
        TIMEZONE = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        TIMEZONE = ZoneInfo("Asia/Shanghai")
```

它提供以下函数：

- `now(tz_name=None)`：返回当前时间
- `today(tz_name=None)`：返回当前日期
- `fromtimestamp(fromtimestamp, tz_name=None)`：按时间戳生成 `datetime`
- `date_fromtimestamp(timestamp, tz_name=None)`：按时间戳生成 `date`
- `now_timestamp(tz_name=None)`：返回当前时间戳
- `now_time(tz_name=None)`：返回当前时刻

这个模块的意义在于：不同业务层和配置项可以共享统一时区，不需要反复手写 `timezone.utc` 或 `pytz` 逻辑。

---

## 4. 列表处理：`ListDealer`

```python
class ListDealer:
    def __init__(self, lst: list, aim):
        self.lst = lst
        self.aim = aim
```

### 4.1 `count()`

```python
def count(self) -> int:
    count = 0
    for ele in self.lst:
        if ele == self.aim:
            count = count + 1
    return count
```

用于统计某个值在列表中出现了多少次。

### 4.2 `del_aim()`

```python
def del_aim(self) -> list:
    while self.aim in self.lst:
        self.lst.remove(self.aim)
    return self.lst
```

这个方法会删除列表中所有匹配的目标元素，并返回处理后的列表。适合“清洗数据”“去重”“统一过滤”等操作。

---

## 5. 消息内容检查：`MessageChecker`

```python
class MessageChecker:
    tenc_gchat_url: str = "gchat.qpic.cn"
    may_inject_keys: list = ["record", "video", "music", "xml", "json"]
```

### 5.1 `check_cq_code`

```python
@property
def check_cq_code(self) -> bool:
    _type = re.findall(r"CQ:(.*?),", self.text)
    for i in _type:
        if i == "image":
            result = re.findall(r"url=(.*?)]", self.text)
            url = "" if not result else result[0]
            if self.tenc_gchat_url not in url:
                return False
            else:
                return True
        if i in self.may_inject_keys:
            return False
        else:
            return True
    else:
        return True
```

它会检查消息中是否存在：

- 图片链接不是腾讯图床域名
- CQ 码注入风险
- 某些敏感类型被识别为危险内容

### 5.2 `check_image_url`

```python
@property
def check_image_url(self) -> bool:
    if self.tenc_gchat_url not in self.text:
        return False
    else:
        return True
```

它的职责很简单：判断文本中是否包含允许的腾讯图床地址。适合在消息发送前做安全预检。

---

## 6. 文件处理：`FileDealer`

```python
class FileDealer:
    def __init__(self, path: Path, encoding: str = "utf-8"):
        self.path = path
        self.encoding = encoding
```

`FileDealer` 是异步文件处理工具，适合在 `asyncio` 环境中使用。核心方法有：

- `write(content)`：异步写入文本
- `write_json(content)`：写入 JSON 内容
- `read()`：读取整个文件
- `readline()`：读取一行
- `readlines()`：读取全部行
- `readtable()`：判断文件是否可读
- `json()`：同步读取 JSON 文件并返回 Python 对象

实现上使用 `aiofiles.open()`，因此适合和缓存、配置保存、运行时日志等场景组合使用。

---

## 7. 图片压缩：`ImageDealer`

```python
class ImageDealer:
    def __init__(self, out_path, kb: int = 300, quality: int = 85, k: float = 0.9):
        self.out_path = out_path
        self.kb = kb
        self.quality = quality
        self.k = k
```

### 7.1 `deal()`

```python
def deal(self) -> str:
    o_size = os.path.getsize(self.out_path) // 1024
    if o_size <= self.kb:
        return self.out_path

    ImageFile.LOAD_TRUNCATED_IMAGES = True
    while o_size > self.kb:
        img = Image.open(self.out_path)
        x, y = img.size
        out = img.resize((int(x * self.k), int(y * self.k)), Image.ANTIALIAS)
        try:
            out.save(self.out_path, quality=self.quality)
        except Exception:
            raise Exception("Writing file failed!")
        o_size = os.path.getsize(self.out_path) // 1024
    return self.out_path
```

它的逻辑很简单：

- 先判断图片大小是否已满足目标大小阈值
- 若超出阈值，则循环缩小图片
- 每次重新保存后再次检查尺寸

它适合在发送图片前压缩，尤其在网络带宽或协议限制下很有价值。

---

## 8. 中文繁简转换：`Translate`

```python
class Translate:
    SIMPLE = "..."
    TRADITION = "..."
```

`Translate` 通过大字符串映射表实现简繁转换：

- `to_tradition()`：把简体字转换成繁体字
- `to_simple()`：把繁体字转换成简体字

核心思想是：对每个字符在映射表中找对应位置，然后取出目标字符。它适合批量文本转换，但也依赖很大的内置映射表。

---

## 9. 限流器：`Limiter` / `RateLimiter` / `LimitedQueue`

### 9.1 `Limiter`

```python
class Limiter:
    def __init__(self, max_count: int, down_time: float):
        self.max_count = max_count
        self.down_time = down_time
        self.count = defaultdict(int)
```

这是一个简单的“键值计数器式限流”实现：

```python
def check(self, key: str) -> bool:
    current_time = time.time()
    if self.count[key] >= self.max_count:
        return False
    self.count[key] += 1
    return True
```

它常用于：

- 限制某个用户发言频率
- 限制某个操作高频触发
- 在执行前判断是否可继续处理

### 9.2 `RateLimiter`

```python
class RateLimiter:
    def __init__(self, max_calls, period):
        self.max_calls = max_calls
        self.period = period
        self.calls = deque()
```

它遵循经典“滑动窗口”思路：

```python
def is_allowed(self):
    current_time = time.time()
    while self.calls and self.calls[0] < current_time - self.period:
        self.calls.popleft()

    if len(self.calls) < self.max_calls:
        self.calls.append(current_time)
        return True
    else:
        return False
```

它适合：

- API 限流
- 任务触发控制
- 高频事件节流

### 9.3 `LimitedQueue`

```python
class LimitedQueue:
    def __init__(self, max_size):
        self.queue = deque(maxlen=max_size)
        self.max_size = max_size
```

它有固定长度，超出长度时自动丢弃最旧元素，适合：

- 短时缓存
- 最近记录保留
- 事件回放 / 采样缓存

---

## 10. 并发锁：`SingleLock` 与 `GroupLock`

### 10.1 `SingleLock`

```python
class SingleLock:
    def __init__(self):
        self._lock = Lock()
```

它用 `threading.Lock()` 包装函数调用过程，保证同一时刻只有一个调用进入临界区，适合保护共享状态或避免重复执行。

### 10.2 `GroupLock`

```python
class GroupLock:
    def __init__(self):
        self._lock: Dict[str: Lock] = {}
```

`GroupLock` 与 `SingleLock` 的区别在于：

- 它按 key 维度管理多个锁
- 不同资源可分别加锁
- 更适合多用户、多任务场景

支持：

- `locks.run("user_123", some_func)`
- 装饰器形式 `@locks.lock("user_123")`

---

## 11. 事件系统：`event.py`

`ATRI.utils.event` 是一个较新的通用事件总线模块，用于实现“事件体 + 监听器 + 发布/通知”机制。

### 11.1 `BaseEvent`

```python
class BaseEvent:
    def __init__(self, event_name):
        self.event_name = event_name
        self.error = False
        self.error_listeners = []
        self.result = {}
```

它代表一次事件：

- `add_result(result, priority=10)`：添加事件结果
- `get_result()`：按优先级顺序获取结果

### 11.2 `BaseListener`

`BaseListener` 是事件监听器的基础抽象，`InnerListener` 会把普通函数转换为监听器，`AsyncInnerListener` 则支持异步函数。

### 11.3 `BaseEvents` / `AsyncBaseEvents`

```python
class BaseEvents:
    def __init__(self, stop_when_error: bool = False):
        self.listeners = {}
        self.stop_when_error = stop_when_error
```

它提供：

- `subscribe(listener, priority=10)`：注册监听器
- `unsubscribe(listener_name)`：取消监听器
- `notify(event)`：通知所有监听器
- `handle(priority=10)`：装饰器方式注册处理函数

`AsyncBaseEvents` 版本则支持异步监听器，并在异常时按错误监听器聚合输出。这个模块非常适合把“业务动作”和“事件响应”解耦。

---

## 12. 数据模型基类：`model.py`

`ATRI.utils.model` 提供了一个 Pydantic 2 的基础模型封装：

```python
class BaseModel(PBaseModel):
    @classmethod
    def read_from_file(cls, path):
        if not os.path.exists(path):
            raise IOError("找不到指定文件")
        with open(path, 'r', encoding='utf-8') as file:
            model = cls.model_validate(json.load(file))
        return model

    def write_into_file(self, path):
        with open(path, 'w', encoding='utf-8') as file:
            json.dump(self.model_dump(), file, indent=4, ensure_ascii=False)
```

这个模型适合：

- 从 JSON 文件读入配置
- 给模块定义结构化数据模型
- 把配置对象直接写回磁盘

它是机器状态、版本信息、配置对象等的基础承载方式。

---

## 13. 随机概率与等级管理：`curve.py`

`curve.py` 里包含两类辅助工具。

### 13.1 `IntToBoolRandom`

```python
class IntToBoolRandom:
    def __init__(self, random_num, max_num):
        self.random_num = random_num
        self.max_num = max_num
```

它用于生成“基于数值变化的随机布尔值”，返回 `True` 的概率会随着输入值增大而变化。适合：

- 概率事件
- 经验值随机判定
- 游戏式掉落或稀有度计算

### 13.2 `LvlManager`

```python
class LvlManager:
    def __init__(self, base_num, multiple):
        self.base_num = base_num
        self.multiple = multiple
```

它能够把经验值转成等级，并允许计算当前等级剩余经验：

- `to_lvl(exp)`：将经验值映射到等级
- `get_left_exp(exp, lvl=None)`：计算还差多少经验升级
- `get_lvl_exp(lvl)`：返回当前等级所需经验

此工具很适合用于任务、签到、等级系统等数据场景。

---

## 14. 图片编辑：`IMGEditor`

`IMGEditor` 是 ATRI 中最典型的图像处理工具，位于 `ATRI/utils/img_editor.py`。

它基于 Pillow (`PIL`) 实现，支持：

- 调整图片尺寸
- 绘制圆角矩形背景
- 写入文本（左对齐 / 右对齐 / 居中对齐 / 自动换行）
- 添加边框
- 添加圆形头像
- 生成 Base64 / JPEG bytes
- 保存图片

关键特征：

```python
class IMGEditor:
    def __init__(self, image: bytes | Image.Image):
        if type(image) is bytes:
            self.img = Image.open(BytesIO(image))
        else:
            self.img = image
```

它常用于：

- 生成发图卡片
- 组装排行榜/签到图
- 生成消息中的图文组合内容

---

## 15. HTTP 请求：`RequestClient`

```python
class RequestClient:
    def __init__(self, time_out: float | None, verify: bool = False, use_log: bool = True):
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(time_out), verify=verify)
        self.use_log = use_log
```

它通过 `httpx` 封装：

- `get()`
- `post()`
- `delete()`

并支持：

- 异步 `AsyncClient`
- 日志输出
- 代理和超时配置

模块级函数也提供了同名封装：

```python
async def get(url: str, verify: bool = False, **kwargs):
    async with httpx.AsyncClient(timeout=timeout, verify=verify) as client:
        return await client.get(url, **kwargs)
```

适合外部 API 查询、内容抓取、服务访问等场景。

---

## 16. 包管理：`PackageManager`

```python
class PackageManager:
    def __init__(self, executable: str = None):
        self.executable = executable or sys.executable
```

`PackageManager` 负责 Python 包的安装、卸载和检查：

- `install(packages, upgrade=False)`
- `uninstall(packages, yes=True)`
- `install_requirements(requirements_file)`
- `freeze()`：返回 `pip freeze` 结果
- `list_installed()`：整理成 `[{"name": ..., "version": ...}]`
- `search(package_name)`
- `show(package_name)`

它本质上是对 `subprocess.run([...])` 的封装，用于运行：

```python
[python_executable, "-m", "pip", "install", ...]
```

适合在运行时自动补齐依赖或拓展插件所需的 Python 包。

---

## 17. SQLite 辅助层：`Cursor` / `DBTable` / `DataBase`

### 17.1 `Cursor`

`Cursor` 是对 SQLite `cursor` 的包装，负责：

- `insert()`
- `update()`
- `delete()`
- `execute()`

并通过 `with` 语法支持自动提交：

```python
with self.get_cursor() as cursor:
    cursor.insert(...)
```

### 17.2 `DBTable`

`DBTable` 是单表操作封装：

- `select_all()`
- `select()`
- `insert()`
- `update()`
- `delete()`

适合小型本地缓存和轻量数据表操作。

### 17.3 `DataBase`

```python
class DataBase:
    def __init__(self, database_name: str):
        self._connection = connect(f"{DB_DIR}/{database_name}")
```

它负责：

- 打开或创建 SQLite 数据库
- 创建 `TABLEVERSION` 记录表
- `get_table(table_name, table_content, table_version, update_dp=None)` 自动建表并维护版本
- `get_exist_table()` 获取已有表
- `disconnect()` 关闭连接

这种设计适合“少量表 + 轻量结构升级”的场景，不适合大规模 ORM 场景。

---

## 18. 系统状态获取：`machine.py`

`machine.py` 负责获取当前机器状态，主要包括：

- `get_platform_info()`
- `get_cpu_info()`
- `get_mem_info()`
- `get_disk_info()`
- `get_net_info()`

它依赖 `psutil` 统计运行状态，并在 Windows 下使用 `wmi` / `win32com` 提取更细粒度的系统信息。

### 18.1 核心返回模型

```python
class PlatformInfo(BaseModel):
    name: str
    struct: str
    type: str

class CpuInfo(BaseModel):
    name: str
    count: int
    max_freq: str
    current_freq: str
    percent: float
    process: int
```

这些模型非常适合：

- 面板展示
- 运行状态监控
- 运维脚本汇报
- 机器人状态输出

### 18.2 磁盘和网络吞吐

磁盘和网络速率使用 APScheduler 定时任务更新：

```python
@scheduler.scheduled_job("interval", seconds=1, misfire_grace_time=15)
async def _():
    ...
```

这样 `get_disk_info()` 和 `get_net_info()` 能返回最近一秒的增量速度，而不是每次都重新扫描全局值。

---

## 19. 版本检查：`check_update.py`

`check_update.py` 使用 GitHub REST API 获取最新发布版本和更新时间：

- `REPO_RELEASE_URL`
- `ReleaseInfo`
- `CheckUpdate.get_latest_info()`
- `get_version_num()`
- `is_newer_version()`

当前实现的关键点：

- 使用 GitHub Release API 获取最新版本信息
- 解析 `release_data["name"]` 作为版本名
- 把 UTC 时间转换为 `Asia/Shanghai` 时间显示
- 使用字符串规则比较版本大小，避免直接依赖复杂的语义版本库

这使得框架能够在运行时提示用户当前版本是否过旧，并在需要时触发更新提示。

---

## 20. 新增与修改模块总结

在当前代码中，`ATRI.utils` 已不仅是原先的几个老工具类，而是包含了更完整的公共基础设施：

- `datetime.py`：统一时区工具，支持项目级时间管理
- `event.py`：事件总线系统，支持同步/异步监听
- `curve.py`：概率和经验等级工具
- `model.py`：Pydantic 2 基础模型，支持文件输入/输出
- `machine.py`：增强的系统状态监测，包含磁盘/网络速率统计
- `check_update.py`：版本更新检查逻辑

这些模块的加入，说明 `ATRI.utils` 已经从“简单函数集合”进一步发展成“框架底座式的通用工具池”。

---

## 21. 使用建议

如果你在开发 ATRI 插件或扩展功能，可以优先按需求选用这些工具：

- 需要随机 ID / 简单标识：`gen_random_str()`
- 需要时间处理：`TimeDealer` / `ATRI.utils.datetime`
- 需要标签、清洗和去重：`ListDealer`
- 需要消息校验：`MessageChecker`
- 需要异步配置保存/缓存：`FileDealer`
- 需要图片消息：`IMGEditor`
- 需要限流：`Limiter` / `RateLimiter` / `LimitedQueue`
- 需要线程安全：`SingleLock` / `GroupLock`
- 需要本地轻量存储：`DataBase` / `DBTable`
- 需要事件编排：`BaseEvent` / `BaseEvents` / `AsyncBaseEvents`
- 需要系统监控：`get_cpu_info()` / `get_mem_info()` / `get_disk_info()` / `get_net_info()`
- 需要自动检测更新：`CheckUpdate`

---

## 22. 总结

`ATRI.utils` 的本质，是一个“工程辅助层”。它没有强烈的业务语义，但它决定了插件是否能更快速、更安全、更稳定地完成常见工作：

- 读写文件
- 发起 HTTP 请求
- 生成图片
- 限制频率
- 保护共享资源
- 组织事件流
- 监测系统状态
- 管理依赖与版本信息

因此，对于 ATRI 的开发者来说，理解这个模块并不仅仅是“看资料”，而是在理解框架底层的运行方式：它如何在不显式引入重型库的前提下，为业务层提供稳定的基础设施支持。
