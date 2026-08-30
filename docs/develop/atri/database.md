# 数据库模块说明

本文档面向开发者，说明 `ATRI.database` 模块如何接入 Tortoise ORM，并为项目提供数据库初始化、模型注册和常用 CRUD 包装能力。

## 模块定位

数据库相关代码主要位于：

- `ATRI/database/__init__.py`
- `ATRI/database/db.py`
- `ATRI/database/wrapper.py`

其中，`ATRI.database.__init__` 对外暴露：

```python
from .db import init_database, close_database_connection, add_database
from .wrapper import DatabaseWrapper
```

这意味着开发者通常通过：

```python
from ATRI.database import init_database, DatabaseWrapper
```

来访问数据库层能力。

---

## 1. 总体设计

这个数据库模块并没有自己设计一套复杂的 DAO 层，而是基于 Tortoise ORM 做了一个轻量封装，主要关注以下几件事：

1. 统一注册数据库模型
2. 按业务维度创建 SQLite 数据库实例
3. 统一初始化与关闭连接
4. 对常见增删改查提供包装接口

这种设计的好处是：

- 结构简单，便于快速接入
- 每个功能模块可按需注册模型
- 与 Tortoise 的原生用法共存，不需要强制重写整个 ORM 层

---

## 2. 数据库初始化：`init_database()`

`ATRI/database/db.py` 中的 `init_database()` 是启动入口。

```python
async def init_database():
    add_database("ATRI", statistics_model)
    log.info(f"正在初始化{len(data)}个数据库...")
    await run()
    log.success("数据库初始化完成")
```

### 2.1 关键点

- 它先调用 `add_database("ATRI", statistics_model)` 注册默认数据库和模型。
- 然后执行 `run()`，真正初始化 Tortoise。
- 最后输出日志表明数据库初始化完成。

这里的数据库名是 `ATRI`，对应的 SQLite 文件会落到 `DB_DIR` 下，具体文件名大致为：

```python
f"{DB_DIR}/{d}.sqlite3"
```

也就是：

- `ATRI.sqlite3`
- 或其他注册到 `data` 中的数据库名对应文件

---

## 3. 数据库注册：`add_database()`

```python
def add_database(name: str, model):
    if name not in data:
        data[name] = [model]
    else:
        data[name].append(model)
```

### 3.1 设计说明

`data` 是一个全局字典，结构大致为：

```python
{
    "ATRI": [MessageStatistics, ServiceStatistics],
}
```

这里支持多个数据库名，每个数据库名可以挂载多张表模型。也就是说，项目的数据库注册是“按库名分组、按模型列表存储”的形式。

### 3.2 实际用途

比如统计模块定义了两个模型：

- `MessageStatistics`
- `ServiceStatistics`

它们在 `ATRI/bot/statistics/model.py` 中声明，随后由数据库初始化时统一纳入 `ATRI` 数据库中。

---

## 4. Tortoise 初始化：`run()`

`run()` 是真正执行 Tortoise 连接与 schema 生成的函数：

```python
async def run():
    database = {
        "connections": {},
        "apps": {},
        "timezone": "Asia/Shanghai"
    }
    for d in data:
        database["connections"][d] = {
            "engine": "tortoise.backends.sqlite",
            "credentials": {
                "file_path": f"{DB_DIR}/{d}.sqlite3",
            }
        }
        database["apps"][d] = {
            "models": data[d],
            "default_connection": d,
        }
    await Tortoise.init(database)
    await Tortoise.generate_schemas()
```

### 4.1 关键行为

- `connections`：定义数据库连接池配置
- `apps`：定义每个 app / database 名称对应的 Model 列表
- `timezone`：设置时区为 `Asia/Shanghai`
- `await Tortoise.init(database)`：初始化 Tortoise
- `await Tortoise.generate_schemas()`：自动生成表结构

### 4.2 适用场景

这种方式非常适合：

- SQLite 轻量部署
- 项目启动时一键自动建表
- 统计、日志、状态等数据模型无需额外脚本

---

## 5. 关闭连接：`close_database_connection()`

```python
async def close_database_connection():
    log.info("正在关闭数据库连接...")
    await Tortoise.close_connections()
    log.info("数据库成功关闭")
```

它负责在程序退出前关闭所有 Tortoise 连接，避免 SQLite 文件被占用或资源泄露。

---

## 6. 数据模型示例：统计表

项目中已经有一个非常典型的使用案例：`ATRI/bot/statistics/model.py`。

### 6.1 `MessageStatistics`

```python
class MessageStatistics(Model):
    id = fields.BigIntField(pk=True)
    bot_id = fields.CharField(max_length=100, index=True)
    user_id = fields.CharField(max_length=100, index=True)
    group_id = fields.CharField(max_length=100, null=True, index=True)
    message_type = fields.CharField(max_length=20)
    content = fields.TextField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "message_statistics"
```

它记录：

- bot 标识
- 用户标识
- 群标识
- 消息类型
- 内容
- 创建时间

### 6.2 `ServiceStatistics`

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

    class Meta:
        table = "service_statistics"
```

它用于记录服务调用统计，例如：

- 哪个 bot 调用了哪个 service
- 调用类型是命令还是事件
- 目标对象是用户还是群
- 是否包含追踪 ID

---

## 7. 数据库包装器：`DatabaseWrapper`

`ATRI/database/wrapper.py` 为常见 CRUD 场景提供封装：

```python
class DatabaseWrapper:
    def __init__(self, model: Type[Model]):
        self.model = model
```

### 7.1 `add_sub()`

```python
async def add_sub(self, *args, **kwargs):
    await self.model.create(*args, **kwargs)
```

用于直接创建新记录。

### 7.2 `update_sub()`

```python
async def update_sub(self, update_map: dict, **kwargs):
    await self.model.filter(**kwargs).update(**update_map)
```

用于按条件更新记录，并通过 `filter(**kwargs)` 进行筛选。

### 7.3 `del_sub()`

```python
async def del_sub(self, query_map: dict):
    await self.model.filter(**query_map).delete()
```

用于删除匹配条件的记录。

### 7.4 `get_sub_list()`

```python
async def get_sub_list(self, query_map: dict) -> list:
    return await self.model.filter(**query_map)
```

用于按条件获取列表。

### 7.5 `get_all_subs()`

```python
async def get_all_subs(self) -> list:
    return await self.model.all()
```

用于获取全部数据。

---

## 8. 使用方式

### 8.1 直接使用数据库初始化

```python
from ATRI.database import init_database

await init_database()
```

### 8.2 使用包装器

```python
from ATRI.database import DatabaseWrapper
from ATRI.bot.statistics.model import MessageStatistics

wrapper = DatabaseWrapper(MessageStatistics)

# 插入
await wrapper.add_sub(
    bot_id="123",
    user_id="456",
    group_id=None,
    message_type="private",
    content="hello"
)

# 查询
rows = await wrapper.get_sub_list({"bot_id": "123"})
```

### 8.3 直接使用 Tortoise 原生 API

开发者也可以绕过包装器，直接使用原生模型对象：

```python
from ATRI.bot.statistics.model import ServiceStatistics

await ServiceStatistics.create(
    bot_id="123",
    service_id="demo",
    call_type="command",
    target_id="456",
    target_type="private",
)
```

这使得数据库层既可统一封装，又保留 Tortoise 原生能力。

---

## 9. 设计特点

从实现上看，这个数据库层的设计非常偏“轻量业务适配层”，其特点包括：

1. 以 Tortoise 为核心，不重写 ORM
2. 统一模型注册入口，方便初始化
3. 以 `DatabaseWrapper` 简化常见脚本式 CRUD
4. 统计模型是默认接入模块，体现项目真实使用场景

---

## 10. 开发建议

### 10.1 新增业务表时

新增表时，推荐：

- 在对应模块中定义 `Model` 子类
- 声明 `Meta.table` 名称
- 在数据库初始化时保证纳入注册列表

例如：

```python
from tortoise import fields
from tortoise.models import Model

class UserBehavior(Model):
    id = fields.BigIntField(pk=True)
    user_id = fields.CharField(max_length=100)
    event = fields.CharField(max_length=50)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "user_behavior"
```

然后在你的模块初始化阶段执行 `add_database()` 注册即可。

### 10.2 若需要更强约束

如果后续业务增长，需要更严谨的查询层，可考虑：

- 增加专门的 repository 层
- 对查询条件和返回值做统一封装
- 把数据库访问逻辑从业务代码中拆离

当前实现更适合中小规模项目快速迭代。

---

## 11. 总结

`ATRI.database` 是一个简洁但实用的数据库桥接层。它通过 Tortoise ORM 把项目的数据模型组织起来，并在启动阶段自动初始化 SQLite 数据库、自动生成表结构，同时提供 `DatabaseWrapper` 让业务代码减少重复 CRUD 代码。

对于开发者而言，最重要的理解是：

- 数据库连接的入口在 `init_database()`
- 模型注册集中在 `add_database()`
- 业务表定义依赖 Tortoise `Model`
- 常用查询逻辑可通过 `DatabaseWrapper` 复用

这使得数据库层足够轻量，同时具备可扩展性，适合 ATRI 这种插件型项目架构。

