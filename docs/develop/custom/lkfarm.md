# lk农场插件自定义数据

## 自定义作物

### 个人自定义作物

如果只是为自己添加自定义作物，则可以安照一下步骤执行：

1. 请在`/res/lkfarm/Crop`文件夹下新建对应作物英文名的文件夹
2. 将所需图片文件放入其中，作物名为对应文件夹英文名

    - 作物名.png 为作物产品图片，要求48*48像素
    - 作物名_Seeds.png 为作物种子图片，要求48*48像素
    - 作物名_Stage_1.png 为作物各阶段生长的图片，从1开始对应各个阶段，要求48*72像素

3. 在该文件夹内创建[data.yml](../custom/lkfarm.md#data-yml)，具体内容点击查看

### 插件自定义作物

::: warning
如果是插件添加自定义作物，请勿安装上述方法创建
:::

请按照以下步骤创建:

1. 按照个人自定义作物的方法在`/res/data/{your_plugin_name}/Crop`中进行操作
2. 在自己的代码内添加以下语句

``` python
from ATRI import RES_DIR
from ATRI.system.lkbot.util import item_loading_event

from plugins.lkfarm.system.crop import load_crop_data

@item_loading_event.handle()
def _():
    load_crop_data(your_plugin_name, RES_DIR / "data" / "{your_plugin_name}" / "Crop")
```

### data.yml

以下时该文件书写示例

``` yaml
name: "防风草" # 作物名称
intro: "一种和胡萝卜很相似的春季块茎植物。它营养丰富且带有泥土的气息。" # 作物介绍
season: "春季" # 作物生长季节，可选项:"春季","夏季","秋季","冬季","春夏两季","夏秋两季","春夏秋三季","全季"。除此之外请参考源代码添加
type: "蔬菜" # 作物种类，可选项:"蔬菜","水果","花","种子"。除此之外请参考源代码添加
exp: 8 # 作物收获获得的经验值
price:
    crop: 35 # 作物产品价格
    seed: 20 # 作物种子加载，价格为0时不会上架种子商店
    seed_sell: 10 # 作物种子售卖价格
growth:
    stage: [1, 1, 1, 1] # 作物个成长阶段天数
    lasting: 0 # 作物在收获后需要多少天可以再次收获，0表示采摘后结束生长
harvest_list: [["防风草"],[100]] # 作物收获后的收获列表，第一个列表为产物，第二个列表为概率要求大于0小于等于100，两个列表一一对应
```
