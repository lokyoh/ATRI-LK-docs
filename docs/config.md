---
layout: doc
title: 配置
---

# ATRI 配置

ATRI 在**初次启动**后会生成 `config.yml`，其为 ATRI 运行配置。还会生成一个 `.env.prod`，为 nonebot 插件配置。

::: warning
`config.yml` 遵循 YAML 语法，如果你不了解 YAML 语法，你可以在[这篇教程](https://www.runoob.com/w3cnote/yaml-intro.html)中学习。
:::

## 配置详细

打开位于**项目根目录**的 `config.yml`，你会得到如下内容：（此处展示的为示例填写）

::: details
```yaml
# 设置参考文档: https://lokyoh.github.io/ATRI-LK-docs/config.html
ConfigVersion: "1.0.0"

BotConfig:
  host: "127.0.0.1"
  port: 20000
  debug: false
  superusers: ["1145141919"]
  nickname: ["ATRI", "Atri", "atri", "亚托莉", "アトリ"]
  command_start: ["", "/"]
  command_sep: ["."]
  session_expire_timeout: 60
  access_token: ""
  proxy: ""
  request_timeout: 5

BrowsConfig:
  browser: "chromium"
  download_host: ""
  proxy_host: ""
  browser_channel: ""
```
:::

其中：
- ConfigVersion 为设置文件版本。**请勿更改**
- [BotConfig](#botconfig) 为 ATRI 主体设置。
- [BrowsConfig](#browsconfig) 为浏览器配置。

## 解析配置

### BotConfig

- host：监听地址/IP。
- port：监听端口，范围推荐 **10000-60000**。
- debug：是否启用调试模式。
- superusers：超级用户，又称为 ATRI 的主人/维护者，可填写多个。
- nickname：ATRI 的昵称，可填写多个。
- command_start：功能命令前缀，可填写多个。
- command_sep：功能命令分隔符，可填写多个。
- session_expire_timeout：功能索要信息超时时间，单位为秒。
- access_token：ATRI 同协议端（例如 gocqhttp）通信时的密钥。
- proxy：ATRI 运行时对外发送请求的代理，格式参考：`proxy: "http://127.0.0.1:8000"`。
- request_timeout：ATRI 运行时对外发送请求的超时时间，单位为秒。

### BrowsConfig:
- browser: 默认情况可不写,可选`firefox`
- download_host: 下载`playwright`代理地址。**可不写**
- proxy_host: 浏览器自定代理地址。**可不写**
- browser_channel: 浏览器 channel 支持以下`chrome`,`chrome-beta`,`chrome-dev`,`chrome-canary`,`msedge`,`msedge-beta`,`msedge-dev`,`msedge-canary`手动编辑可以直接使用系统自带浏览器而不用重新下载`chromium`。**可不写**
