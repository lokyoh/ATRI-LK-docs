---
layout: doc
title: 准备工作
---

# 准备工作

::: danger 注意
开始安装前请确保你有一个灵活的脑子
:::

::: danger 注意
ATRI 不支持 nb-cli 控制，请勿使用 nb-cli 操作 ATRI
:::

## 环境准备

::: danger 注意
请确保你的 Python 版本保持在该范围：**>= 3.10**
:::

为了让 ATRI 稳定运行，我们使用了虚拟环境（[Poetry](https://python-poetry.org/)）：
```shell
pip install poetry
```

为了保证 ATRI 所有的功能正常运行，我们**强烈建议**将 ATRI 移至 `outside of mainland` 运行。

## ATRI 本体准备

### 通过 Git 获取 ATRI
> 网络状态良好的建议,可随时更新至最新版本,更新插件也采用`git`更新

在任一你喜欢的目录下键入：
```shell
git clone https://github.com/lokyoh/ATRI-LK.git
```

### 通过其它方法获取 ATRI(请手动更新)

> 这种方式无法使用更新插件

1. 进入 [ATRI 主仓库](https://github.com/lokyoh/ATRI-LK)
2. 点击显眼的**绿色**按钮：`Code`
3. 在出现的菜单中找到 `Download ZIP` 并点击
4. 下载完成后解压至任一你喜欢的目录
