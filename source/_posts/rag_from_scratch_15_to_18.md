---
title: RAG从零开始构建教程15-18
tags: 
    - LLM
    - RAG
categories:
    - LLM
description:
date: 2024-7-21 15:48:16
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/c6ee3569-ca87-49b5-8f2c-21193230f8d4.png
---
# 从零开始的RAG：检索

![Screenshot 2024-03-25 at 8.23.58 PM.png](https://picture.fanfer.top/img/c6ee3569-ca87-49b5-8f2c-21193230f8d4.png)

## 环境

`(1) 包`

```python
! pip install langchain_community tiktoken langchain-openai langchainhub chromadb langchain cohere
```

`(2) LangSmith`

https://docs.smith.langchain.com/

```python
import os
os.environ['LANGCHAIN_TRACING_V2'] = 'true'
os.environ['LANGCHAIN_ENDPOINT'] = 'https://api.smith.langchain.com'
os.environ['LANGCHAIN_API_KEY'] = <your-api-key>
```

`(3) API 密钥`

```python
os.environ['OPENAI_API_KEY'] = <your-api-key>
os.environ['COHERE_API_KEY'] = <your-api-key>
```

## 第15部分：重新排序

我们之前在RAG-fusion中展示过这个。

![Screenshot 2024-03-25 at 2.59.21 PM.png](https://picture.fanfer.top/img/f0d70de3-4427-4849-a35f-92ab0e5e91cf.png)

```python
#### 索引 ####

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

# 分割
from langchain.text_splitter import RecursiveCharacterTextSplitter
text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    chunk_size=300, 
    chunk_overlap=50)

# 进行分割
splits = text_splitter.split_documents(blog_docs)

# 索引
from langchain_openai import OpenAIEmbeddings
# from langchain_cohere import CohereEmbeddings
from langchain_community.vectorstores import Chroma
vectorstore = Chroma.from_documents(documents=splits, 
                                    # embedding=CohereEmbeddings()
                                    embedding=OpenAIEmbeddings())


retriever = vectorstore.as_retriever()
```

```python
from langchain.prompts import ChatPromptTemplate

# RAG-Fusion
template = """你是一个有帮助的助手，可以根据单个输入查询生成多个搜索查询。\n
生成与以下内容相关的多个搜索查询：{question} \n
输出（4个查询）："""
prompt_rag_fusion = ChatPromptTemplate.from_template(template)
```

```python
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

generate_queries = (
    prompt_rag_fusion 
    | ChatOpenAI(temperature=0)
    | StrOutputParser() 
    | (lambda x: x.split("\n"))
)
```

```python
from langchain.load import dumps, loads

def reciprocal_rank_fusion(results: list[list], k=60):
    """ 互惠排名融合，接受多个排名文档列表和一个可选参数k用于RRF公式 """
    
    # 初始化一个字典以保存每个唯一文档的融合分数
    fused_scores = {}

    # 遍历每个排名文档列表
    for docs in results:
        # 遍历列表中的每个文档及其排名（在列表中的位置）
        for rank, doc in enumerate(docs):
            # 将文档转换为字符串格式以用作键（假设文档可以序列化为JSON）
            doc_str = dumps(doc)
            # 如果文档尚未在fused_scores字典中，则以初始分数0添加
            if doc_str not in fused_scores:
                fused_scores[doc_str] = 0
            # 检索文档的当前分数（如果有）
            previous_score = fused_scores[doc_str]
            # 使用RRF公式更新文档的分数：1 / (rank + k)
            fused_scores[doc_str] += 1 / (rank + k)

    # 根据融合分数按降序对文档进行排序，以获得最终重新排名的结果
    reranked_results = [
        (loads(doc), score)
        for doc, score in sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
    ]

    # 返回重新排名的结果，作为包含文档及其融合分数的元组列表
    return reranked_results

question = "What is task decomposition for LLM agents?"
retrieval_chain_rag_fusion = generate_queries | retriever.map() | reciprocal_rank_fusion
docs = retrieval_chain_rag_fusion.invoke({"question": question})
len(docs)
```

```python
from operator import itemgetter
from langchain_core.runnables import RunnablePassthrough

# RAG
template = """根据以下上下文回答问题：

{context}

问题：{question}
"""

prompt = ChatPromptTemplate.from_template(template)

llm = ChatOpenAI(temperature=0)

final_rag_chain = (
    {"context": retrieval_chain_rag_fusion, 
     "question": itemgetter("question")} 
    | prompt
    | llm
    | StrOutputParser()
)

final_rag_chain.invoke({"question":question})
```

我们还可以使用[Cohere Re-Rank](https://python.langchain.com/docs/integrations/retrievers/cohere-reranker#doing-reranking-with-coherererank)。

请参阅[这里](https://txt.cohere.com/rerank/)：

![data-src-image-387e0861-93de-4823-84e0-7ae04f2be893.png](https://picture.fanfer.top/img/f46d29d0-e1a2-4c09-8b65-d7f5b675209d.png)

```python
from langchain_community.llms import Cohere
from langchain.retrievers import  ContextualCompressionRetriever
from langchain.retrievers.document_compressors import CohereRerank
```

```python
from langchain.retrievers.document_compressors import CohereRerank

retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# 重新排序
compressor = CohereRerank()
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor, base_retriever=retriever
)

compressed_docs = compression_retriever.get_relevant_documents(question)
```

## 16 - 检索 (CRAG)

`深入探讨`

https://www.youtube.com/watch?v=E2shqsYwxck

`笔记本`

https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph_crag.ipynb

https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph_crag_mistral.ipynb

# 生成

## 17 - 检索 (Self-RAG)

`笔记本`

https://github.com/langchain-ai/langgraph/tree/main/examples/rag

https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph_self_rag_mistral_nomic.ipynb

## 18 - 长上下文的影响

`深入探讨`

https://www.youtube.com/watch?v=SsHUNfhF32s

`幻灯片`

https://docs.google.com/presentation/d/1mJUiPBdtf58NfuSEQ7pVSEQ2Oqmek7F1i4gBwR6JDss/edit#slide=id.g26c0cb8dc66_0_0
