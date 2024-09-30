# 插件开发
如果需要机器人本体提供的功能可查阅[ATRI提供的功能](../develop/atri.md)与[LK插件提供的功能](../develop/lkbot.md).

## 符合`ATRI-LK`规范的插件
### 1. 如何创建一个能够让ATRI识别的插件
首先在`plugins`目录下创建一个`plugin_name.py`文件或者一个`plugin_name`软件包。

在`plugin_name.py`或`plugin_name/__init__.py`中输入以下代码便可以创建一个ATRI能够识别的插件。

```` python
from ATRI.service import Service

service_name = Service("服务名").document("服务介绍").type(Service.ServiceType.TYPENAME).version('1.0.0')
````

> `Service.ServiceType.TYPENAME`中的`TYPENAME`并不存在,请自行改为自己想要的类型。

> 服务的更多属性值请参考[服务属性](../develop/atri.md)

### 2. 为服务添加功能
在创建完一个名为`service_name`的服务后,便可以为其添加`事件响应器（Matcher）`来实现功能的添加。

以下为添加一个名为`service_name`的类型为`on_command`的`事件响应器`代码,通过`事件响应器`实现功能。
```` python
service_name = service_name.on_command(cmd="指令名称", docs="指令介绍")
````
> 更多匹配方式请参考[事件响应器](../develop/atri.md)

> ATRI插件依然也支持原版的`事件响应器`,但不能在服务菜单中找到。

### 3. 实现功能
后续插件功能的实现与`NoneBot`插件的实现一致。请参考[官方文档](https://nonebot.dev/docs/tutorial/create-plugin)学习插件编写。

## 从`ATRI`移植
原版ATRI插件依然可用，但插件类型会成为默认值`其他插件`。从原版ATRI插件进行移植只需要进行以下修改即可。

```` python
# 原来的服务
service = Service("服务名").document("服务介绍").set_other_attribute(args,)
# 新的服务
service = Service("服务名").document("服务介绍").type(Service.ServiceType.TYPENAME).version('1.0.0').set_other_attribute(args,)
````

## 从其他nonebot插件移植
待补充

## 实战教学

[ATRI插件](../develop/course/plugin.md)

[LK插件附属插件](../develop/course/lkplugin.md)

## 自定义数据
- [lk农场](../develop/custom/lkfarm.md)
