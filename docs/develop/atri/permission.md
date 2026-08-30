# 权限模块说明

本文档面向开发者，说明 `ATRI.permission` 模块如何在 NoneBot 的权限系统上扩展“主人 / 管理员”判定，并提供可动态维护的主人列表。

## 模块定位

权限相关代码位于：

- `ATRI/permission.py`

它主要负责：

- 维护 `master.json` 中的主人列表
- 检查当前事件是否来自主人
- 检查当前事件是否来自群管理员或主人
- 提供 `MASTER`、`ADMIN` 两个权限对象

---

## 1. 设计目标

`ATRI.permission` 不是简单地把 `Permission` 类“套一层”，而是构建了项目自己的权限语义：

- `Master`：仅允许主人
- `Admin`：允许主人、群主、群管理员

同时，项目还把主人名单分成两种来源：

1. 配置文件中的 `conf.BotConfig.superusers`
2. 运行时在 `master.json` 中手动维护的名单

这样做的好处是：

- 允许在运行期动态增删主人
- 配置与运行时状态分离
- 与 NoneBot 的权限机制天然兼容

---

## 2. 主人文件与状态管理

```python
MASTER_FILE_PATH = SYS_CONFIG_DIR / "master.json"
MASTER_FILE = FileDealer(MASTER_FILE_PATH)
MASTER_LIST = set()
```

这里定义了：

- `master.json`：主人配置文件路径
- `MASTER_FILE`：文件操作包装器
- `MASTER_LIST`：内存中的快速查找集合

### 2.1 创建主人文件

```python
def __create_master_file():
    if not MASTER_FILE_PATH.is_file():
        data = dict()
        for i in conf.BotConfig.superusers:
            data[i] = {"is_conf": True}

        with open(MASTER_FILE_PATH, "w") as w:
            w.write(json.dumps(data))
```

它会在首次启动时检查：

- 如果 `master.json` 不存在
- 就根据 `conf.BotConfig.superusers` 生成初始主人记录

同时给每个主人标记：

```python
{"is_conf": True}
```

表示它来源于配置。

### 2.2 初始化权限状态

```python
def __init_permission():
    global MASTER_LIST
    __create_master_file()
    data = MASTER_FILE.json()
    MASTER_LIST = set.union(set(data), conf.BotConfig.superusers)
```

这里做了两件事：

- 确保 `master.json` 存在
- 合并：
  - JSON 文件中的动态主人
  - 配置中的静态超级用户

最终 `MASTER_LIST` 就是所有允许作为主人的人集合。

---

## 3. 主人判断：`is_master()`

```python
def is_master(bot: Bot, event: Event) -> bool:
    __init_permission()
    try:
        user_id = event.get_user_id()
    except Exception:
        return False

    return user_id in MASTER_LIST
```

它的逻辑很简单：

- 先刷新主人集合
- 读取该事件的用户 ID
- 若该用户在 `MASTER_LIST` 中，则返回 `True`

这里的事件对象来自 NoneBot，通常可以以通用方式访问用户 ID。

---

## 4. 动态切换主人：`toggle_master()`

```python
async def toggle_master(user_id: str):
    data = MASTER_FILE.json()
    if user_id in data:
        data.pop(user_id)
    else:
        data[user_id] = {"is_conf": False}
    await MASTER_FILE.write_json(data)
```

它实现了“开关主人”的语义：

- 如果用户已是主人，则移除
- 如果用户不是主人，则添加

并且它不会直接写入配置文件，而是写入 `master.json`，让运行时动态权限状态与配置分离。

这对“临时授权”或“管理员临时被移除”非常有用。

---

## 5. `Permission` 扩展类

```python
class Permission(_Permission):
    name = "UnknownPermission"

    def set_name(self, name: str) -> "Permission":
        self.name = name
        return self
```

这里继承 `nonebot.permission.Permission`，并为其增加了一个 `name` 属性。

这是一个很典型的封装：

- 让权限对象可读性更强
- 便于输出日志与调试
- 更容易在服务或命令中识别权限类型

---

## 6. `Master` 权限判定器

```python
class Master:
    __slots__ = ()

    async def __call__(self, bot: Bot, event: Event) -> bool:
        return is_master(bot, event)
```

它作为一个可调用对象，用于 NoneBot 权限校验：

```python
MASTER = Permission(Master()).set_name("Master")
```

这表示：

- 只有主人才命中该权限
- 适用于敏感命令，如重启、更新、插件管理等

---

## 7. `Admin` 权限判定器

```python
class Admin:
    __slots__ = ()

    GROUP_ADMIN = ["admin", "owner"]

    async def __call__(self, bot: Bot, event: Event) -> bool:
        if isinstance(event, GroupMessageEvent):
            return event.sender.role in ["admin", "owner"] or is_master(bot, event)
        else:
            return False
```

它的规则是：

- 仅在群消息事件中生效
- 允许 `event.sender.role` 为 `admin` / `owner`
- 或者是主人

这意味着：

- 群管理员继承管理权限
- 机器人主人拥有最高权限
- 私聊事件不视为管理员事件

最后：

```python
ADMIN = Permission(Admin()).set_name("Admin")
```

---

## 8. 运行时初始化

文件最后执行：

```python
__init_permission()
MASTER = Permission(Master()).set_name("Master")
ADMIN = Permission(Admin()).set_name("Admin")
```

这保证：

- 模块导入时就初始化权限状态
- `MASTER` 和 `ADMIN` 可直接用于命令装饰器或服务权限校验

---

## 9. 使用方式

### 9.1 在服务或命令中使用主人权限

```python
from ATRI.permission import MASTER

@xxx.handle()
@xxx.permission(MASTER)
async def demo():
    ...
```

### 9.2 使用管理员权限

```python
from ATRI.permission import ADMIN

@xxx.handle()
@xxx.permission(ADMIN)
async def admin_action():
    ...
```

### 9.3 动态增删主人

```python
from ATRI.permission import toggle_master

await toggle_master("123456")
```

这会把对应用户加入或移出动态主人列表。

---

## 10. 设计亮点

这个权限模块体现了两个核心思想：

1. 以配置为基础，保留静态超级用户
2. 允许运行时动态维护权限状态

同时，它通过 `NoneBot` 的 `Permission` 抽象隐藏了细节，使项目可以直接复用原生权限机制，而不是另起一套判断流程。

---

## 11. 开发建议

### 11.1 权限判断尽量使用统一对象

不要到处写硬编码：

```python
if event.sender.role == "owner"
```

而应该优先使用：

- `MASTER`
- `ADMIN`

这样更统一、更容易维护。

### 11.2 主人列表要及时同步

如果修改了 `conf.BotConfig.superusers`，建议重新初始化权限，确保 `MASTER_LIST` 与配置一致。

### 11.3 仅用于关键权限

主人权限适用于：

- 重启
- 更新
- 关键状态切换
- 账号配置

不建议把所有命令都挂到主人权限上，否则权限层会变得过重。

---

## 12. 总结

`ATRI.permission` 是整个项目的权限基础设施。它围绕“主人”和“管理员”两个语义设计了清晰的权限判断，让项目可以在 NoneBot 生态中安全地控制关键操作。

就开发者而言，最重要的理解点是：

- `MASTER` 只允许主人
- `ADMIN` 允许主人 + 群管理员
- 主人列表由配置和动态文件共同组成
- 动态维护通过 `toggle_master()` 完成

这使之既适合项目默认权限，也适合未来扩展不同角色。
