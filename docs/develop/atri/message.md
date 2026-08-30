# 消息构建模块说明

本文档面向开发者，说明 `ATRI.message` 模块如何在项目中封装 OneBot 消息构造与批量发送逻辑，提升消息输出的可读性和复用性。

## 模块定位

消息相关代码位于：

- `ATRI/message.py`

它主要提供：

- `MessageBuilder`：链式消息拼接器
- `MessageGroup`：消息分批发送容器
- `PageMessage`：分页消息拼接器
- 图片、语音、文件消息转换工具函数

---

## 1. 设计目标

这个模块本质上是对 NoneBot 的原生消息对象做了一层更便捷的封装。它不是为了替代原生消息对象，而是为了让开发者在项目中更容易写出：

```python
msg = MessageBuilder().text("你好").at(123456).done()
```

而不是手工拼接复杂结构体。

这样做的好处包括：

- 发送消息更简洁
- 组合多个消息段更自然
- 统一图片/语音/文件创建方式
- 支持分页消息输出

---

## 2. `MessageBuilder`

```python
class MessageBuilder(Message):
```

它继承自 `nonebot.adapters.onebot.v11.message.Message`，因此本质上仍然是一个 OneBot 消息对象，只是扩充了便捷方法。

### 2.1 `text()`

```python
def text(self, text: str) -> "MessageBuilder":
    if len(self) != 0 and self[-1].type == "text":
        text = "\n" + text
    self.append(MessageSegment.text(text))
    return self
```

作用：

- 追加文本消息
- 若上一段也是文本，则在前面加换行，增强可读性

### 2.2 `at()`

```python
def at(self, user_id: Union[int, str]) -> "MessageBuilder":
    self.append(MessageSegment.at(user_id))
    return self
```

作用：

- 添加 `@` 消息段
- 适用于聊天场景中的提醒或提醒某人回复

### 2.3 `face()`

```python
def face(self, id_: int) -> "MessageBuilder":
    self.append(MessageSegment.face(id_))
    return self
```

作用：

- 插入 QQ 表情消息段

### 2.4 `image()`

```python
def image(
    self,
    file: Union[str, bytes, BytesIO, Path],
    type_: Optional[str] = None,
    cache: bool = True,
    proxy: bool = True,
    timeout: Optional[int] = None,
) -> "MessageBuilder":
```

作用：

- 追加图片消息
- 兼容文件路径、二进制数据、BytesIO、Path 等多种输入

### 2.5 `reply()`

```python
def reply(self, id_: int) -> "MessageBuilder":
    self.append(MessageSegment.reply(id_))
    return self
```

作用：

- 追加回复消息段
- 通常用于回引用用户发送的原消息

### 2.6 `auto_append()`

```python
def auto_append(self, message: MessageSegment | str) -> "MessageBuilder":
    if type(message) is str:
        self.text(message)
    else:
        self.append(message)
    return self
```

它允许把字符串和消息段两种类型统一接入构建器。

### 2.7 `done()`

```python
def done(self) -> str:
    return str().join(map(str, self))
```

它会把消息段转为纯文本字符串输出，适合需要最终文本化的场景。

---

## 3. 使用示例

```python
from ATRI.message import MessageBuilder

msg = (
    MessageBuilder()
    .text("你好，世界")
    .at(123456)
    .text("请查收消息")
)

print(msg)
```

输出类似：

```python
["你好，世界", At(123456), "请查收消息"]
```

也可以直接用：

```python
await matcher.send(
    MessageBuilder().text("查询完成").text("结果如下").done()
)
```

---

## 4. `MessageGroup`

```python
class MessageGroup:
    def __init__(self):
        self.message_list = []
```

这个结构用于存放一组消息，然后分条发送。典型做法是：

```python
msg_group = MessageGroup()
msg_group.add_message("第一条")
msg_group.add_message("第二条")
await msg_group.send_message(matcher)
```

### 4.1 `add_message()`

```python
def add_message(self, message: str | MessageSegment | Message | MessageBuilder):
    self.message_list.append(message)
    return self
```

允许混合不同种类的消息对象。 

### 4.2 `send_message()`

```python
async def send_message(self, matcher: Type[Matcher]):
    for m in self.message_list:
        await matcher.send(m)
        sleep(1)
```

它会逐条发送，并在每条发送后休眠 1 秒，防止消息发送过快导致刷屏或被风控。

这一点对群消息很实用，尤其是长列表输出时。

---

## 5. `PageMessage`

```python
class PageMessage:
```

用于把一大组项目分页展示成多条消息。它以模板方式拼接页头、页脚和每页内容。

### 5.1 构造方式

```python
PageMessage(
    item_list=["A", "B", "C", ...],
    header="标题\n--------------------\n",
    footer="--------------------\n页数:{page} 共:{i}/{num}",
    content="{i:02d}.{item}",
    page_num=20,
)
```

### 5.2 关键思路

它会：

- 在 `page_num` 之内累计内容
- 达到每页上限后，前一页先写入消息组
- 继续下一页拼接
- 最后把尾页也塞进消息组里

最终通过：

```python
await page.send_message(matcher)
```

逐页发送，适合列表类输出。

---

## 6. 媒体消息辅助函数

### 6.1 `img_msg()`

```python
def img_msg(file: str | bytes | BytesIO | Path) -> MessageSegment:
    return MessageSegment.image(file)
```

### 6.2 `img_msg_from_path()`

```python
def img_msg_from_path(path: str | Path) -> MessageSegment:
    with open(path, "rb") as image_file:
        return img_msg(image_file.read())
```

### 6.3 `rec_msg()`

```python
def rec_msg(file: str | bytes | BytesIO | Path) -> MessageSegment:
    return MessageSegment.record(file)
```

### 6.4 `rec_msg_from_path()`

```python
def rec_msg_from_path(path: str | Path) -> MessageSegment:
    with open(path, "rb") as audio_file:
        audio_data = audio_file.read()
    base64_encoded_audio = base64.b64encode(audio_data).decode('utf-8')
    return rec_msg(f'base64://{base64_encoded_audio}')
```

这些函数的意义是：

- 对图片/语音数据统一做转换
- 兼容路径和二进制对象
- 方便直接发送多媒体消息

---

## 7. 文件消息：`file_msg()`

```python
def file_msg(name: str, data: bytes):
    return MessageSegment(
        'file',
        {
            "name": name,
            "file": f'base64://{base64.b64encode(data).decode('utf-8')}'
        }
    )
```

它用于把二进制文件转成 OneBot 的 `file` 消息类型，常用于：

- 发送文件
- 上传附件
- 返回静态文件数据

---

## 8. 开发建议

### 8.1 消息拼接优先用构建器

推荐尽量使用：

```python
MessageBuilder().text("ok").at(123).done()
```

而不要手工拼字符串，原因是：

- 更稳定
- 更容易维护
- 更符合消息段抽象

### 8.2 长消息分批发送

当消息内容较多时：

- 优先使用 `MessageGroup`
- 或者使用 `PageMessage`
- 这样更容易避免过长消息被压缩或刷屏

### 8.3 多媒体文件尽量走路径/bytes统一入口

对于图片和音频，建议统一通过 `img_msg_from_path()` 或 `rec_msg_from_path()` 等函数处理，尽量避免多处手工编码。

---

## 9. 总结

`ATRI.message` 是消息输出层的实用工具集。它并不试图取代 `nonebot` 原生消息对象，而是在其基础上提供：

- 更简洁的构造方式
- 更统一的数据转换入口
- 分批发送和分页发送支持
- 一整套多媒体消息辅助函数

因此，它是项目中消息发送逻辑最直接、最常用的基础工具之一。

