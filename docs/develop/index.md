# 插件开发

如果需要机器人本体提供的功能可查阅[ATRI提供的功能](../develop/atri.md)、[Agent智能体模块](../develop/agent.md)与[LK插件提供的功能](../develop/lkbot.md).

## 符合`ATRI-LK`规范的插件

### 1. 如何创建一个能够让ATRI识别的插件

首先在`plugins`目录下创建一个`plugin_name.py`文件或者一个`plugin_name`软件包。

在`plugin_name.py`或`plugin_name/__init__.py`中输入以下代码便可以创建一个ATRI能够识别的插件。

```` python
from ATRI.service import Service

service_name = Service("服务名").document("服务介绍").set_type(Service.ServiceType.TYPENAME).version('1.0.0')
````

或者：

```` python
from ATRI.service import Service

service_name = Service(
    "服务名"
    "服务介绍"
    '1.0.0'
    Service.ServiceType.TYPENAME
)
````

> `Service.ServiceType.TYPENAME`中的`TYPENAME`并不存在,请自行改为自己想要的类型。  
> 服务的更多属性值请参考[服务属性](../develop/atri.md)

### 2. 为服务添加功能

在创建完一个名为`service_name`的服务后,便可以为其添加`事件响应器（Matcher）`来实现功能的添加。

以下为添加一个名为`matcher_name`的类型为`on_command`的`事件响应器`代码,通过`事件响应器`实现功能。

```` python
matcher_name = service_name.on_command(cmd="指令名称", docs="指令介绍")
````

> 更多匹配方式请参考[事件响应器](../develop/atri.md)  
> ATRI插件依然也支持原版的`事件响应器`,但不能在服务菜单中找到。

### 3. 实现功能

后续插件功能的实现与`NoneBot`插件的实现一致。请参考[官方文档](https://nonebot.dev/docs/tutorial/create-plugin)学习插件编写。

### 4. 插件配置（YHN-LK0-024 新增）

从 YHN-LK0-024 版本开始，插件配置系统进行了完全重构，使用新的 `PluginConfig` + `Field` API 替代旧的 Pydantic BaseModel 方式。

**新方式（推荐）：**

```python
from ATRI.service import Service
from ATRI.configs import PluginConfig, Field

class MyPluginConfig(PluginConfig):
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
        description="最大处理数量限制",
        min=1,
        max=1000
    )

plugin = Service("我的插件", "插件说明", "1.0.0", Service.ServiceType.ENTERTAINMENT)
config = MyPluginConfig("我的插件")
```

**Field 参数说明：**

- `type_`: 字段类型（`bool`, `int`, `float`, `str`, `list`, `dict`）
- `default`: 默认值
- `label`: 前端显示的标签
- `description`: 字段描述
- `min` / `max`: 数值范围限制（仅数字类型）
- `options`: 选项列表（用于下拉选择）
- `children`: 子字段（用于嵌套配置）

**访问配置：**

```python
# 读取配置
enabled = config.get("enabled")
max_count = config.get("max_count")

# 修改配置
config.set("enabled", False)
config.set("max_count", 200)
```

详细文档请参考 [PluginConfig 配置系统](../develop/atri/configs.md#插件配置)。

## 从`ATRI`移植

原版ATRI插件依然可用，但插件类型会成为默认值`其他插件`。从原版ATRI插件进行移植只需要进行以下修改即可。

```` python
# 原来的服务
service = Service("服务名").document("服务介绍").set_other_attribute(args,)
# 新的服务
service = Service("服务名").document("服务介绍").set_type(Service.ServiceType.TYPENAME).version('1.0.0').set_other_attribute(args,)
````

## 从其他nonebot插件移植

待补充

## 实战教学

[ATRI插件](../develop/course/plugin.md)

[LK插件附属插件](../develop/course/lkplugin.md)

## 自定义数据

- [物品数据及其使用方法注册](../develop/custom/item.md)
- [商店数据注册](../develop/custom/shop.md)
- [农场插件自定义数据](../develop/custom/lkfarm.md)
- [钓鱼插件自定义数据](../develop/custom/lkfishing.md)
