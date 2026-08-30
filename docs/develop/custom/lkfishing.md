# 钓鱼插件自定义数据

## 自定义鱼类与物品

### 个人自定义数据

如果只是为自己添加新的钓鱼内容，可以按下面步骤操作：

1. 在 `/res/data/lkfishing` 下找到对应分类文件夹：
   - `fish/`：鱼类数据
   - `bait/`：鱼饵数据
   - `rod/`：鱼竿数据
   - `tackle/`：钓具数据
   - `fishing_item/`：杂物/特殊掉落物数据
   - `treasure/`：宝藏掉落池数据
2. 在对应文件夹中创建新的 YAML 文件，例如：
   - `/res/data/lkfishing/fish/my_fish.yml`
   - `/res/data/lkfishing/bait/my_bait.yml`
3. 在新文件中按“字典键 + 配置项”的格式写入数据。
4. 不要直接修改 `core.yml` 中原本的配置内容；插件会遍历整个目录，读取所有 YAML 文件。

> 这是与 `lkfarm` 相同的思路：自定义内容放在对应目录下的独立 YAML 文件中，不改动内置的 `core.yml`。

### 插件自定义数据

::: warning
当前插件的官方数据加载逻辑只会读取 `res/data/lkfishing` 里的本地 YAML 文件；并没有像 `lkfarm` 那样公开的“插件注册加载接口”。
:::

因此，当前阶段：

- 个人用户可以按本节说明自行添加数据
- 其他插件直接接入自定义钓鱼内容仍需等待插件更新或根据源代码自行扩展

---

## 数据目录说明

钓鱼数据目录结构如下：

```text
/res/data/lkfishing/
  bait/
    core.yml
  fish/
    core.yml
  fishing_item/
    core.yml
  rod/
    core.yml
  tackle/
    core.yml
  treasure/
    core.yml
```

插件会在启动时执行以下逻辑：

- `load_fish_data()`：读取 `fish/` 下所有 YAML 文件
- `load_bait_data()`：读取 `bait/` 下所有 YAML 文件
- `load_fishing_rod_data()`：读取 `rod/` 下所有 YAML 文件
- `load_fishing_tackle_data()`：读取 `tackle/` 下所有 YAML 文件
- `load_treasure_data()`：读取 `treasure/` 下所有 YAML 文件

每个文件的内容都是一个顶层字典，键名是唯一的配置 ID，值为对应对象的数据。

---

## fish：鱼类配置

`fish/` 下每个 YAML 实际上是类似下面这样的结构：

```yaml
my_fish:
  name: "金鲫鱼"
  description: "一种在湖边常见的金色小鱼。"
  price: 120
  position:
    - "river"
    - "lake"
  time:
    start: 4
    end: 19
  season:
    - "spring"
    - "summer"
  weather:
    - "sun"
  size:
    min: 12
    max: 58
  xp: 20
  difficulty: 55
  weight: 65
```

### 字段说明

- `name`：鱼名，最终会注册为物品名
- `description`：鱼的说明
- `price`：出售价格
- `position`：可钓鱼的位置，常见值：`river`、`lake`、`ocean`
- `time`：有效时间段，支持 `start` / `end`，跨夜时间段也支持
- `season`：有效季节，常见值：`spring`、`summer`、`fall`、`winter`
- `weather`：有效天气，常见值：`sun`、`rain`
- `size`：长度范围，`min` / `max`
- `xp`：钓到后的经验值
- `difficulty`：难度值，用于计算品质与鱼的稀有度
- `weight`：钓到该鱼的权重，影响出现概率

### 规则说明

- `time` 可以为 `~`，表示不限制时间
- `season` 可以为 `~`，表示不限制季节
- `weather` 可以为 `~`，表示不限制天气
- 位置可写多个，钓鱼时会按 `position` 分配到不同区域

---

## bait：鱼饵配置

```yaml
my_bait:
  name: "特制鱼饵"
  description: "能更快地吸引鱼上钩。"
  time: 8
  quality: 100
  price: 30
```

### 字段说明

- `name`：鱼饵名
- `description`：说明
- `time`：减少等待时间的值
- `quality`：提升鱼品质的值
- `price`：商店售价

> 在源码中，`Bait` 仅读取 `name`、`description`、`time`、`quality`，并不会额外添加复杂效果。

---

## rod：鱼竿配置

```yaml
my_rod:
  name: "自定义钓竿"
  description: "耐久度较高的中级钓竿。"
  durable: 150
  time: 2
  quality: 25
  price: 1200
```

### 字段说明

- `name`：鱼竿名称
- `description`：说明
- `durable`：耐久值
- `time`：缩短等待时间的值
- `quality`：提升鱼品质的值
- `price`：商店价格

---

## tackle：渔具配置

```yaml
my_tackle:
  name: "高级鱼钩"
  description: "帮助提升咬钩和宝藏几率的渔具。"
  durable: 80
  waiting_time: 3
  fishi_quality: 15
  reaction_time: 2
  treasure_chance: 150
  fishi_chance: 0.08
  price: 400
```

### 字段说明

- `durable`：耐久度
- `waiting_time`：缩短咬钩等待时间
- `fishi_quality`：提升鱼品质
- `reaction_time`：提升收线反应时间上限
- `treasure_chance`：增加宝藏掉落概率
- `fishi_chance`：增加成功咬钩概率
- `price`：商店价格

> 这些字段会在 `FishingTackle` 中读取，且会影响钓鱼成功率、宝藏率和品质概率。

---

## fishing_item：杂物 / 非鱼类物品配置

```yaml
my_item:
  name: "河流塑料"
  description: "被河水冲刷到岸边的塑料碎片。"
  type: "其他"
  price: 5
  position:
    - "river"
    - "lake"
  xp: 1
  weight: 80
```

### 字段说明

- `name`：物品名
- `description`：介绍
- `type`：物品类型，源码中默认使用 `ItemType(item_data[key].get('type', '其他'))`
- `price`：售价
- `position`：出现地点
- `xp`：经验
- `weight`：掉落权重

### 注意事项

- 如果你不清楚 `type` 的可选值，可以直接用 `"其他"`
- 这类条目会被当做“非鱼类物品”随机掉落，不参与品质系统

---

## treasure：宝藏掉落池配置

宝藏配置不是单独的“物品”数据，而是“宝藏池”数据，可以指定掉落项与概率。

```yaml
rare_drop:
  items:
    - "高级鱼饵"
    - "金钓竿"
  nums:
    - 2
    - 1
  chance: 25
```

或者简写为单一掉落：

```yaml
common_drop:
  items: "基础鱼钩"
  nums: 1
  chance: 60
```

### 字段说明

- `items`：掉落的物品名称；可为单个字符串，也可为列表
- `nums`：数量；可为单个整数，也可与 `items` 一一对应的列表
- `chance`：掉落权重/概率值，源码中会按此计算宝藏池中各项的概率分配

> `treasure_manager` 会先按 `chance` 拼接候选列表，再随机生成宝藏内容，因此是“宝藏池”而不是单一奖品。

---

## 完整自定义示例

例如创建 `/res/data/lkfishing/fish/my_fish.yml`：

```yaml
my_fish:
  name: "月夜鲈"
  description: "在月光下异常活跃的淡水鱼。"
  price: 160
  position:
    - "lake"
    - "river"
  time:
    start: 18
    end: 4
  season:
    - "fall"
    - "winter"
  weather:
    - "rain"
  size:
    min: 24
    max: 80
  xp: 24
  difficulty: 60
  weight: 40
```

创建 `/res/data/lkfishing/bait/my_bait.yml`：

```yaml
moon_bait:
  name: "月光鱼饵"
  description: "附带微光的优质鱼饵。"
  time: 10
  quality: 120
  price: 40
```

创建 `/res/data/lkfishing/rod/my_rod.yml`：

```yaml
moon_rod:
  name: "月光钓竿"
  description: "月光打造的高级钓竿。"
  durable: 200
  time: 3
  quality: 30
  price: 2500
```

这些都不会影响原本的 `core.yml`；插件加载时会一起读取并注册到游戏中。

---

## 常见问题

### 1. 为什么不能直接修改 `core.yml`？

因为插件在加载时会遍历整个目录，`core.yml` 是默认配置文件；直接修改它会使后续更新时产生冲突，也不利于自定义拓展。

### 2. 目录里有哪些可自定义项？

- 鱼：`fish/`
- 鱼饵：`bait/`
- 鱼竿：`rod/`
- 渔具：`tackle/`
- 杂物：`fishing_item/`
- 宝藏：`treasure/`

### 3. 我该如何命名 YAML 文件？

文件名本身没有强制要求，通常建议使用英文小写和下划线，例如：

- `my_fish.yml`
- `special_bait.yml`
- `rare_treasure.yml`

只要对应目录中能被读取即可。

---

## 总结

`lkfishing` 的自定义方式与 `lkfarm` 的思路基本一致：

- 不直接改 `core.yml`
- 在对应目录创建新 YAML 文件
- 文件内按唯一键名 + 配置字段写入数据
- 通过目录遍历自动注册到钓鱼系统

如果你需要继续扩展为“插件自定义数据”，那就需要在源代码中额外编写对应的加载入口；当前官方源代码未提供这一层开放接口。
