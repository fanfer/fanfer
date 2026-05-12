---
title: RAG从零开始构建教程5-9
tags: 
    - LLM
    - RAG
categories:
    - LLM
description:
date: 2024-6-18 11:48:16
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/d9d5305c-e5bb-4934-b91d-5988c87fd767.png
---
# 从零开始的RAG：查询转换

查询转换是一组专注于重写和/或修改检索问题的方法。

![Screenshot 2024-03-25 at 8.08.30 PM.png](https://picture.fanfer.top/img/d9d5305c-e5bb-4934-b91d-5988c87fd767.png)

## 环境

`(1) 包`

```python
! pip install langchain_community tiktoken langchain-openai langchainhub chromadb langchain
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
```

## 第5部分：多查询

流程：

![Screenshot 2024-02-12 at 12.39.59 PM.png](https://picture.fanfer.top/img/9efe017a-075f-4017-abef-174c755b11c6.png)

文档：

* https://python.langchain.com/docs/modules/data_connection/retrievers/MultiQueryRetriever

### 索引

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
from langchain_community.vectorstores import Chroma
vectorstore = Chroma.from_documents(documents=splits, 
                                    embedding=OpenAIEmbeddings())

retriever = vectorstore.as_retriever()
```

### 提示

```python
from langchain.prompts import ChatPromptTemplate

# 多查询：不同视角
template = """你是一个AI语言模型助手。你的任务是生成五个不同版本的用户问题，以从向量数据库中检索相关文档。通过对用户问题生成多个视角，你的目标是帮助用户克服基于距离的相似性搜索的一些限制。请提供这些替代问题，并用换行符分隔。原始问题：{question}"""
prompt_perspectives = ChatPromptTemplate.from_template(template)

from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

generate_queries = (
    prompt_perspectives 
    | ChatOpenAI(temperature=0) 
    | StrOutputParser() 
    | (lambda x: x.split("\n"))
)
```

```python
from langchain.load import dumps, loads

def get_unique_union(documents: list[list]):
    """ 检索文档的唯一并集 """
    # 展平列表，并将每个Document转换为字符串
    flattened_docs = [dumps(doc) for sublist in documents for doc in sublist]
    # 获取唯一文档
    unique_docs = list(set(flattened_docs))
    # 返回
    return [loads(doc) for doc in unique_docs]

# 检索
question = "What is task decomposition for LLM agents?"
retrieval_chain = generate_queries | retriever.map() | get_unique_union
docs = retrieval_chain.invoke({"question":question})
len(docs)
```

```python
from operator import itemgetter
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnablePassthrough

# RAG
template = """根据以下上下文回答问题：

{context}

问题：{question}
"""

prompt = ChatPromptTemplate.from_template(template)

llm = ChatOpenAI(temperature=0)

final_rag_chain = (
    {"context": retrieval_chain, 
     "question": itemgetter("question")} 
    | prompt
    | llm
    | StrOutputParser()
)

final_rag_chain.invoke({"question":question})
```

## 第6部分：RAG-Fusion

流程：

![Screenshot 2024-02-12 at 12.41.36 PM.png](https://picture.fanfer.top/img/0bc49f5b-c338-4cd4-ac04-8744994e0e81.png)

文档：

* https://github.com/langchain-ai/langchain/blob/master/cookbook/rag_fusion.ipynb?ref=blog.langchain.dev

博客/仓库：

* https://towardsdatascience.com/forget-rag-the-future-is-rag-fusion-1147298d8ad1

### 提示

```python
from langchain.prompts import ChatPromptTemplate

# RAG-Fusion: 相关
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

retrieval_chain_rag_fusion = generate_queries | retriever.map() | reciprocal_rank_fusion
docs = retrieval_chain_rag_fusion.invoke({"question": question})
len(docs)
```

```python
from langchain_core.runnables import RunnablePassthrough

# RAG
template = """根据以下上下文回答问题：

{context}

问题：{question}
"""

prompt = ChatPromptTemplate.from_template(template)

final_rag_chain = (
    {"context": retrieval_chain_rag_fusion, 
     "question": itemgetter("question")} 
    | prompt
    | llm
    | StrOutputParser()
)

final_rag_chain.invoke({"question":question})
```

追踪：

https://smith.langchain.com/public/071202c9-9f4d-41b1-bf9d-86b7c5a7525b/r

## 第7部分：分解

```python
from langchain.prompts import ChatPromptTemplate

# 分解
template = """你是一个有帮助的助手，可以生成与输入问题相关的多个子问题。\n
目标是将输入分解为一组可以单独回答的子问题/子问题。\n
生成与以下内容相关的多个搜索查询：{question} \n
输出（3个查询）："""
prompt_decomposition = ChatPromptTemplate.from_template(template)
```

```python
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# LLM
llm = ChatOpenAI(temperature=0)

# 链
generate_queries_decomposition = ( prompt_decomposition | llm | StrOutputParser() | (lambda x: x.split("\n")))

# 运行
question = "What are the main components of an LLM-powered autonomous agent system?"
questions = generate_queries_decomposition.invoke({"question":question})
```

```python
questions
```

# 递归回答

![Screenshot 2024-02-18 at 1.55.32 PM.png](https://picture.fanfer.top/img/9a9685de-051f-48fa-b68f-2b1f85344cdf.png)

论文：

* https://arxiv.org/pdf/2205.10625.pdf
* https://arxiv.org/abs/2212.10509.pdf

```python
# 提示
template = """这是你需要回答的问题：

\n --- \n {question} \n --- \n

这是任何可用的背景问题+答案对：

\n --- \n {q_a_pairs} \n --- \n

这是与问题相关的额外上下文：

\n --- \n {context} \n --- \n

使用上述上下文和任何背景问题+答案对来回答问题：\n {question}
"""

decomposition_prompt = ChatPromptTemplate.from_template(template)
```

```python
from operator import itemgetter
from langchain_core.output_parsers import StrOutputParser

def format_qa_pair(question, answer):
    """格式化问答对"""
    
    formatted_string = ""
    formatted_string += f"问题：{question}\n答案：{answer}\n\n"
    return formatted_string.strip()

# llm
llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)

q_a_pairs = ""
for q in questions:
    
    rag_chain = (
    {"context": itemgetter("question") | retriever, 
     "question": itemgetter("question"),
     "q_a_pairs": itemgetter("q_a_pairs")} 
    | decomposition_prompt
    | llm
    | StrOutputParser())

    answer = rag_chain.invoke({"question":q,"q_a_pairs":q_a_pairs})
    q_a_pair = format_qa_pair(q,answer)
    q_a_pairs = q_a_pairs + "\n---\n"+  q_a_pair
```

```python
answer
```

# 单独回答

![Screenshot 2024-02-18 at 2.00.59 PM.png](https://picture.fanfer.top/img/e24502d7-f641-4262-a326-da1636822fa2.png)

```python
# 单独回答每个子问题

from langchain import hub
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

# RAG 提示
prompt_rag = hub.pull("rlm/rag-prompt")

def retrieve_and_rag(question,prompt_rag,sub_question_generator_chain):
    """对每个子问题进行RAG"""
    
    # 使用我们的分解/
    sub_questions = sub_question_generator_chain.invoke({"question":question})
    
    # 初始化一个列表以保存RAG链结果
    rag_results = []
    
    for sub_question in sub_questions:
        
        # 检索每个子问题的文档
        retrieved_docs = retriever.get_relevant_documents(sub_question)
        
        # 在RAG链中使用检索到的文档和子问题
        answer = (prompt_rag | llm | StrOutputParser()).invoke({"context": retrieved_docs, 
                                                                "question": sub_question})
        rag_results.append(answer)
    
    return rag_results,sub_questions

# 将检索和RAG过程包装在RunnableLambda中以便集成到链中
answers, questions = retrieve_and_rag(question, prompt_rag, generate_queries_decomposition)
```

```python
def format_qa_pairs(questions, answers):
    """格式化问答对"""
    
    formatted_string = ""
    for i, (question, answer) in enumerate(zip(questions, answers), start=1):
        formatted_string += f"问题 {i}：{question}\n答案 {i}：{answer}\n\n"
    return formatted_string.strip()

context = format_qa_pairs(questions, answers)

# 提示
template = """这是一组问答对：

{context}

使用这些来综合回答问题：{question}
"""

prompt = ChatPromptTemplate.from_template(template)

final_rag_chain = (
    prompt
    | llm
    | StrOutputParser()
)

final_rag_chain.invoke({"context":context,"question":question})
```

# 第8部分：退一步

![Screenshot 2024-02-12 at 1.14.43 PM.png](https://picture.fanfer.top/img/715e11dc-7730-4f51-8469-b7f0b299ac9e.png)

论文：

* https://arxiv.org/pdf/2310.06117.pdf

```python
# 少量示例
from langchain_core.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
examples = [
    {
        "input": "Could the members of The Police perform lawful arrests?",
        "output": "what can the members of The Police do?",
    },
    {
        "input": "Jan Sindel’s was born in what country?",
        "output": "what is Jan Sindel’s personal history?",
    },
]
# 我们现在将这些转换为示例消息
example_prompt = ChatPromptTemplate.from_messages(
    [
        ("human", "{input}"),
        ("ai", "{output}"),
    ]
)
few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
)
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """你是世界知识的专家。你的任务是退一步，将问题改写为更通用的退一步问题，这样更容易回答。以下是一些示例：""",
        ),
        # 少量示例
        few_shot_prompt,
        # 新问题
        ("user", "{question}"),
    ]
)
```

```python
generate_queries_step_back = prompt | ChatOpenAI(temperature=0) | StrOutputParser()
question = "What is task decomposition for LLM agents?"
generate_queries_step_back.invoke({"question": question})
```

```python
# 响应提示
response_prompt_template = """你是世界知识的专家。我将向你提问。你的回答应该是全面的，并且如果相关，不应与以下上下文相矛盾。否则，如果它们不相关，请忽略它们。

# {normal_context}
# {step_back_context}

# 原始问题：{question}
# 答案："""
response_prompt = ChatPromptTemplate.from_template(response_prompt_template)

chain = (
    {
        # 使用正常问题检索上下文
        "normal_context": RunnableLambda(lambda x: x["question"]) | retriever,
        # 使用退一步问题检索上下文
        "step_back_context": generate_queries_step_back | retriever,
        # 传递问题
        "question": lambda x: x["question"],
    }
    | response_prompt
    | ChatOpenAI(temperature=0)
    | StrOutputParser()
)

chain.invoke({"question": question})
```

## 第9部分：HyDE

![Screenshot 2024-02-12 at 1.12.45 PM.png](https://picture.fanfer.top/img/1982149e-720b-426e-a1ab-8d96f6616b5a.png)

文档：

* https://github.com/langchain-ai/langchain/blob/master/cookbook/hypothetical_document_embeddings.ipynb

论文：

* https://arxiv.org/abs/2212.10496

```python
from langchain.prompts import ChatPromptTemplate

# HyDE 文档生成
template = """请撰写一篇科学论文段落来回答问题
问题：{question}
段落："""
prompt_hyde = ChatPromptTemplate.from_template(template)

from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

generate_docs_for_retrieval = (
    prompt_hyde | ChatOpenAI(temperature=0) | StrOutputParser() 
)

# 运行
question = "What is task decomposition for LLM agents?"
generate_docs_for_retrieval.invoke({"question":question})
```

```python
# 检索
retrieval_chain = generate_docs_for_retrieval | retriever 
retireved_docs = retrieval_chain.invoke({"question":question})
retireved_docs
```

```python
# RAG
template = """根据以下上下文回答问题：

{context}

问题：{question}
"""

prompt = ChatPromptTemplate.from_template(template)

final_rag_chain = (
    prompt
    | llm
    | StrOutputParser()
)

final_rag_chain.invoke({"context":retireved_docs,"question":question})
```
