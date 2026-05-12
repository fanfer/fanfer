---
title: 书生·浦语大模型实战营（三）：InternLM RAG
tags: 
    - InternLM2
    - 笔记
categories:
    - 笔记
description: Hello world this is fanfer's Blog!
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/InternLM2.webp
---
视频：https://www.bilibili.com/video/BV1QA4m1F7t4/?vd_source=3194af3e77968cb10b1d50711d07106a

教程：https://github.com/InternLM/Tutorial/blob/camp2/huixiangdou/readme.md

茴香豆：https://github.com/InternLM/HuixiangDou

LLM的局限性：

- 知识时效性受限：如何让LLM能够获取最新的知识
- 专业能力有限：如何打造垂域大模型
- 定制化成本高：如何打造个人专属的LLM应

两种开发范式：
RAG：检索增强生成

外挂知识库，从知识库中匹配到相应文档，然后和提问一起交给LLM

低成本、可以实时更新、收到几座影响、单次回答知识有限

Finetune：微调

可以个性化微调、知识覆盖面广、成本高昂、无法实时更新

## RAG：

RAG（Retrieval Augmented Generation）技术，通过检索与用户输入相关的信息片段，并结合***外部知识库***来生成更准确、更丰富的回答。解决 LLMs 在处理知识密集型任务时可能遇到的挑战, 如幻觉、知识过时和缺乏透明、可追溯的推理过程等。提供更准确的回答、降低推理成本、实现外部记忆。

![Untitled](https://picture.fanfer.top/img/internLM31.png)

## LangChain

LangChain 框架是一个开源工具，通过为各种LLM 提供通用接口来简化应用程序的开发流程，帮助开发者自由构建LLM应用。

LangChain 的核心组成模块：

- 链（Chains）：将组件组合实现端到端应用，通过一个对象封装实现一系列
LLM 操作
- Eg. 检索问答链，覆盖实现了 RAG（检索增强生成）的全部流
    
    ![截屏2024-03-29 17.44.19.png](https://picture.fanfer.top/img/internLM32.png)
    

### 构建向量数据库

### 加载源文件

- 确定源文件类型，针对不同类型的源文件选用不同的加载器
    - 核心在于将带格式的文本转化为无格式的字符串

### 文档分块

- 由于单个文档往往超过模型上下文上限，我们需要对加载的文档进行切分
    - 一般按字符串长度进行分割
    - 可以手动控制分割块的长度和重叠区间长度

### 文档向量化

- 使用向量数据库来支持语义检索，需要将文档向量化存入向量数据库
    - 可以使用任意一种 Embedding 模型来进行向量化
    - 可以使用多种支持语义检索的向量数据库，一般使用轻量级的 Chroma

### 搭建知识库助手

### 将 InternLM 接入 LangChain

- LangChain 支持自定义 LLM，可以直接接入到框架中
- 我们只需将 InternLM 部署在本地，并封装一个自定义 LLM 类，调用本地 InternLM 即可

### 构建检索问答链

- LangChain 提供了检索问答链模版，可以自动实现知识检索、Prompt 嵌入、LLM 问答的全部流程
- 将基于 InternLM 的自定义 LLM 和已构建的向量数据库接入到检索问答链的上游
- 调用检索问答链，即可实现知识库助手的核心功能

!https://picture.fanfer.top/img/internLM33.webp

- 基于RAG的问答系统性能核心受限于：
    - 检索精度
    - Prompt性能
- 一些可能的优化点：
    - 检索方面：
        - 基于语义进行分割，保证每一个chunk的语义完整
        - 给每一个chunk生成概括性索引，检索时匹配索引

Prompt方面：迭代优化Prompt策略

![Untitled](https://picture.fanfer.top/img/internLM34.png)

[]()

![Untitled](https://picture.fanfer.top/img/internLM35.png)

![Untitled](https://picture.fanfer.top/img/internLM36.png)

![Untitled](https://picture.fanfer.top/img/internLM37.png)

![Untitled](https://picture.fanfer.top/img/internLM38.png)

![Untitled](https://picture.fanfer.top/img/internLM39.png)

![Untitled](https://picture.fanfer.top/img/internLM310.png)

作业：

![截屏2024-04-11 19.09.41.png](https://picture.fanfer.top/img/internLM311.png)

![截屏2024-04-11 19.09.41.png](https://picture.fanfer.top/img/internLM3111.png)


![截屏2024-04-11 19.09.41.png](https://picture.fanfer.top/img/internLM312.png)


![截屏2024-04-11 19.09.41.png](https://picture.fanfer.top/img/internLM313.png)