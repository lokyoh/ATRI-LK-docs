# 配置系统说明

本文档面向开发者，解释 `ATRI.configs` 模块如何负责项目的全局配置、默认配置创建、配置版本校验，以及插件配置的加载与保存。

## 模块定位

配置相关代码位于：

- `ATRI/configs/__init__.py`
- `ATRI/configs/config.py`
- `ATRI/configs/create.py`
- `ATRI/configs/models.py`
- `ATRI/configs/plugin_config.py`

其中，`ATRI.configs.__init__` 对外导出了：

```python
from .config import Config
from .plugin_config import PluginConfig, plugin_config
```

也就是说，项目中通常通过以下方式访问配置入口：

```python
from ATRI.configs import Config, PluginConfig
```

---

## 1. 全局配置入口：`Config`

`Config` 类定义在 `ATRI/configs/config.py`，用于加载并校验项目主配置文件。典型用法如下：

```python
from pathlib import Path
from ATRI.configs import Config

config = Config(Path("config.yml"))
```

### 1.1 初始化逻辑

`Config.__init__` 会进行以下操作：

1. 读取目标配置文件 `config_path`。
2. 如果文件不存在，则调用 `init_config(config_path, default_config_path)` 生成默认配置。
3. 读取默认模板 `res/default_config.yml` 与当前配置文件。
4. 对比 `ConfigVersion`，判断版本是否兼容。
5. 如不兼容，则自动备份旧配置并退出启动流程。
6. 通过 Pydantic 模型 `ConfigModel.model_validate(self.config)` 做结构校验。

关键代码逻辑：

```python
if not config_path.is_file():
    init_config(config_path, _DEFAULT_CONFIG_PATH)
    sleep(3)

raw_conf = yaml.safe_load(_DEFAULT_CONFIG_PATH.read_bytes())
conf = yaml.safe_load(config_path.read_bytes())

r_c_v = raw_conf.get("ConfigVersion")
c_v = conf.get("ConfigVersion")
```

### 1.2 版本兼容处理

`Config` 的版本控制并不是简单“只要存在就行”，而是非常严格：

- 只允许主版本和次版本相同。
- 若不同，认为配置已废弃，自动复制 `config.yml` 到 `config_backup.yml` 并删除原文件。
- 若 `ConfigVersion` 仅存在小版本差异，则进行升级补丁处理：

```python
if r_c_v != c_v:
    shutil.copy2(config_path, config_path.with_name('config_backup.yml'))
    self.config_model.ConfigVersion = r_c_v
    self.save_conf()
```

这样可以防止配置文件因结构变化而直接出错，确保项目在升级时保留历史配置。

### 1.3 运行时配置

`Config.get_runtime_conf()` 会将配置转换成运行时所需字段。它使用 `BotConfig` 进行校验，然后返回一个最小运行时字典：

```python
return RuntimeConfig(
    host=bot_conf.host,
    port=bot_conf.port,
    debug=bot_conf.debug,
    superusers=bot_conf.superusers,
    nickname=bot_conf.nickname,
    onebot_access_token=bot_conf.access_token,
    command_start=bot_conf.command_start,
    command_sep=bot_conf.command_sep,
    session_expire_timeout=bot_conf.session_expire_timeout,
).model_dump()
```

这意味着：

- 运行时不直接操作原始 YAML
- 运行时以结构化对象或字典形式使用配置
- 对字段形态做统一约束，减少误用

---

## 2. 默认配置生成：`init_config()`

`create.py` 中的 `init_config(conf_path, default_conf_path)` 用于首次启动时，交互式生成 `config.yml`。

### 2.1 生成流程

它会依次询问用户：

- Bot 监听地址 / 端口
- 超级用户列表
- access_token
- 代理配置
- Playwright 浏览器设置
- WebUI 登录用户名与密码
- 其他必要配置

并在最后把占位符替换到默认模板：

```python
raw_conf = default_conf_path.read_text("utf-8")
raw_conf = raw_conf.replace("{host}", str(host))
raw_conf = raw_conf.replace("{port}", str(port))
raw_conf = raw_conf.replace("{superusers}", str(superusers.split(",")))
raw_conf = raw_conf.replace("{access_token}", access_token)
```

最后写入配置文件：

```python
with open(conf_path, "w", encoding="utf-8") as w:
    w.write(raw_conf)
```

### 2.2 设计要点

这是一个“交互式初始化器”，而不是静态模板；它的价值是：

- 降低开发者或部署者的配置门槛
- 让第一次启动更稳定
- 统一生成配置结构，避免错误的 YAML 拼接

### 2.3 交互式输入工具

`Console.input()` 封装了标准输入与校验逻辑：

- 缺省值回填
- 类型转换
- 错误提示
- 允许回车使用默认值

例如：

```python
port = console.input(
    "Bot 对外开放的端口 (Port). 范围建议: 10000-60000 (默认: 20000)",
    "20000",
    int,
    "输入不正确 示例: 20000",
)
```

这类辅助函数让配置初始化过程更容易维护，也更符合 CLI 程序体验。

---

## 3. 配置模型：`models.py`

配置模型使用 Pydantic 的 `BaseModel`，并由 `ATRI.utils.model.BaseModel` 扩展。

### 3.1 模型结构

```python
class BotConfig(BaseModel):
    host: str
    port: int
    debug: bool
    superusers: list
    nickname: list
    command_start: list
    command_sep: list
    session_expire_timeout: int
    access_token: str
    proxy: str
    request_timeout: int
```

```python
class BrowsConfig(BaseModel):
    browser: str
    download_host: str
    proxy_host: str
    browser_channel: str
```

```python
class WebUIConfig(BaseModel):
    username: str = 'admin'
    password: str = Field(default_factory=lambda: gen_random_str(8))
    secret: str = Field(default_factory=lambda: gen_random_str(8))
```

```python
class ConfigModel(BaseModel):
    ConfigVersion: str
    BotConfig: BotConfig
    BrowsConfig: BrowsConfig
    WebUIConfig: Annotated[WebUIConfig, Field(default=WebUIConfig())]
```

### 3.2 设计意义

这里把 YAML 配置“结构化”为对象模型，优点是：

- 自动校验字段类型
- 避免配置中出现错误类型
- 便于在运行时访问 `config_model.BotConfig.port`
- 更便于后续字段增加和兼容处理

### 3.3 运行时模型

```python
class RuntimeConfig(BaseModel):
    host: str
    port: int
    debug: bool
    superusers: list
    nickname: list
    onebot_access_token: str
    command_start: list
    command_sep: list
    session_expire_timeout: int
```

这个模型用于最终启动框架时的真正运行时参数，偏简化版，避免把全部 WebUI 和浏览器参数混进运行阶段。

---

## 4. 默认配置模板：`res/default_config.yml`

默认配置模板位于：

`ATRI/res/default_config.yml`

示例如下：

```yaml
# 设置参考文档: https://lokyoh.github.io/ATRI-LK-docs/config.html
ConfigVersion: "1.1.1"

BotConfig:
  host: "{host}"
  port: {port}
  debug: false
  superusers: {superusers}
  nickname: [ "亚托莉", "ATRI" ]
  command_start: [ "/" ]
  command_sep: [ "." ]
  session_expire_timeout: 60
  access_token: ""
  proxy: "{proxy}"
  request_timeout: 30

BrowsConfig:
  browser: "{browser}"
  download_host: "{download_host}"
  proxy_host: "{proxy_host}"
  browser_channel: "{browser_channel}"

WebUIConfig:
  username: "{username}"
  password: "{password}"
  secret: "{secret}"
```

### 字段说明

#### `BotConfig`

- `host`：Bot 监听地址
- `port`：监听端口
- `debug`：调试开关
- `superusers`：管理员列表
- `nickname`：机器人昵称列表
- `command_start`：命令前缀列表
- `command_sep`：命令分隔符列表
- `session_expire_timeout`：会话过期时间
- `access_token`：协议层鉴权令牌
- `proxy`：代理地址
- `request_timeout`：请求超时时间

#### `BrowsConfig`

- `browser`：浏览器内核
- `download_host`：Playwright 下载代理
- `proxy_host`：浏览器代理
- `browser_channel`：浏览器通道

#### `WebUIConfig`

- `username`：WebUI 登录用户名
- `password`：WebUI 登录密码
- `secret`：WebUI 签名/Session 密钥

---

## 5. 插件配置：`PluginConfig`

`plugin_config.py` 中提供了插件级别配置管理。其核心目标是：

- 每个插件都可以拥有自己的配置模型
- 配置自动写入对应 JSON 文件
- 支持读取、修改、缓存和重新加载

### 5.1 入口对象

```python
plugin_config = {}
```

这是全局插件配置注册表，键是 service 名称，值是 `PluginConfig` 实例。

### 5.2 类定义

```python
class PluginConfig:
    def __init__(self, service: str, model: Type[BaseModel]):
        self.model = model
        self.path = PLUGIN_CONFIG_DIR / f"{service}_config.json"
```

说明：

- `service`：服务名
- `model`：插件配置对应的 Pydantic 模型
- `path`：配置文件路径，通常位于插件配置目录

### 5.3 自动创建配置

若配置文件不存在，则创建目录并写入默认模型实例：

```python
if not os.path.exists(self.path):
    os.makedirs(os.path.dirname(self.path), exist_ok=True)
    self.change_config(self.model())
```

这意味着插件开发者只需编写模型，即可直接生成相应 JSON 配置文件。

### 5.4 读取与保存

```python
def load_config(self):
    try:
        config = self.model.read_from_file(self.path)
    except Exception as e:
        ...
        config = self.model()
```

`load_config()` 会尝试从磁盘恢复配置对象；如果失败，则回退为初始默认模型实例。

### 5.5 修改配置

```python
def change_config(self, value: BaseModel | None = None):
    if value is None:
        self._config.write_into_file(self.path)
    else:
        value.write_into_file(self.path)
        self.load_config()
```

这个方法可以：

- 直接把当前内存配置写回磁盘
- 或者传入新模型对象并立即持久化

### 5.6 获取实例

```python
@classmethod
def get(cls, service: str) -> "PluginConfig | None":
    if service in plugin_config:
        return plugin_config[service]
    else:
        return None
```

用于在其他位置读取某个服务的插件配置对象。

---

## 6. 服务如何接入插件配置

在 `ATRI/service.py` 中，`Service` 提供了两种关键方法：

```python
def plugin_config(self) -> PluginConfig | None:
    return PluginConfig.get(self.service)


def add_plugin_config(self, model: type[BaseModel]) -> PluginConfig:
    return PluginConfig(self.service, model)
```

也就是说，服务初始化时可以如此写：

```python
from ATRI.service import Service
from ATRI.utils.model import BaseModel


class HelpConfig(BaseModel):
    enable: bool = True
    max_history: int = 20


plugin = Service("帮助")
help_config = plugin.add_plugin_config(HelpConfig).config()
```

使用方式：

```python
# 读取配置
cfg = plugin.plugin_config().config()

# 修改配置
cfg.enable = False
plugin.plugin_config().change_config(cfg)
```

这个机制使插件配置真正成为“服务级硬件”，而不仅仅是散落的常量。

---

## 7. 设计原则

从实现上看，配置系统遵循以下几个关键设计思路：

1. 结构化配置
   - 使用 YAML + Pydantic 模型结构化
   - 避免分散的裸字典访问

2. 版本兼容
   - 通过 `ConfigVersion` 控制升级兼容
   - 旧配置自动备份

3. 交互式初始化
   - 首次启动自动引导生成配置
   - 降低开发者和部署者门槛

4. 插件隔离
   - 每个服务可有独立配置文件
   - 插件配置与全局配置完全解耦

5. 运行时最小依赖
   - 运行时只取需要的字段
   - 配置对象不必在所有调用中乱传

---

## 8. 开发建议

### 8.1 新增配置字段时

新增配置字段时，需要同时关注：

- `res/default_config.yml` 模板
- `ATRI/configs/models.py` 中的模型定义
- 读取配置的业务代码是否仍兼容旧配置

### 8.2 插件配置时

建议优先使用 `PluginConfig` + `BaseModel` 的方式，而不要直接写死 JSON 字典，原因是：

- 类型更稳定
- 更方便进行校验
- 代码更清晰、可维护

### 8.3 处理旧配置

如果你改动了配置结构，务必：

- 增加合适的 `ConfigVersion`
- 在读取时兼容旧字段
- 在必要时输出升级提示

---

## 9. 典型使用例子

### 9.1 读取全局配置

```python
from pathlib import Path
from ATRI.configs import Config

config = Config(Path("config.yml"))
print(config.config_model.BotConfig.host)
print(config.config_model.WebUIConfig.username)
```

### 9.2 读取运行时配置

```python
runtime = config.get_runtime_conf()
print(runtime["host"])
print(runtime["port"])
```

### 9.3 插件配置

```python
from ATRI.service import Service
from ATRI.utils.model import BaseModel


class DemoConfig(BaseModel):
    enabled: bool = True
    timeout: int = 10


svc = Service("demo")
pconf = svc.add_plugin_config(DemoConfig)

cfg = pconf.config()
print(cfg.enabled)
```

---

## 10. 总结

`ATRI.configs` 不只是“读写 YAML”这么简单，它是整个项目启动流程中的关键基础模块。它统一了：

- 默认配置生成
- 全局配置加载
- 配置版本检查
- 结构校验
- 插件级配置管理

因此，无论是开发新功能、扩展插件，还是维护部署环境，都需要对这套配置体系保持清晰理解。

如果需要继续扩展配置系统，建议优先保持“模板-模型-加载-校验-序列化”这条链路一致，避免配置变更遗漏导致运行时异常。

