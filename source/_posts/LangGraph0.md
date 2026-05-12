---
title: LangGraph 核心概念
tags: 
    - LangGraph
    - 笔记
    - LLM
categories:
    - 笔记
description: Hello world this is fanfer's Blog!
top_img: /assets/background.JPG
cover: https://cdn.prod.website-files.com/65b8cd72835ceeacd4449a53/667b080e4b3ca12dc5d5d439_Langgraph%20UI-2.webp
---
# 核心概念

LangGraph 的核心是将代理工作流程建模为图表。您可以使用三个关键组件定义代理的行为：

1. [`State`](https://langchain-ai.github.io/langgraph/concepts/low_level/#state)：表示应用程序当前快照的共享数据结构。它可以是任何 Python 类型，但通常是`TypedDict`或 Pydantic `BaseModel`。
2. [`Nodes`](https://langchain-ai.github.io/langgraph/concepts/low_level/#nodes)：对代理逻辑进行编码的 Python 函数。它们接收当前值`State`作为输入，执行一些计算或副作用，并返回更新的`State`。
3. [`Edges](https://langchain-ai.github.io/langgraph/concepts/low_level/#edges)Node`：根据当前情况确定下一步执行哪个操作的 Python 函数`State`。它们可以是条件分支或固定转换。

通过组合`Nodes`和`Edges`，您可以创建复杂的循环工作流，使工作流随时间推移而演变`State`。然而，真正的强大之处在于 LangGraph 如何管理工作流`State`。需要强调的是：`Nodes`和`Edges`只不过是 Python 函数 - 它们可以包含 LLM 或只是好的 Python 代码。

## 状态[¶](https://langchain-ai.github.io/langgraph/concepts/low_level/#state)

定义图形时要做的第一件事是定义`State`图形的。`State`由[图形的模式](https://langchain-ai.github.io/langgraph/concepts/low_level/#schema)以及指定如何将更新应用于状态的[`reducer`函数](https://langchain-ai.github.io/langgraph/concepts/low_level/#reducers)`State`组成。模式将是图形中所有`Nodes`和的输入模式`Edges`，可以是`TypedDict`或`Pydantic`模型。

输入输出可以是不同的类型

首先创建一个`StateGraph`。`StateGraph`对象将我们的聊天机器人的结构定义为“状态图”。我们将添加`nodes`以表示我们的聊天机器人可以调用的 llm 和函数，并`edges`指定机器人应如何在这些函数之间转换。

```python
from typing import Annotated

from typing_extensions import TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class State(TypedDict):
    # Messages have the type "list". The `add_messages` function
    # in the annotation defines how this state key should be updated
    # (in this case, it appends messages to the list, rather than overwriting them)
    messages: Annotated[list, add_messages]

graph_builder = StateGraph(State)
```

Reducer 是理解节点更新如何应用于`State` 的关键。 中的每个键`State`都有自己独立的 Reducer 函数。 如果未明确指定 Reducer 函数，则假定对该键的所有更新都应覆盖它。 Reducer 有几种不同的类型，首先是默认类型的 Reducer：

### **默认 Reducer[¶](https://langchain-ai.github.io/langgraph/concepts/low_level/#default-reducer)**

这两个示例展示了如何使用默认的 Reducer：

**示例 A：**

```python
from typing_extensions import TypedDict

class State(TypedDict):
    foo: int
    bar: list[str]
```

在此示例中，未为任何键指定任何 Reducer 函数。我们假设图的输入是`{"foo": 1, "bar": ["hi"]}`。然后我们假设第一个`Node`返回`{"foo": 2}`。这被视为对状态的更新。请注意，`Node`不需要返回整个`State`架构 - 只需返回更新。应用此更新后，`State`将是`{"foo": 2, "bar": ["hi"]}`。如果第二个节点返回，`{"bar": ["bye"]}`则将`State`是`{"foo": 2, "bar": ["bye"]}`

**示例 B：**

```python
from typing import Annotated
from typing_extensions import TypedDict
from operator import add

class State(TypedDict):
    foo: int
    bar: Annotated[list[str], add]
```

在这个例子中，我们使用了Annotated类型为第二个键（bar）指定一个归约函数（operator.add）。注意，第一个键保持不变。假设图的输入是{"foo": 1, "bar": ["hi"]}。然后假设第一个节点返回{"foo": 2}。这被视为对状态的更新。请注意，节点不需要返回整个State模式——只需更新即可。在应用此更新后，状态将变为{"foo": 2, "bar": ["hi"]}。如果第二个节点返回{"bar": ["bye"]}，那么状态将变为{"foo": 2, "bar": ["hi", "bye"]}。这里要注意的是，通过将两个列表相加来更新bar键。

add_messages(left: Messages, right: Messages) -> Messages ¶
合并两条消息列表，通过ID更新现有消息。

默认情况下，这确保状态是“仅追加”，除非新消息与现有消息具有相同的ID。

参数：

left (Messages) – 基础消息列表。
right (Messages) – 要合并到基础列表中的消息（或单个消息）列表。
返回值：

Messages – 一个新的消息列表，其中包含从right合并到left的消息。
Messages – 如果right中的一条信息与left中的一条信息具有相同的ID，
Messages – 则来自right的信息将替换来自left的信息。

## 节点[¶](https://langchain-ai.github.io/langgraph/concepts/low_level/#nodes)

在 LangGraph 中，节点通常是 Python 函数（sync 或`async`），其中**第一个**位置参数是[状态](https://langchain-ai.github.io/langgraph/concepts/low_level/#state)，并且（可选）**第二个**位置参数是“config”，包含可选的[可配置参数](https://langchain-ai.github.io/langgraph/concepts/low_level/#configuration)（例如`thread_id`）。

```python
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-3-5-sonnet-20240620")

def chatbot(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

# The first argument is the unique node name
# The second argument is the function or object that will be called whenever
# the node is used.
graph_builder.add_node("chatbot", chatbot)
```

在后台，函数被转换为[RunnableLambda](https://api.python.langchain.com/en/latest/runnables/langchain_core.runnables.base.RunnableLambda.html#langchain_core.runnables.base.RunnableLambda)

`Runnable` 对象的特点包括：

1. **可执行性**：`Runnable` 对象可以被调用来执行某些操作。
2. **类型多样性**：可以是同步函数、异步函数、生成器函数、异步生成器函数等。
3. **工具绑定**：可以绑定工具来扩展其功能。
4. **链式操作**：可以通过管道操作符 `|` 将多个 `Runnable` 对象组合在一起。
5. **配置支持**：可以接受配置参数来定制其行为。

以下是一个示例代码，展示了如何定义和使用 `Runnable` 对象：

```python
from langchain_core.runnables import Runnable, RunnableLambda
from typing import Callable, Any

# 定义一个简单的同步函数
def simple_function(input: Any) -> Any:
    return f"Processed: {input}"

# 将函数转换为 Runnable 对象
simple_runnable = RunnableLambda(simple_function)

# 调用 Runnable 对象
result = simple_runnable.invoke("Test Input")
print(result)  # 输出: Processed: Test Input

```

这个示例展示了如何将一个简单的函数转换为 `Runnable` 对象，并调用它来处理输入。

补充

### 同步函数

同步函数是最常见的函数类型，它们按顺序执行代码，直到完成所有操作。调用同步函数时，程序会等待函数执行完毕后再继续执行后续代码。

```python
def sync_function():
    return "This is a synchronous function"

```

### 异步函数

异步函数使用 `async` 关键字定义，允许在执行过程中暂停并等待其他操作完成（例如 I/O 操作），而不阻塞整个程序。调用异步函数时，返回一个 `coroutine` 对象，需要使用 `await` 关键字等待其完成。

```python
import asyncio

async def async_function():
    await asyncio.sleep(1)
    return "This is an asynchronous function"

```

### 生成器函数

生成器函数使用 `yield` 关键字返回一个生成器对象，可以在迭代过程中逐步生成值，而不是一次性返回所有值。生成器函数在每次 `yield` 时暂停，并在下一次迭代时继续执行。

```python
def generator_function():
    yield "This is"
    yield "a generator"
    yield "function"

```

### 异步生成器函数

异步生成器函数结合了异步函数和生成器函数的特性，使用 `async` 和 `yield` 关键字定义。它们可以在异步迭代过程中逐步生成值。

```python
async def async_generator_function():
    yield "This is"
    await asyncio.sleep(1)
    yield "an asynchronous"
    await asyncio.sleep(1)
    yield "generator function"

```

## 边[¶](https://langchain-ai.github.io/langgraph/concepts/low_level/#edges)

边定义了逻辑的路由方式以及图决定停止的方式。这是代理如何工作以及不同节点如何相互通信的重要组成部分。有几种主要的边类型：

- 普通边：直接从一个节点到下一个节点。
- 条件边：调用一个函数来确定下一步要去哪个节点。
- 入口点：用户输入到达时首先调用哪个节点。
- 条件入口点：调用一个函数来确定当用户输入到达时首先调用哪个节点。

一个节点可以有多个传出边。如果一个节点有多个传出边，则**所有**这些目标节点都将作为下一个超级步骤的一部分并行执行。