# 加载模块说明

本文档面向开发者，说明 `ATRI.load` 模块如何负责插件扫描、依赖检查、系统插件加载以及启动流程编排。

## 模块定位

加载相关代码位于：

- `ATRI/load.py`

它的职责包括：

- 扫描 `plugins/` 目录中的插件
- 解析各插件的 `requirements.txt`
- 自动安装缺失依赖
- 通过 `nonebot.load_plugins()` 加载插件
- 初始化系统模块与事件触发器
- 绑定启动生命周期钩子

---

## 1. 总体流程

`ATRI.load` 模块本质上是项目的启动装载器，负责把系统和插件按顺序推入框架运行环境中。关键入口函数有：

```python
def load_plugins():
    ...


def load_system():
    ...


def load_atri():
    ...
```

调用顺序大致为：

```python
load_atri()
```

随后内部会依次执行：

1. `load_system()`
2. `load_plugins()`
3. 注册驱动启动回调

---

## 2. 依赖解析：`parse_requirement_line()`

```python
def parse_requirement_line(line: str) -> tuple[str, str] | None:
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    if line.startswith("-"):
        return None

    match = re.match(r"^([a-zA-Z0-9_-]+(?:\[[a-zA-Z0-9_-]+])?)([=<>!~]+.*)?$", line)
    if match:
        package_name = match.group(1)
        base_name = re.sub(r"\[.*]", "", package_name)
        version = match.group(2) or "latest"
        return base_name.lower(), version
    return None
```

它的作用是将一行 `requirements.txt` 解析成：

```python
("requests", ">=2.31.0")
```

或者：

```python
("pandas", "latest")
```

### 处理逻辑说明

- 忽略空行和注释行
- 忽略 `-r`、`-e` 等命令行参数
- 支持 `==`、`>=`、`<=`、`~= `、`!=` 等版本约束
- 会移除可选依赖 `package[extra]` 的后缀，使用基础包名

这个函数是插件依赖自动安装的第一步。

---

## 3. 检查已安装包：`check_package_installed()`

```python
def check_package_installed(package_name: str, installed_packages: list[dict]) -> bool:
    package_name = package_name.lower()
    for pkg in installed_packages:
        if pkg["name"].lower() == package_name:
            return True
    return False
```

它会遍历 `PackageManager.list_installed()` 的结果，判断某个依赖是否已经安装。

这个逻辑的作用是减少重复安装，并让插件启动更稳。

---

## 4. 插件依赖加载：`load_plugins()`

```python
def load_plugins():
    log.debug("开始加载插件并检查依赖...")
    pm = PackageManager()
    installed_packages = pm.list_installed()
    plugins_dir = Path("plugins")
    if not plugins_dir.exists():
        log.warning(f"插件目录不存在：{plugins_dir}")
        return
```

### 4.1 扫描插件目录

它会遍历 `plugins/` 下的所有目录：

```python
for item in plugins_dir.iterdir():
    if not item.is_dir() or item.name.startswith("_"):
        continue
```

也就是：

- 只处理文件夹
- 过滤掉以下划线开头的目录
- 例如 `_test` 等临时目录不参与正式加载

### 4.2 读取插件依赖

如果某个插件目录存在 `requirements.txt`：

```python
requirements_file = item / "requirements.txt"
if requirements_file.exists():
```

它会读取文件内容并逐行处理：

```python
with open(requirements_file, "r", encoding="utf-8") as f:
    lines = f.readlines()
```

然后解析出：

- `plugin_packages`：该插件的依赖列表
- `missing_packages`：当前环境缺失的依赖列表

### 4.3 自动安装缺失依赖

```python
if missing_packages:
    log.info(f"开始为插件 {item.name} 安装依赖：{missing_packages}")
    success, message = pm.install(missing_packages)
```

安装成功后：

```python
installed_packages = pm.list_installed()
```

这保证后续插件仍可以正常加载。

### 4.4 记录依赖关系

```python
for package_name in plugin_packages:
    if package_name not in package_requirements:
        package_requirements[package_name] = []
    package_requirements[package_name].append(item.name)
```

这里维护一个全局映射：

```python
package_requirements = {
    "pandas": ["demo_plugin", "another_plugin"],
    ...
}
```

它表示：

- 某个 Python 包被哪些插件所依赖
- 后续可为插件依赖分析、维护和诊断提供依据

### 4.5 加载插件

最终：

```python
nonebot.load_plugins("plugins")
nonebot.load_plugins("plugins/rss")
```

这里加载了：

- 主插件目录 `plugins`
- 特别的 `plugins/rss` 子目录

这说明项目对插件目录本身并不是完全统一加载，而是有个例外处理。

---

## 5. 系统模块加载：`load_system()`

```python
def load_system():
    import ATRI.adapter  # noqa: F401
    from ATRI.event.register import register_triggers

    register_triggers()
    nonebot.load_plugins("ATRI/system")
```

它主要做了三件事：

### 5.1 导入适配器

```python
import ATRI.adapter
```

这一步是为了确保适配器模块执行其初始化逻辑，并将协议能力挂载到 NoneBot。

### 5.2 注册系统事件触发器

```python
from ATRI.event.register import register_triggers
register_triggers()
```

这里注册：

- 每日更新任务
- 心跳事件任务

也就是说，系统级定时任务并不是在业务代码中散落，而是集中在事件注册入口中。

### 5.3 加载系统插件

```python
nonebot.load_plugins("ATRI/system")
```

这部分通常是框架本身的内置功能模块，例如：

- 状态管理
- WebAPI
- 帮助
- 管理端

---

## 6. 启动入口：`load_atri()`

```python
def load_atri():
    load_system()
    load_plugins()
    from ATRI.service import driver_startup

    driver().on_startup(driver_startup)
```

它负责整个项目的启动顺序：

1. 先加载系统模块
2. 再加载插件模块
3. 在驱动启动时注册 `driver_startup`

### 6.1 `driver_startup` 作用

`driver_startup` 来自 `ATRI.service`，它用于服务启动后的初始化逻辑，例如：

- 注册服务
- 绑定事件 matcher
- 建立状态层
- 运行启动时处理函数

这说明项目采用的是“启动前装载 + 启动后初始化”的模式。

---

## 7. 与 NoneBot 的耦合

这个模块依赖 `nonebot`：

```python
import nonebot
```

并在多个地方调用：

```python
nonebot.load_plugins("plugins")
nonebot.load_plugins("ATRI/system")
```

这里说明 ATRI 不是独立的应用框架，而是基于 NoneBot 的插件化机器人工程。`ATRI.load` 负责把项目模块和插件接入 NoneBot 的加载体系中。

这一层很关键，因为整个项目的命令、事件和服务都是在 NoneBot 运行环境中建立起来的。

---

## 8. 开发者视角下的工作方式

在开发扩展功能时，通常需要理解以下工作流：

1. 把插件目录放到 `plugins/` 下
2. 编写该插件的 `requirements.txt`
3. 启动时由 `load_plugins()` 自动扫描
4. 缺失依赖会通过 `PackageManager` 安装
5. 插件随后会被 `nonebot.load_plugins()` 注册

如果新增一个内置系统模块，通常放入：

```python
ATRI/system/
```

并在系统加载阶段由 `load_system()` 触发。

---

## 9. 现实意义

这个模块的意义在于：

- 它把“插件化加载”变成自动化流程
- 它降低了开发和部署时的依赖管理成本
- 它把系统模块和扩展插件统一纳入同一启动流程
- 它是整个项目从“代码存在”到“可运行”之间的关键桥接层

---

## 10. 开发建议

### 10.1 插件依赖管理

建议插件作者：

- 把所有必要依赖写进 `requirements.txt`
- 使用明确版本约束
- 避免在代码中隐式依赖全局环境

### 10.2 目录命名

插件目录建议避免以下划线开头，原因是在 `load_plugins()` 中被显式过滤：

```python
if not item.is_dir() or item.name.startswith("_"):
    continue
```

### 10.3 启动顺序不要随意改动

`load_system()` 在前、`load_plugins()` 在后是一种合理顺序，因为：

- 系统模块往往提供基础能力
- 插件依赖系统环境和事件总线
- 运行时启动钩子应该在所有模块准备完成后再挂载

---

## 11. 总结

`ATRI.load` 是项目的装载中枢。它不是单纯负责“导入模块”，而是整合了：

- 插件发现
- 依赖解析
- 自动安装
- 模块加载
- 系统初始化
- 启动钩子绑定

因此，理解这一层，对掌握 ATRI 的整体运行机制至关重要。开发者若要新增插件或扩展内置模块，首先应该从这里理解加载顺序和依赖规则。

