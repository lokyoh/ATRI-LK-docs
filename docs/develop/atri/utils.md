# utils 模块

`ATRI.utils` 是 ATRI 项目的通用工具层，作用是为其他模块提供低耦合、可复用的基础能力。它并不负责业务流程本身，而是给插件、事件、调度、适配器和监控模块提供通用设施：

- 文件读写与 JSON 处理
- 时间转换与字符串工具
- 防重放/限流与线程安全保护
- 图片编辑与图像消息生成
- HTTP 请求和 Python 包管理
- SQLite 轻量存储
- 平台、CPU、内存、磁盘、网络状态监控
- GitHub 版本/提交检查

从设计上看，这个模块属于“框架底座”，本质上是把常见工程能力抽离出来，减少每个业务模块中重复实现的风险。

## 模块位置

- 代码目录：`ATRI/utils`
- 关键文件：
  - `ATRI/utils/__init__.py`
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

`ATRI.utils` 采用“工具类 + 函数 + 数据模型”混合组织方式，核心特点有：

1. 强调“最小依赖”：多数工具类不依赖复杂框架，只依赖标准库或稳定第三方库。
2. 面向运行时使用：大量工具用于消息发送、任务调度、系统状态展示、缓存处理。
3. 以直接调用为主：没有复杂抽象层，通常适合插件快速接入。
4. 兼顾开发效率和稳定性：例如 `RequestClient`、`FileDealer`、`PackageManager` 都是典型的“实用工具类”。

这使得它非常适合以上层模块继续调用，而不是优先设计成大型工程框架。

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
- 验证码场景的占位标识

它的实现非常简单：直接用 Python 的 `string.ascii_letters + string.digits` 做字符池，再从中随机采样。

---

## 3. 时间处理：`TimeDealer`

```python
class TimeDealer:
    def __init__(self, timestamp: float, timezone):
        self.timestamp = timestamp
        self.timezone = timezone
```

### 3.1 `to_str()`

```python
def to_str(self, format: str = "%Y-%m-%d %H:%M:%S") -> str:
    return datetime.fromtimestamp(self.timestamp, self.timezone).strftime(format)
```

含义：将秒级时间戳转成指定格式的字符串，例如：

```python
TimeDealer(1700000000, timezone.utc).to_str()
# '2023-11-14 22:13:20'
```

### 3.2 `to_datetime()`

```python
def to_datetime(self) -> datetime:
    return datetime.fromtimestamp(self.timestamp, self.timezone)
```

这适合需要继续参与日期计算的场景。

### 3.3 `int_now()`

```python
def int_now(self) -> float:
    time = datetime.fromtimestamp(self.timestamp, self.timezone)
    return time.hour + time.minute / 60
```

这个方法把当前时刻转换成一天中的“浮点时段”，例如 9:30 会变成 9.5。它的用途更多偏向“时间段比较”，比如判断是否在某个活跃时段内。

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

这个方法会删除列表中所有匹配的目标元素，并返回处理后的新列表。

如果业务中频繁做“清洗列表”“去重”这种操作，这个工具很适合直接使用。

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

它会检查消息中是否出现以下风险：

- 图片链接不是腾讯图床域名
- 可能存在 CQ 码注入风险
- 某些敏感类型被识别为危险内容

这类校验适合在消息处理链前端使用，做一层安全过滤。

### 5.2 `check_image_url`

```python
@property
def check_image_url(self) -> bool:
    if self.tenc_gchat_url not in self.text:
        return False
    else:
        return True
```

它的职责非常简单：判断文本里是否包含允许的腾讯图床链接。

---

## 6. 文件处理：`FileDealer`

```python
class FileDealer:
    def __init__(self, path: Path, encoding: str = "utf-8"):
        self.path = path
        self.encoding = encoding
```

`FileDealer` 采用异步 IO 方式进行文件操作，适合在 asyncio 环境中使用。核心方法为：

- `write(content)`：异步写入文本
- `write_json(content)`：写入 JSON 内容
- `read()`：读取整个文件
- `readline()`：读取一行
- `readlines()`：读取所有行
- `readtable()`：判断文件是否可读
- `json()`：通过 `json.loads(self.path.read_bytes())` 直接读 JSON

实现上使用 `aiofiles.open()`，因此非常适合和异步任务、缓存文件、配置保存等场景组合使用。

注意：这里的 `json()` 是同步方法，直接读取路径内容，并转成 Python dict。这使其便于临时脚本或配置读取，但不算完全异步。

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

- 先判断图片大小是否已经满足目标阈值
- 如果过大，就不断按比例缩小
- 每次缩放后再重新保存，直到大小小于目标参数 `kb`

适合发送图片前压缩，尤其在网络带宽或协议限制下非常有价值。

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

实现方式：

- 对每个字符先在 `SIMPLE` 中查找索引
- 再在 `TRADITION` 中对应位置取出转化后的字符

它属于“表驱动”的中文转换实现，优点是简单、可用；缺点是字符表体积较大，且转换规则依赖内置映射字符串。

---

## 9. 限流器：`Limiter`

```python
class Limiter:
    def __init__(self, max_count: int, down_time: float):
        self.max_count = max_count
        self.down_time = down_time
        self.count = defaultdict(int)
```

这是一个简单的“键值计数器式限流”实现。

### 9.1 `check(key)`

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
- 限制某个操作的高频触发
- 执行前验证是否允许继续处理

### 9.2 `increase(key)`

```python
def increase(self, key: str) -> None:
    self.count[key] += 1
```

此实现较轻量，适合某些简单的冷却场景；但它没有真正的时间窗口清理逻辑，所以更偏“计数器型”而非完整的时间窗型限流。

---

## 10. 时间窗口限流：`RateLimiter`

```python
class RateLimiter:
    def __init__(self, max_calls, period):
        self.max_calls = max_calls
        self.period = period
        self.calls = deque()
```

这是更符合经典“滑动窗口”思想的限流器。

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

它会：

- 记录最近的调用时间
- 清理窗口外的数据
- 若当前窗口内计数未超阈值则允许继续执行

适用场景：

- API 限流
- 任务触发控制
- 高频事件节流

---

## 11. 有长度限制的缓存队列：`LimitedQueue`

```python
class LimitedQueue:
    def __init__(self, max_size):
        self.queue = deque(maxlen=max_size)
        self.max_size = max_size
```

### 11.1 `add(item)`

```python
def add(self, item):
    if len(self.queue) == self.max_size:
        oldest = self.queue.popleft()
        self.queue.append(item)
        return oldest
    else:
        self.queue.append(item)
        return None
```

它的特点是：

- 队列固定最大长度
- 新元素加入时若队列满，则自动丢弃最旧元素
- 适合短时缓存和最近记录保存

### 11.2 `get_data()`

```python
def get_data(self):
    return list(self.queue)
```

这是一个很轻量的数据缓冲结构，常用于近期操作记录、短时消息缓存等。

---

## 12. 并发锁：`SingleLock` 与 `GroupLock`

### 12.1 `SingleLock`

```python
class SingleLock:
    def __init__(self):
        self._lock = Lock()
```

通过 `threading.Lock()` 包装一个函数执行过程：

```python
def run(self, func):
    def wrapper(*args, **kwargs):
        self._lock.acquire()
        try:
            r = func(*args, **kwargs)
        except Exception:
            self._lock.release()
            raise
        self._lock.release()
        return r
    return wrapper
```

它的核心思想是：保证同一时刻只有一个调用进入临界区，适合保护共享状态或避免重复执行。

### 12.2 `GroupLock`

```python
class GroupLock:
    def __init__(self):
        self._lock: Dict[str: Lock] = {}
```

`GroupLock` 与 `SingleLock` 的区别在于：

- 它按 key 维度管理多个锁
- 允许不同资源分别加锁
- 适合多用户、多任务场景

例如：

```python
locks = GroupLock()
locks.run("user_123", some_func)
```

它通过 `__getitem__` 自动创建锁，且支持装饰器方式：

```python
@locks.lock("user_123")
def foo():
    ...
```

这使得它在多资源并发保护方面比普通锁更灵活。

---

## 13. 图片编辑：`IMGEditor`

`IMGEditor` 是 ATRI 中最有代表性的图像处理工具之一，位于 `ATRI/utils/img_editor.py`。

它基于 Pillow (`PIL`) 实现，支持：

- 调整图片尺寸
- 绘制圆角矩形背景
- 写入文本（普通、右对齐、中间对齐、自动换行）
- 添加边框
- 添加圆形头像
- 生成 Base64 / JPEG bytes
- 保存图片

### 13.1 构造函数

```python
class IMGEditor:
    def __init__(self, image: bytes | Image.Image):
        if type(image) is bytes:
            self.img = Image.open(BytesIO(image))
        else:
            self.img = image
```

它支持两种输入：

- 原始图片 bytes
- 已打开的 Pillow `Image.Image`

### 13.2 `resize()`

```python
def resize(self, target_width, target_height) -> "IMGEditor":
    width, height = self.img.size
    scale = max(target_width / width, target_height / height)
```

它通过最大缩放比例保证图片能覆盖目标区域，并在必要时进行裁剪，适合生成统一规格图片。

### 13.3 `add_text()` / `add_right_text()` / `add_middle_text()`

这些方法均使用：

```python
ImageDraw.Draw(self.img)
ImageFont.truetype(font_path, font_size)
```

来在图片上写文本。区别只有对齐方式：

- `add_text()`：左对齐
- `add_right_text()`：右对齐
- `add_middle_text()`：居中对齐

### 13.4 `add_auto_text()`

这是最实用的文本排版能力：

```python
def add_auto_text(self, x, y, text, font_size, ..., max_width=None, line_spacing=None, vertical_align='top')
```

它会：

- 自动按字符长度计算换行
- 根据 `max_width` 进行分行
- 支持 `top / center / bottom` 三种纵向对齐方式

非常适合生成图文消息卡片，例如排行榜、公告卡片、签到图等。

### 13.5 `to_bytes()` / `to_base64()`

```python
def to_bytes(self) -> bytes:
    bytes_io = BytesIO()
    self.img.save(bytes_io, format='JPEG')
    return bytes_io.getvalue()
```

```python
def to_base64(self) -> str:
    ...
    return f'base64://{base64_encoded}'
```

这使得 `IMGEditor` 非常适合直接输出给 NoneBot 或其他消息通道用于图片发送。

### 13.6 `save_rgb()`

```python
def save_rgb(self, save_path):
    self.img.convert("RGB").save(save_path)
```

用于保存成标准 JPEG 图像。

---

## 14. HTTP 请求：`RequestClient`

```python
class RequestClient:
    def __init__(self, time_out: float | None, verify: bool = False, use_log: bool = True):
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(time_out), verify=verify)
        self.use_log = use_log
```

它是在 `httpx` 上做了一层封装，提供：

- `get()`
- `post()`
- `delete()`

最重要的特点是：

- 使用异步 `AsyncClient`
- 默认打印请求日志
- 读取配置中的代理和超时参数

在 `request.py` 中，模块级别还提供了函数式封装：

```python
async def get(url: str, verify: bool = False, **kwargs):
    async with httpx.AsyncClient(timeout=timeout, verify=verify) as client:
        return await client.get(url, **kwargs)
```

这让它可直接用于外部 API 访问，例如 GitHub 查询、天气查询、第三方服务请求等。

---

## 15. 包管理：`PackageManager`

```python
class PackageManager:
    def __init__(self, executable: str = None):
        self.executable = executable or sys.executable
```

`PackageManager` 负责 Python 包的安装、卸载和检查。功能包括：

- `install(packages, upgrade=False)`
- `uninstall(packages, yes=True)`
- `install_requirements(requirements_file)`
- `freeze()`：返回 `pip freeze` 的原始结果
- `list_installed()`：整理为 `[{"name": ..., "version": ...}]`
- `search(package_name)`
- `show(package_name)`

它本质上是对 `subprocess.run([...])` 的封装，用于运行：

```python
[python_executable, "-m", "pip", "install", ...]
```

这使得它适合：

- 自动安装缺失依赖
- 动态扩展功能包
- 在运行时维护 Python 环境

---

## 16. SQLite 辅助层：`Cursor` / `DBTable` / `DataBase`

### 16.1 `Cursor`

`Cursor` 是基础封装，用来简化一条 SQL 的执行流程：

- `insert()`
- `update()`
- `delete()`
- `execute()`

它以 `sqlite3.Connection.cursor()` 作为底层对象，并通过上下文管理器实现提交逻辑：

```python
with self.get_cursor() as cursor:
    cursor.insert(...)
```

如果没有异常，自动 `commit()`。

### 16.2 `DBTable`

`DBTable` 是对单表操作的进一步封装：

- `select_all()`
- `select()`
- `insert()`
- `update()`
- `delete()`

它的优点是：

- 适合小型本地表结构
- 比直接写 SQL 更容易维护
- 可作为插件缓存或轻量数据库支撑

### 16.3 `DataBase`

```python
class DataBase:
    def __init__(self, database_name: str):
        self._connection = connect(f"{DB_DIR}/{database_name}")
```

它负责：

- 打开或创建 SQLite 数据库
- 创建 `TABLEVERSION` 记录表
- `get_table(table_name, table_content, table_version, update_dp=None)` 自动建表并维护版本
- `get_exist_table()` 获取已存在表
- `disconnect()` 关闭连接

这个设计适用于“少量表 + 轻量表结构变更”的场景，而不是大型 ORM 场景。

> 虽然它不是 Tortoise ORM 这种完整数据库层，但在这个项目中，它是一种隐形的轻量本地数据管理方案。

---

## 17. 系统状态获取：`machine.py`

`machine.py` 负责获取当前机器状态，主要是：

- `get_platform_info()`
- `get_cpu_info()`
- `get_mem_info()`
- `get_disk_info()`
- `get_net_info()`

同时，它依赖 `psutil` 统计运行状态，并在 Windows 下使用 `wmi` / `win32com` 读取更细粒度的系统信息。

### 17.1 核心返回模型

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

这些模型非常适合用于：

- 面板展示
- 运行状态监控
- 运维脚本汇报
- 机器人状态输出

### 17.2 磁盘与网络吞吐

在 `machine.py` 中，磁盘和网络状态使用 APScheduler 定时任务更新：

```python
@scheduler.scheduled_job("interval", seconds=1, misfire_grace_time=15)
async def _():
    ...
```

这样可以让 `get_disk_info()` 和 `get_net_info()` 获取最近一秒的增量速率，而不是每次都重新计算全局量。实现上使用：

- `psutil.disk_io_counters()`
- `psutil.net_io_counters()`

这使得它更适合做实时状态展示，比如：

- 当前网速
- 当前磁盘读写速度
- 单机资源利用率

---

## 18. 版本检查：`check_update.py`

`check_update.py` 使用 GitHub REST API 抓取最新提交和发行版本：

- `REPO_COMMITS_URL`
- `REPO_RELEASE_URL`

### 18.1 `show_latest_commit_info()`

```python
@classmethod
async def show_latest_commit_info(cls) -> tuple | None:
    data = await cls._get_commits_info()
    commit_data = data[0]
```

它会返回：

- commit message
- commit SHA 前 5 位
- 中国时区本地时间

### 18.2 `show_latest_version()`

```python
@classmethod
async def show_latest_version(cls) -> tuple:
    data = await cls._get_release_info()
    release_data = data[0]
```

它返回最新发行版名和更新时间。

### 18.3 `get_version_num()`

```python
def get_version_num(v: str):
    return int(v.replace("Release", "Patch0").replace("Patch", ""))
```

这种“字符串转数值”的设计用于比较版本大小和判定是否需要更新。

---

## 19. 使用建议

如果你在开发 ATRI 插件或扩展功能，可以优先按需求选用这些工具：

- 需要随机 ID / 简单标识：`gen_random_str()`
- 需要时间处理：`TimeDealer`
- 需要标签、清洗和去重：`ListDealer`
- 需要消息校验：`MessageChecker`
- 需要异步配置保存/缓存：`FileDealer`
- 需要图片消息：`IMGEditor`
- 需要限流：`Limiter` / `RateLimiter`
- 需要线程安全：`SingleLock` / `GroupLock`
- 需要本地轻量存储：`DataBase` / `DBTable`
- 需要系统监控：`get_cpu_info()` / `get_mem_info()` / `get_disk_info()` / `get_net_info()`
- 需要自动检测更新：`CheckUpdate`

---

## 20. 总结

`ATRI.utils` 的本质，是一个“工程辅助层”。它没有强烈的业务语义，但它决定了插件是否能更快速、更安全、更稳定地完成常见工作：

- 读写文件
- 发起 HTTP 请求
- 生成图片
- 限制频率
- 保护共享资源
- 监测系统状态
- 管理依赖与版本信息

因此，对于 ATRI 的开发者来说，理解这个模块并不是“看资料”，而是理解框架底层的运行方式：框架如何在不显式引入重型库的前提下，为业务层提供稳定的基础设施支持。
