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

## 8. 其他事件响应器

除了 `on_command`，ATRI 还提供了多种事件响应器类型：

### 8.1 关键词响应 `on_keyword`

当消息包含指定关键词时触发：

```python
from ATRI.service import Service

plugin = Service("关键词响应", "关键词触发示例", "1.0.0", Service.ServiceType.FUNCTION)

# 当消息包含"早安"或"晚安"时触发
greeting = plugin.on_keyword(
    keywords={"早安", "晚安"},
    docs="问候响应"
)

@greeting.handle()
async def _(event):
    text = event.get_plaintext()
    if "早安" in text:
        await greeting.finish("早上好！今天也要加油哦~")
    else:
        await greeting.finish("晚安，做个好梦~")
```

### 8.2 正则表达式响应 `on_regex`

使用正则表达式匹配消息：

```python
import re
from ATRI.service import Service

plugin = Service("正则响应", "正则匹配示例", "1.0.0", Service.ServiceType.FUNCTION)

# 匹配数字+单位的格式，如"100kg"、"50m"
number_match = plugin.on_regex(
    pattern=r"^(\d+)(kg|m|cm|mm)$",
    docs="数字单位匹配"
)

@number_match.handle()
async def _(matcher):
    # 获取正则匹配结果
    matched = matcher.get_regex_result().group()
    number = matcher.get_regex_result().group(1)
    unit = matcher.get_regex_result().group(2)
    
    await number_match.finish(f"匹配到: {number} {unit}")
```

### 8.3 通知响应 `on_notice`

响应系统通知事件（如戳一戳、群成员变化等）：

```python
from nonebot.adapters.onebot.v11.event import PokeNotifyEvent
from ATRI.service import Service

plugin = Service("通知响应", "通知事件示例", "1.0.0", Service.ServiceType.FUNCTION)

# 响应戳一戳事件
poke = plugin.on_notice("戳一戳", "处理戳一戳")

@poke.handle()
async def _(event: PokeNotifyEvent):
    if event.is_tome():  # 判断是否戳的是机器人
        await poke.finish("别戳我啦~")
```

### 8.4 请求响应 `on_request`

响应好友请求、群邀请等：

```python
from nonebot.adapters.onebot.v11.event import FriendRequestEvent
from ATRI.service import Service

plugin = Service("请求响应", "请求事件示例", "1.0.0", Service.ServiceType.FUNCTION)

# 响应好友请求
friend_req = plugin.on_request("好友请求", "自动处理好友请求")

@friend_req.handle()
async def _(event: FriendRequestEvent):
    # 自动同意好友请求
    await event.approve()
    await friend_req.finish("已自动同意好友请求")
```

---

## 9. 命令组与主命令前缀

### 9.1 使用 `main_cmd` 设置主命令前缀

当插件有多个相关命令时，可以使用 `main_cmd` 统一前缀：

```python
from ATRI.service import Service

# 设置主命令前缀为"天气"
plugin = Service(
    "天气查询",
    "天气相关功能",
    "1.0.0",
    Service.ServiceType.FUNCTION
).main_cmd("天气")

# 这些命令会自动变成 /天气.查询、/天气.设置 等
query = plugin.cmd_as_group("查询", "查询天气")
setting = plugin.cmd_as_group("设置", "设置天气")

@query.handle()
async def _():
    await query.finish("北京：晴，25°C")

@setting.handle()
async def _():
    await setting.finish("已设置默认城市为北京")
```

### 9.2 使用 `cmd_as_group` 创建子命令

`cmd_as_group` 配合 `main_cmd` 使用，创建层级命令：

```python
from ATRI.service import Service

plugin = Service("管理", "管理功能", "1.0.0", Service.ServiceType.SYSTEM).main_cmd("管理")

# 命令变为 /管理.用户、/管理.群组 等
user_mgmt = plugin.cmd_as_group("用户", "用户管理")
group_mgmt = plugin.cmd_as_group("群组", "群组管理")

@user_mgmt.handle()
async def _():
    await user_mgmt.finish("用户管理功能")
```

---

## 10. 插件配置系统

从 YHN-LK0-024 开始，ATRI 使用新的 `PluginConfig` + `Field` API 来管理插件配置。

### 10.1 定义配置类

```python
from ATRI.configs import PluginConfig, Field

class MyPluginConfig(PluginConfig):
    # 基础类型字段
    enabled = Field(
        type_=bool,
        default=True,
        label="启用插件",
        description="是否启用此插件"
    )
    
    max_count = Field(
        type_=int,
        default=100,
        label="最大数量",
        description="最大处理数量",
        min=1,
        max=1000
    )
    
    # 嵌套配置
    api_config = Field(
        type_=dict,
        default={},
        label="API配置",
        children={
            "api_key": Field(
                type_=str,
                default="",
                label="API密钥"
            ),
            "timeout": Field(
                type_=int,
                default=30,
                label="超时时间",
                min=1,
                max=300
            )
        }
    )
```

### 10.2 在插件中使用配置

```python
from ATRI.service import Service
from ATRI.configs import PluginConfig, Field

class DemoConfig(PluginConfig):
    greeting = Field(
        type_=str,
        default="你好",
        label="问候语",
        description="默认问候语"
    )

plugin = Service("配置示例", "配置系统演示", "1.0.0", Service.ServiceType.FUNCTION)
config = DemoConfig("配置示例")  # 传入服务名

hello = plugin.on_command("你好", "问候命令")

@hello.handle()
async def _():
    # 读取配置
    greeting = config.get("greeting")
    await hello.finish(greeting)
```

### 10.3 配置的读取与修改

```python
# 读取配置
value = config.get("字段名")
nested_value = config.get("api_config.api_key")  # 支持点号路径

# 修改配置
config.set("字段名", 新值)
config.set("api_config.timeout", 60)  # 支持点号路径

# 批量更新
config.update({
    "enabled": True,
    "max_count": 200
})
```

---

## 11. 计划任务

使用 `scheduler_jobs()` 创建定时任务：

```python
from ATRI.service import Service

plugin = Service("定时任务", "计划任务示例", "1.0.0", Service.ServiceType.FUNCTION)

# 获取计划任务控制器
scheduler = plugin.scheduler_jobs()

# 添加定时任务
@scheduler.add_job(
    trigger="cron",           # 触发器类型
    hour=8,                   # 每天早上8点
    minute=0,
    id="morning_greeting"     # 任务ID
)
async def morning_greeting():
    """早间问候任务"""
    from ATRI import get_bot
    bot = get_bot()
    # 发送消息到指定群
    await bot.send_group_msg(
        group_id=123456789,
        message="早上好！新的一天开始了~"
    )

# 添加间隔任务
@scheduler.add_job(
    trigger="interval",
    minutes=30,               # 每30分钟
    id="health_check"
)
async def health_check():
    """健康检查任务"""
    print("执行健康检查...")
```

---

## 12. 生命周期钩子

### 12.1 启动时执行 `on_startup`

```python
from ATRI.service import Service

plugin = Service("启动钩子", "生命周期示例", "1.0.0", Service.ServiceType.FUNCTION)

@plugin.on_startup
async def init_data():
    """插件启动时初始化数据"""
    print("插件正在启动...")
    # 初始化数据库连接、加载缓存等
```

### 12.2 卸载时执行 `on_unload`

```python
@plugin.on_unload
async def cleanup():
    """插件卸载时清理资源"""
    print("插件正在卸载...")
    # 关闭数据库连接、保存状态等
```

---

## 13. 高级特性

### 13.1 命令别名

```python
from ATRI.service import Service

plugin = Service("别名示例", "命令别名演示", "1.0.0", Service.ServiceType.FUNCTION)

# 支持多个命令触发同一个功能
help_cmd = plugin.on_command(
    cmd="帮助",
    docs="显示帮助信息",
    aliases={"help", "菜单", "功能列表"}  # 别名集合
)

@help_cmd.handle()
async def _():
    await help_cmd.finish("这是帮助信息")
# 现在 /帮助、/help、/菜单、/功能列表 都能触发
```

### 13.2 冷却时间

使用 NoneBot 的 Cooldown 中间件：

```python
from nonebot.adapters.onebot.v11.helpers import Cooldown
from ATRI.service import Service

plugin = Service("冷却示例", "冷却时间演示", "1.0.0", Service.ServiceType.FUNCTION)

daily = plugin.on_command("签到", "每日签到")

# 添加24小时冷却，提示自定义消息
@daily.handle([Cooldown(86400, prompt="今天已经签到过了，明天再来吧~")])
async def _():
    await daily.finish("签到成功！")
```

### 13.3 服务专属路径

使用 `get_path()` 获取插件专属存储目录：

```python
from ATRI.service import Service
import json

plugin = Service("数据存储", "数据持久化示例", "1.0.0", Service.ServiceType.FUNCTION)

# 获取插件专属目录（自动创建）
data_dir = plugin.get_path()

# 存储数据
def save_data(user_id: str, data: dict):
    file_path = data_dir / f"{user_id}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

# 读取数据
def load_data(user_id: str) -> dict:
    file_path = data_dir / f"{user_id}.json"
    if file_path.exists():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}
```

### 13.4 发送消息给主人

```python
from ATRI.service import Service

plugin = Service("通知示例", "通知功能演示", "1.0.0", Service.ServiceType.FUNCTION)

error_cmd = plugin.on_command("报错", "测试错误通知")

@error_cmd.handle()
async def _():
    # 发送错误报告给主人
    await Service.send_to_master("插件发生错误，请检查日志！")
    await error_cmd.finish("已通知管理员")
```

### 13.5 服务开关控制

```python
from ATRI.service import Service

# 设置 allow_switch(False) 表示此服务不可被用户开关
plugin = Service(
    "核心服务",
    "不可关闭的核心功能",
    "1.0.0",
    Service.ServiceType.SYSTEM
).allow_switch(False)
```

---

## 14. 完整实战示例

下面是一个综合了多个特性的完整插件示例：

```python
from random import choice
from nonebot.adapters.onebot.v11.helpers import Cooldown
from ATRI.service import Service
from ATRI.configs import PluginConfig, Field

# 定义配置
class FortuneConfig(PluginConfig):
    greetings = Field(
        type_=list,
        default=["早上好！", "中午好！", "晚上好！"],
        label="问候语列表",
        description="随机问候语"
    )
    max_uses = Field(
        type_=int,
        default=10,
        label="每日使用次数",
        description="每个用户每天可使用的次数",
        min=1,
        max=100
    )

# 创建服务
plugin = Service(
    "每日运势",
    "查询今日运势",
    "1.0.0",
    Service.ServiceType.ENTERTAINMENT,
    "开发者名字"
)

# 加载配置
config = FortuneConfig("每日运势")

# 主命令
fortune = plugin.on_command(
    cmd="运势",
    docs="查询今日运势",
    aliases={"今日运势", "运气"}
)

# 添加冷却时间（每小时一次）
@fortune.handle([Cooldown(3600, prompt="冷却中，请稍后再试~")])
async def _():
    greetings = config.get("greetings")
    message = choice(greetings)
    
    fortunes = ["大吉", "中吉", "小吉", "吉", "凶"]
    fortune_level = choice(fortunes)
    
    await fortune.finish(f"{message}\n今日运势：{fortune_level}")

# 关键词响应
keyword_resp = plugin.on_keyword(
    keywords={"倒霉", "运气差"},
    docs="安慰回应"
)

@keyword_resp.handle()
async def _():
    await keyword_resp.finish("别灰心，明天会更好的！")

# 启动时初始化
@plugin.on_startup
async def init():
    print("每日运势插件已启动")
```

---

## 15. 权限控制

ATRI 支持权限封装，典型代码：

```python
from ATRI.permission import ADMIN, MASTER

admin_cmd = plugin.on_command("禁言", "管理员禁言", permission=ADMIN)
master_cmd = plugin.on_command("重启", "重启机器人", permission=MASTER)
```

如果你想让命令只在某些条件下生效，可以配合 `rule()` 或自定义 rule 使用。

---

## 16. 真实开发建议

### 16.1 建议保持单一职责

一个插件最好只承担一类功能，例如：

- 计算类
- 查询类
- 娱乐类
- 管理类

不要把无关逻辑堆进同一个插件。

### 16.2 代码结构建议

```text
plugins/
└── mytool/
    ├── __init__.py      # 服务注册和命令入口
    ├── config.py        # 插件配置定义
    ├── utils.py         # 工具函数
    └── handlers.py      # 命令处理逻辑
```

如果插件逻辑较多，可以拆成多个模块，但入口文件中仍然要保留：

```python
plugin = Service(...)
```

### 16.3 先写最小可运行版

开发插件时，推荐顺序：

1. 先注册 `Service`
2. 再写 `on_command`
3. 再加最简单的 `handle`
4. 最后再补参数解析和业务逻辑

这样最不容易踩坑。

---

## 17. 总结

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

### 核心特性速查

| 特性 | API | 说明 |
|------|-----|------|
| 命令响应 | `on_command()` | 响应指定命令 |
| 关键词响应 | `on_keyword()` | 消息包含关键词时触发 |
| 正则响应 | `on_regex()` | 正则匹配消息时触发 |
| 通知响应 | `on_notice()` | 响应系统通知 |
| 请求响应 | `on_request()` | 响应好友/群请求 |
| 命令组 | `cmd_as_group()` | 创建子命令 |
| 主命令前缀 | `main_cmd()` | 统一命令前缀 |
| 插件配置 | `PluginConfig` + `Field` | 可配置化插件 |
| 计划任务 | `scheduler_jobs()` | 定时任务 |
| 启动钩子 | `on_startup` | 启动时执行 |
| 卸载钩子 | `on_unload` | 卸载时执行 |
| 冷却时间 | `Cooldown` | 命令冷却控制 |
| 专属路径 | `get_path()` | 插件数据目录 |
| 通知主人 | `send_to_master()` | 发送消息给主人 |

如果你已经掌握了这些特性，下一步就是进入 LK 插件开发，使用 `ATRI.system.lkbot` 提供的用户系统、背包、道具、商店和消息队列等能力。
