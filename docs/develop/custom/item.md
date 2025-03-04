# 物品数据及其使用方法注册

## 自定义物品

### 代码内注册物品

使用以下代码定义一个物品

``` python
from ATRI.system.lkbot.data.item import Item, items， ItemType

items.register(
  Item(
    '物品名', # 物品类型
    ItemType.OTHER, # 物品类型，具体可选项见ItemType
    '物品介绍', # 物品介绍
    0, # 物品出售价格，0为不可出售
    ItemFuncs # (选填)物品在使用时执行的函数对象，类型为`ATRI.system.lkbot.data.item_func.ItemFuncs`
  )
)
```

也可以在定义完物品后注册使用方法

``` python
item.set_use_funcs(my_item_funcs) # 参数类型为`ATRI.system.lkbot.data.item_func.ItemFuncs`
```

### 外部文件加载

::: warning
修改core.yml文件请对修改后的文件进行备份，防止在更新后文件重置
:::

个人使用可在`/res/data/item`文件夹下新建一个yaml文件，在其中填写相应数据即可。

::: warning
如果是插件添加自定义商店，请勿安装上述方法创建
:::

插件作者请在`/res/data/{your_plugin_name}/item`该目录下新建yaml文件，并在插件内写入以下代码。

``` python
from ATRI import RES_DIR
from ATRI.system.lkbot.util import item_loading_event
from ATRI.system.lkbot.data.load_item import load_items

@item_loading_event.handle()
def _():
    load_items(RES_DIR / "data" / "{your_plugin_name}" / "item" / "item_data.yaml")
```

以下是填写示例:

``` yaml
一次经验双倍卡:
  name: "一次经验双倍卡" # 物品名
  type: "道具" # 物品类型，可选值:工具,道具,种子,蔬菜,水果,花,货币,其他。除此之外请参考源代码添加
  info: "使用后获得一次经验双倍" # 物品介绍
  price: 100 # 物品出售价格
  shop: # 上架商店(可选)，也可写成非列表形式
    - name: "基础商店" # 商店名称
      price: 200 # 售卖价格
      type: "ATRI币" # 货币类型
  func: # 物品使用时执行的方法列表
    checks: # 检查器，负责检查用户是否符合使用情况，通过便会使用该物品
      - name: exp_mul_check # 方法名称，下同理
        args: # 方法参数，下同理
          multiplier: 200
    funcs: # 执行器，负责在检查器执行完后执行使用后的操作
      - name: exp_mul
        args:
          multiplier: 200
          times: 1
```

### 插件作者注册物品

## 自定义使用方法的注册

目前只能在通过代码添加

``` python
from ATRI.system.lkbot.data.item_func import item_funcs

item_funcs.add_check(func1) # 注册检查器，使用时通过该方法的方法名来添加该检查器
item_funcs.add_func(func2) # 注册执行器，使用时通过该方法的方法名来添加该执行器
```
