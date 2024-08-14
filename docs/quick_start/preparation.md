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

在任一你喜欢的目录下键入：
```shell
git clone https://github.com/lokyoh/ATRI-LK.git
```

### 通过其它方法获取 ATRI

1. 进入 [ATRI 主仓库](https://github.com/lokyoh/ATRI-LK)
2. 点击显眼的**绿色**按钮：`Code`
3. 在出现的菜单中找到 `Download ZIP` 并点击
4. 下载完成后解压至任一你喜欢的目录

## 预先配置

如果处于没有浏览器或不想配置的可直接跳过。

如果想改变浏览器选择，使用任意文本编辑器打开`.env.prod`文件，然后参考以下内容。

`.env.prod`文件提供了Windows环境自带的`msedge`的注释，直接去除`# `使用即可，如果需要其他的修改请参考以下配置。

```ini
# 默认情况 可不写
htmlrender_browser = "chromium"
# 使用 firefox
htmlrender_browser = "firefox"

# 下载 playwright 代理地址 可不写
htmlrender_download_host = ""

# 浏览器自定代理地址 可不写
htmlrender_proxy_host = "http://127.0.0.1:7890"

# 浏览器 channel 支持以下
# "chrome", "chrome-beta", "chrome-dev", "chrome-canary",
# "msedge", "msedge-beta", "msedge-dev", "msedge-canary"
# 手动编辑可以直接使用系统自带浏览器而不用重新下载 chromium
# 可不写
htmlrender_browser_channel = ""
```