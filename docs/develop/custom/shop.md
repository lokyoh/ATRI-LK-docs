# 商店数据注册

## 自定义商店

### 代码内注册

``` python
from ATRI.system.lkbot.data.shop import Shop, shops

base_shop = Shop('基础商店', '亚托莉开的小店,专门售卖一些实用基础物品给客户使用。')
shops.register(base_shop)
```

### 外部文件加载

::: warning
修改core.yml文件请对修改后的文件进行备份，防止在更新后文件重置
:::

个人使用可在`/res/data/shop`文件夹下新建一个yaml文件，在其中填写相应数据即可。

::: warning
如果是插件添加自定义商店，请勿安装上述方法创建
:::

插件作者请在`/res/data/{your_plugin_name}/shop`该目录下新建yaml文件，并在插件内写入以下代码。

``` python
from ATRI import RES_DIR
from ATRI.system.lkbot.util import item_loading_event
from ATRI.system.lkbot.data.load_item import load_shops

@item_loading_event.handle()
def _():
    load_shops(RES_DIR / "data" / "{your_plugin_name}" / "shop" / "shop_data.yaml")
```

以下是填写示例:

``` yaml
基础商店:
  name: "基础商店" # 商店名称
  info: "亚托莉开的小店,专门售卖一些实用基础物品给客户使用。" # 商店介绍
# 可填写多个
```
