---
title: RAG从零开始构建教程0-4
tags: 
    - LLM
    - RAG
categories:
    - LLM
description:
date: 2024-6-4 11:48:16
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/c566957c-a8ef-41a9-9b78-e089d35cf0b7.png
---

# RAG从零开始构建教程：概述

这些教程将指导您从零开始构建RAG（检索增强生成）应用。

通过这些内容，您将对RAG的整体架构有更全面的理解，如下图所示：

![Screenshot 2024-03-25 at 8.30.33 PM.png](https://picture.fanfer.top/img/c566957c-a8ef-41a9-9b78-e089d35cf0b7.png)

## 环境配置

`(1) 依赖包安装`

```python
! pip install langchain_community tiktoken langchain-openai langchainhub chromadb langchain
```

`(2) LangSmith配置`

详见：https://docs.smith.langchain.com/

```python
import os
os.environ['LANGCHAIN_TRACING_V2'] = 'true'
os.environ['LANGCHAIN_ENDPOINT'] = 'https://api.smith.langchain.com'
os.environ['LANGCHAIN_API_KEY'] = <你的API密钥>
```

`(3) API密钥配置`

```python
os.environ['OPENAI_API_KEY'] = <你的OpenAI-API密钥>
```

## 第一部分：概述
 
[RAG快速入门](https://python.langchain.com/docs/use_cases/question_answering/quickstart)

```python
import bs4
from langchain import hub
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.vectorstores import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

#### 索引部分 ####

# 加载文档
loader = WebBaseLoader(
    web_paths=("https://lilianweng.github.io/posts/2023-06-23-agent/",),
    bs_kwargs=dict(
        parse_only=bs4.SoupStrainer(
            class_=("post-content", "post-title", "post-header")
        )
    ),
)
docs = loader.load()

# 文本分割
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
splits = text_splitter.split_documents(docs)

# 嵌入处理
vectorstore = Chroma.from_documents(documents=splits, 
                                    embedding=OpenAIEmbeddings())

retriever = vectorstore.as_retriever()

#### 检索和生成部分 ####

# 提示模板
prompt = hub.pull("rlm/rag-prompt")

# 语言模型
llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)

# 后处理
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# 构建Chain
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# 提问测试
rag_chain.invoke("什么是任务分解？")
```

## 第二部分：索引

![Screenshot 2024-02-12 at 1.36.56 PM.png](https://picture.fanfer.top/img/d1c0f19e-1f5f-4fc6-a860-16337c1910fa.png)

```python
# 示例文档
question = "我喜欢什么宠物？"
document = "我最喜欢的宠物是猫。"
```

[Token计数](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb) 考虑 [约4个字符/token](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)

```python
import tiktoken

def num_tokens_from_string(string: str, encoding_name: str) -> int:
    """计算文本字符串中的token数量"""
    encoding = tiktoken.get_encoding(encoding_name)
    num_tokens = len(encoding.encode(string))
    return num_tokens

num_tokens_from_string(question, "cl100k_base")
```

[文本嵌入模型](https://python.langchain.com/docs/integrations/text_embedding/openai)

```python
from langchain_openai import OpenAIEmbeddings
embd = OpenAIEmbeddings()
query_result = embd.embed_query(question)
document_result = embd.embed_query(document)
len(query_result)
```

对于OpenAI嵌入，推荐使用[余弦相似度](https://platform.openai.com/docs/guides/embeddings/frequently-asked-questions)（1表示完全相同）。

```python
import numpy as np

def cosine_similarity(vec1, vec2):
    dot_product = np.dot(vec1, vec2)
    norm_vec1 = np.linalg.norm(vec1)
    norm_vec2 = np.linalg.norm(vec2)
    return dot_product / (norm_vec1 * norm_vec2)

similarity = cosine_similarity(query_result, document_result)
print("余弦相似度:", similarity)
```

[文档加载器](https://python.langchain.com/docs/integrations/document_loaders/)

```python
#### 索引部分 ####

# 加载博客
import bs4
from langchain_community.document_loaders import WebBaseLoader
loader = WebBaseLoader(
    web_paths=("https://lilianweng.github.io/posts/2023-06-23-agent/",),
    bs_kwargs=dict(
        parse_only=bs4.SoupStrainer(
            class_=("post-content", "post-title", "post-header")
        )
    ),
)
blog_docs = loader.load()
```

[文本分割器](https://python.langchain.com/docs/modules/data_connection/document_transformers/recursive_text_splitter)

> 这是推荐用于通用文本的分割器。它通过一系列字符参数化。它会按顺序尝试在这些字符上进行分割，直到块的大小足够小。默认字符列表是["\n\n", "\n", " ", ""]。这样做的效果是尽可能保持所有段落（然后是句子，再然后是单词）在一起，因为这些通常是语义关联最强的文本片段。

```python
# 分割
from langchain.text_splitter import RecursiveCharacterTextSplitter
text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    chunk_size=300, 
    chunk_overlap=50)

# 执行分割
splits = text_splitter.split_documents(blog_docs)
```

[向量存储](https://python.langchain.com/docs/integrations/vectorstores/)

```python
# 建立索引
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
vectorstore = Chroma.from_documents(documents=splits, 
                                    embedding=OpenAIEmbeddings())

retriever = vectorstore.as_retriever()
```

## 第三部分：检索

```python
# 索引
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
vectorstore = Chroma.from_documents(documents=splits, 
                                    embedding=OpenAIEmbeddings())

retriever = vectorstore.as_retriever(search_kwargs={"k": 1})
```

```python
docs = retriever.get_relevant_documents("什么是任务分解？")
```

```python
len(docs)
```

## 第四部分：生成

![Screenshot 2024-02-12 at 1.37.38 PM.png](https://picture.fanfer.top/img/f9b0e284-58e4-4d33-9594-2dad351c569a.png)

```python
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

# 提示模板
template = """仅基于以下上下文回答问题：
{context}

问题：{question}
"""

prompt = ChatPromptTemplate.from_template(template)
prompt
```

```python
# 语言模型
llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
```

```python
# 构建Chain
chain = prompt | llm
```

```python
# 运行
chain.invoke({"context":docs,"question":"什么是任务分解？"})
```

```python
from langchain import hub
prompt_hub_rag = hub.pull("rlm/rag-prompt")
```

```python
prompt_hub_rag
```

[RAG chains文档](https://python.langchain.com/docs/expression_language/get_started#rag-search-example)

```python
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

rag_chain.invoke("什么是任务分解？")
```
