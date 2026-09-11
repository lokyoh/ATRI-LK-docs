---
layout: doc
title: ATRI 配置
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
ConfigVersion: "1.1.2"

BotConfig:
  host: "127.0.0.1"
  port: 20000
  debug: false
  superusers: ["1145141919"]
  nickname: ["亚托莉", "ATRI"]
  command_start: ["/"]
  command_sep: ["."]
  session_expire_timeout: 60
  access_token: "atri"
  proxy: ""
  request_timeout: 30
  timezone: "Asia/Shanghai"

BrowsConfig:
  browser: "chromium"
  download_host: ""
  proxy_host: ""
  browser_channel: ""

WebUIConfig:
  username: "admin"
  password: "random_str"
  secret: "random_str"
```

:::

其中：

- ConfigVersion 为设置文件版本。**请勿更改**
- [BotConfig](#botconfig) 为 ATRI 主体设置。
- [BrowsConfig](#browsconfig) 为浏览器配置。

## 配置解析

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
- timezone：日期模块所采用的时区。

### BrowsConfig

- browser: 默认情况可不写,可选`firefox`
- download_host: 下载`playwright`代理地址。**可不写**
- proxy_host: 浏览器自定代理地址。**可不写**
- browser_channel: 浏览器 channel 支持以下`chrome`,`chrome-beta`,`chrome-dev`,`chrome-canary`,`msedge`,`msedge-beta`,`msedge-dev`,`msedge-canary`手动编辑可以直接使用系统自带浏览器而不用重新下载`chromium`。**可不写**

### WebUIConfig
- username: 登录用户名。默认值`admin`
- password: 登录密码。默认值为随机生成值
- secret: jwt密钥。默认值为随机生成值


## Agent配置

::: tip
如果有更多需求请提交issu或联系作者。
:::

### 模型配置

位置:`data\config\system\provider.yml`

默认配置:

::: details

```yaml
siliconflow:
  provider_name: siliconflow
  provider_type: openai
  url: https://api.siliconflow.cn/v1
  api_key: ""
  models:
  - name: siliconflow/DeepSeek-V4-Flash
    model: deepseek-ai/DeepSeek-V4-Flash
    temperature: 0.7
    type: chat
  - name: siliconflow/qwen3-vl-30
    model: Qwen/Qwen3-VL-30B-A3B-Instruct
    temperature: 0.7
    type: image
  - name: siliconflow/qwen3-30b
    model: Qwen/Qwen3-30B-A3B-Instruct-2507
    temperature: 0.3
    type: tool
```

:::

其中:

- provider_name 为模型供应商名称,用于区分不同供应商,不可相同
- provider_type 为模型api接口类型,目前仅支持`openai`与`gemini`
- url 为模型api请求地址
- api_key 为请求时的密钥
- models 为供应商提供的模型

模型配置:

- name 为模型名称,用于区分不同模型,不可相同
- model 为调用时使用的模型,由供应商提供,可相同
- temperature 为模型温度参数
- type 为模型类型,包含以下类型:`chat`:聊天模型;`image`:图片处理模型;`tool`:工具模型;`reasoning`:思考模型;`action`:实现模型;`language`:语言处理模型;`embedding`:嵌入模型.不过目前仅有前3中为在使用的模型类型

### 插件设置

位置:`data\config\plugins\agent_config.json`

默认配置:

::: details

```json
{
    "max_history": 20,
    "search": {
        "enable": false,
        "provider": "",
        "api_key": ""
    },
    "tts": {
        "enable": false,
        "model": "",
        "url": "",
        "voice_id": "",
        "api_key": ""
    },
    "embedding": {
        "enable": false,
        "model": "",
        "url": "",
        "api_key": ""
    }
}
```

:::

其中:

- max_history 为保留的历史对话数最大值
- search 为搜索配置
- tts 为文本转语言模型配置
- embedding 为向量化模型配置

search配置:

- enable 为是否启用搜索,否会没有搜索功能
- provider 为搜索供应商,目前仅支持`tavily`
- api_key 为请求时的密钥

tts配置:

- enable 为是否启用文本转语言
- model 为调用时使用的模型,由供应商提供
- url 为模型api请求地址
- voice_id 为模型请求时声音id
- api_key 为请求时的密钥

embedding配置:

- enable 为是否启用向量化模型,与长期记忆有关
- model 为调用时使用的模型,由供应商提供
- url 为模型api请求地址
- api_key 为请求时的密钥
