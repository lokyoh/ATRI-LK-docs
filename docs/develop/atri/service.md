# serivce模块

## class Service
集成一套服务管理, 对功能信息持久化

### 构造参数:
- (必须)service: str
- (可选)docs: str
- (可选)version: str
- (可选)type: ServiceType

### 枚举 class ServiceType
- SYSTEM = "系统服务"
- LKPLUGIN = "LK服务"
- FUNCTION = "功能性服务"
- ENTERTAINMENT = "娱乐服务"
- GAME = "游戏服务"
- SUBSCRIBE = "订阅服务"
- OTHER = "其他服务"
- CLOSED = "已关闭的服务"
- HIDDEN = "隐藏服务"

### def document
- 参数：context：服务说明
- 说明：为服务添加说明
- 返回：该服务对象

### def type

### def version

### def rule

### def permission

## class ServiceTools

## def is_in_service
- 参数：service：服务名
- 说明：判断ATRI是否拥有指定服务
- 返回：Rule对象
