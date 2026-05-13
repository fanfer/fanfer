---
title: 高级RAG
date: '2026-03-04'
tags:
  - LLM
  - RAG
categories:
  - LLM
description: ''
top_img: /assets/background.JPG
cover: 'https://picture.fanfer.top/img/0_Gr_JqzdpHu7enWG9.png'
---
# 高级 RAG 技术：图解概览

对高级检索增强生成技术和算法的全面研究，系统化各种方法。本文附带了我知识库中引用的各种实现和研究链接集合。

 *本文旨在概述和解释可用的 RAG 算法和技术，因此不会深入代码实现细节，仅引用它们，并将具体内容留给丰富的文档和教程。*

# 简介

本文引用翻译自[IVAN ILIN 在Medium上的博客文章](https://readmedium.com/zh/advanced-rag-techniques-an-illustrated-overview-04d193d8fec6)

 *如果您熟悉 RAG 概念，请跳到高级 RAG 部分。*

检索增强生成，即 RAG，为 LLMs 提供从某些数据源检索到的信息，以便将其生成的答案建立在信息的基础上。基本而言，RAG 是搜索+LLM 提示，即您要求模型在搜索算法找到的信息作为上下文的情况下回答查询。查询和检索到的上下文都被注入到发送给 LLM 的提示中。

RAG 是 2023 年基于LLM系统的最受欢迎的架构。许多产品几乎完全基于 RAG 构建——从结合网络搜索引擎的问答服务到数百个与数据聊天的应用程序。

即使矢量搜索领域也因那股炒作而备受关注，尽管基于嵌入的搜索引擎早在 2019 年就已经使用 faiss 构建。像 chroma、weavaite.io 和 pinecone 这样的矢量数据库初创公司，是建立在现有的开源搜索索引之上的——主要是 faiss 和 nmslib——最近还增加了对输入文本的额外存储和一些其他工具。

有两个最突出的基于 LLM 的管道和应用程序的开源库——《LangChain》和《LlamaIndex》，分别于 2022 年 10 月和 11 月相差一个月成立，受 ChatGPT 发布启发，并在 2023 年获得了巨大采用。

本文旨在系统化关键高级 RAG 技术，并参考其实现（主要在 LlamaIndex 中）——以便其他开发者能够深入了解这项技术。

问题是大多数教程只是挑选一两个技术进行详细解释，而不是描述可用的全部工具的多样性。

另一件事是，LlamaIndex 和 LangChian 都是惊人的开源项目，它们的开发速度如此之快，以至于它们的文档已经比 2016 年的机器学习教科书还要厚。

# 朴素 RAG

本文中 RAG 管道的起点将是一组文本文档——我们跳过之前的内容，将其留给连接到任何可想象来源的惊人的开源数据加载器，从 YouTube 到 Notion。

![](https://picture.fanfer.top/img/0_Ko_ihY8ecAukf2g1.png)

作者提出的方案，以及文本中后续的所有方案

香草 RAG 案例简要来说是这样的：您将文本分割成块，然后使用某些 Transformer 编码器模型将这些块嵌入到向量中，将这些向量放入索引中，最后为LLM创建提示，告诉模型根据我们在搜索步骤中找到的上下文来回答用户的查询。在运行时，我们使用相同的编码器模型将用户的查询向量化，然后对该查询向量执行索引搜索，找到前 k 个结果，从我们的数据库中检索相应的文本块，并将它们作为上下文喂入LLM提示中。

提示可以看起来像这样：

提示工程是您可以尝试来改进您的 RAG 管道的最便宜的方法。确保您已经查看了一个相当全面的 OpenAI[提示工程指南](https://platform.openai.com/docs/guides/prompt-engineering/strategy-write-clear-instructions)。

显然，尽管 OpenAI 作为 LLM 提供商的市场领导者，但仍有众多替代方案，例如来自 Anthropic 的 Claude，来自 Mistral 的流行的小型但非常强大的模型 Mixtral，来自微软的 Phi-2，以及许多开源选项如 Llama2、OpenLLaMA、Falcon，因此您可以为您的 RAG 管道选择大脑。

# 高级 RAG

现在我们将深入了解高级 RAG 技术概述。这里是一个描述核心步骤和涉及算法的方案。为了保持方案的可读性，省略了一些逻辑循环和复杂的多元步骤代理行为。

![](https://picture.fanfer.top/img/0_Gr_JqzdpHu7enWG9.png)

一些高级 RAG 架构的关键组件。这更多的是一种可选用工具的选择，而非蓝图。

方案中的绿色元素是进一步讨论的核心 RAG 技术，蓝色的是文本。并非所有高级 RAG 想法都能在一个方案中轻松可视化，例如，省略了各种上下文扩展方法——我们将在路上深入研究。

## 分块与向量化

首先，我们想要创建一个向量索引，表示我们的文档内容，然后在运行时搜索所有这些向量与查询向量之间的最小余弦距离，以找到最接近的语义意义。

1.1 块切分
Transformer 模型具有固定的输入序列长度，即使输入上下文窗口很大，一个句子或几个句子的向量也比几页文本的平均向量更能代表它们的语义意义（这也取决于模型，但通常如此），所以**分块你的数据**——将初始文档分成一些大小的块，同时不失其意义（在句子或段落中分割文本，而不是将单个句子切成两部分）。有各种文本分割实现可以完成这项任务。

块的大小是一个需要考虑的参数——它取决于你使用的嵌入模型及其在标记上的容量，基于 BERT 的 Sentence Transformers 等标准 Transformer 编码器模型最多处理 512 个标记，OpenAI 的 ada-002 能够处理长达 8191 个标记的更长的序列，但在这里的权衡是足够的前置上下文，以便于LLM进行推理，以及足够具体的文本嵌入以便于高效执行搜索。在这里你可以找到一项关于块大小选择的研究。在 LlamaIndex 中，这由[NodeParser 类](https://docs.llamaindex.ai/en/stable/api_reference/service_context/node_parser.html)和一些高级选项来处理，例如定义自己的文本分割器、元数据、节点/块关系等。

1.2 向量化
下一步是选择一个**模型来嵌入我们的块**——有很多选项，我选择**搜索优化模型**，如[bge-large](https://huggingface.co/BAAI/bge-large-en-v1.5)或[E5](https://huggingface.co/intfloat/multilingual-e5-large)嵌入系列——只需查看[MTEB 排行榜](https://huggingface.co/spaces/mteb/leaderboard)获取最新更新。

对于端到端实现分块与向量化步骤，请查看 LlamaIndex 中的[示例](https://docs.llamaindex.ai/en/latest/module_guides/loading/ingestion_pipeline/root.html)，一个完整的数据摄取管道。

## 2. 搜索索引 2.1 向量存储索引

![](https://picture.fanfer.top/img/0_fCxtcFf8gIgnaJfE.png)

在这个方案以及文本中的后续部分，我省略了编码器块，为了方案的简洁性，直接将我们的查询发送到索引。当然，查询首先总是被矢量化。同样，对于前 k 个块——索引检索前 k 个向量，而不是块，但我将它们替换为块，因为获取它们是一个简单的步骤。

RAG 流水线的关键部分是搜索索引**，存储我们在上一步中获得的向量化内容。最简单的实现方式是使用平面索引——在查询向量和所有块向量之间进行暴力距离计算。**

一个针对高效检索优化的适当搜索索引，在 10000+元素规模上扩展，是一个向量索引，如[faiss](https://faiss.ai/)、[nmslib](https://github.com/nmslib/nmslib)或[annoy](https://github.com/spotify/annoy)，使用一些近似最近邻实现，如 clustring、树或[HNSW](https://www.pinecone.io/learn/series/faiss/hnsw/)算法。

也存在像 OpenSearch 或 ElasticSearch 这样的托管解决方案和向量数据库，在幕后处理第 1 步中描述的数据摄取管道，如[Pinecone](https://www.pinecone.io/)、[Weaviate](https://weaviate.io/)或[Chroma](https://www.trychroma.com/)。

根据您的索引选择，数据和搜索需求，您可以存储与向量一起的元数据**，然后使用**元数据过滤器**在特定日期或来源中搜索信息，例如。**

LlamaIndex 支持许多[向量存储索引](https://docs.llamaindex.ai/en/latest/community/integrations/vector_stores.html)，但也有其他更简单的索引实现得到支持，如列表索引、树索引和关键词表索引——我们将在融合检索部分讨论后者。

## 2.2 层次索引

![](https://picture.fanfer.top/img/0_nDwj0Jgpyk2qc_qJ.png)

如果需要从大量文档中检索，您需要能够高效地在其中搜索，找到相关信息，并将其综合成一个包含来源引用的单一答案。在大型数据库的情况下，一个有效的方法是创建两个索引——一个由摘要组成，另一个由文档片段组成，并分两步搜索，首先通过摘要过滤出相关文档，然后仅在这个相关组内搜索。

## 2.3 假设性问题与 HyDE

另一种方法是要求一个LLM为每个片段生成一个问题，并将这些问题嵌入到向量中，在运行时针对这个问题向量索引进行查询搜索（用问题向量替换我们索引中的片段向量），然后检索后路由到原始文本片段，并将它们作为上下文发送给LLM以获取答案。这种方法由于与实际片段相比，查询和假设问题之间的语义相似度更高，因此提高了搜索质量。

也存在一种逆向逻辑方法，称为[**HyDE**](http://boston.lti.cs.cmu.edu/luyug/HyDE/HyDE.pdf)——你要求一个LLM根据查询生成一个假设性响应，然后使用其向量与查询向量一起提高搜索质量。

## 2.4 上下文丰富化

这里的概念是检索更小的片段以获得更好的搜索质量，但为LLM推理添加周围上下文。有两种选择——通过句子扩展围绕较小检索片段的上下文，或将文档递归地分割成多个较大的父片段，其中包含较小的子片段。

2.4.1 句子窗口检索
在这个方案中，文档中的每一句话都是单独嵌入的，这为查询到上下文余弦距离搜索提供了很高的准确性。
为了在获取最相关的单个句子之后更好地推理所找到的上下文，我们在检索到的句子前后扩展上下文窗口，扩展 *k* 句，然后将这个扩展的上下文发送到 LLM。

![](https://picture.fanfer.top/img/0_JKZ9m_c6jyIKqCWu.png)

绿色部分是在索引中搜索时找到的句子嵌入，整个黑色加绿色段落被输入到LLM中，以在推理提供的查询时扩大其上下文

 **2.4.2 自动合并检索器（又称父文档检索器）**

这里的想法与 Sentence Window Retriever 非常相似——搜索更细粒度的信息片段，然后在将所述上下文输入LLM进行推理之前扩展上下文窗口。文档被分割成较小的子块，这些子块引用较大的父块。

![](https://picture.fanfer.top/img/0_x4rMd50GP99OSDuo.png)

文档被分割成一系列块，然后最小的叶子块被发送到索引。在检索时，我们检索 k 个叶子块，如果有 n 个块引用相同的父块，我们用这个父块替换它们，并将其发送到LLM进行答案生成。

在检索过程中首先获取较小的块，然后如果前 *n* 个检索到的块中超过 *k* 个块与同一父节点（较大的块）相关联，我们将提供给 LLM 的上下文替换为该父节点——就像自动将几个检索到的块合并到一个较大的父块中，因此得名该方法。仅作备注——搜索仅限于子节点索引内。查看 LlamaIndex 教程中的 [递归检索 + 节点引用](https://docs.llamaindex.ai/en/stable/examples/retrievers/recursive_retriever_nodes.html) 以深入了解。

## 2.5 融合检索或混合搜索

一个相对古老的想法，你可以从两个世界取其精华——基于关键词的老式搜索——如 tf-idf 这样的稀疏检索算法或搜索行业标准的 BM25——以及现代语义或向量搜索，并将它们结合在一个检索结果中。
这里唯一的技巧是将检索到的结果与不同的相似度分数正确地结合起来——这个问题通常借助[相互排名融合](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)算法来解决，重新对检索结果进行排序以生成最终输出。

![](https://picture.fanfer.top/img/0_0pQbhBEez7U-2knd.png)

在 LangChain 中，这是在[Ensemble Retriever](https://python.langchain.com/docs/modules/data_connection/retrievers/ensemble)类中实现的，结合了你定义的一系列检索器，例如 faiss 向量索引和基于 BM25 的检索器，并使用 RRF 进行重排序。

在 LlamaIndex 中，这是以非常相似的方式完成的。

混合或融合搜索通常提供更好的检索结果，因为两种互补的搜索算法被结合，同时考虑了查询与存储文档之间的语义相似性和关键词匹配。

## 3. 重新排序和过滤

因此，我们得到了上述任何算法描述的检索结果，现在是通过过滤、重新排序或某些转换来精炼它们的时候了。在 LlamaIndex 中，有多种可用的[**后处理器**](https://docs.llamaindex.ai/en/stable/module_guides/querying/node_postprocessors/root.html)，**基于相似度分数、关键词、元数据过滤结果，或者使用其他模型如LLM重新排序它们**。
[句子转换器交叉编码器](https://www.sbert.net/examples/applications/cross-encoder/README.html)，Cohere 重排序 [端点](https://txt.cohere.com/rerank/)
或者基于元数据，如日期的最近程度——基本上，你能想到的所有东西。

这是在将检索到的上下文输入到LLM以获取最终答案之前的最后一步。

现在，是时候转向更复杂的 RAG 技术，如查询转换和路由，这两者都涉及LLMs，因此代表了**代理行为——在我们的 RAG 管道中涉及LLM推理的一些复杂逻辑。**

## 4. 查询转换

查询转换是一组使用 LLM 作为推理引擎来修改用户输入以改进检索质量的技巧。有不同选项可以实现这一点。

![](https://picture.fanfer.top/img/0_DP6RrSA2OkcHnWIV.png)

查询转换原则图解

如果查询复杂，LLM 可以将其分解为几个子查询。例如，如果您问：“在 Github 上哪个框架有更多星标，Langchain 还是 LlamaIndex？”，我们不太可能在语料库中找到直接的比较，因此将这个问题分解为两个子查询是有意义的，假设它们是更简单和更具体的检索信息： “Langchain 在 Github 上有多少星标？” — “Llamaindex 在 Github 上有多少星标？” 它们将并行执行，然后检索到的上下文将结合成一个单独的提示，供 LLM 综合对初始查询的最终答案。这两个库都实现了这个功能 — Langchain 作为一个 [多查询检索器](https://python.langchain.com/docs/modules/data_connection/retrievers/MultiQueryRetriever?ref=blog.langchain.dev)，Llamaindex 作为一个 [子问题查询引擎](https://docs.llamaindex.ai/en/stable/examples/query_engine/sub_question_query_engine.html)。

1. [**回退提示**](https://arxiv.org/pdf/2310.06117.pdf?ref=blog.langchain.dev)**使用LLM生成更通用的查询**，检索出更通用或高级的上下文，这对于将我们的原始查询的答案定位在更通用的上下文中很有用。对原始查询也进行了检索，并将两个上下文都输入到最终答案生成步骤中的LLM。这里是一个 LangChain 的[实现](https://github.com/langchain-ai/langchain/blob/master/cookbook/stepback-qa.ipynb?ref=blog.langchain.dev)。
2. 查询重写使用 LLM 重新表述初始查询，以提高检索效果。LangChain 和 LlamaIndex 都有实现，尽管略有不同，我发现 LlamaIndex 的解决方案在这里更强大。

## 参考文献引用

这一项无需编号，因为它更像是仪器而非检索改进技术，尽管它非常重要。
如果我们使用了多个来源来生成答案，要么是因为初始查询的复杂性（我们不得不执行多个子查询，然后将检索到的上下文合并成一个答案），要么是因为我们在各种文档中找到了针对单个查询的相关上下文，那么问题就出现了，我们是否能够准确地回溯我们的来源。

有几种方法可以做到这一点：

1. 将此引用任务插入我们的提示中，并要求LLM提及所使用资源的 ID。
2. 匹配生成的响应部分与原始文本块 — llamaindex 为这种情况提供了一个高效的[基于模糊匹配的解决方案](https://github.com/run-llama/llama-hub/tree/main/llama_hub/llama_packs/fuzzy_citation)。如果您还没有听说过模糊匹配，这是一种[非常强大的字符串匹配技术](https://towardsdatascience.com/fuzzy-matching-at-scale-84f2bfd0c536)。

## 5. 聊天引擎

构建一个可以针对单个查询多次工作的优秀 RAG 系统，下一个重要因素是**聊天逻辑**，考虑到对话上下文，就像在 LLM 时代之前的经典聊天机器人中一样。这是为了支持后续问题、代词引用或与先前对话上下文相关的任意用户命令。这通过**查询压缩技术**来解决，同时考虑到聊天上下文和用户查询。

始终存在几种处理上下文压缩的方法——一种流行且相对简单的方法是[上下文聊天引擎](https://docs.llamaindex.ai/en/stable/examples/chat_engine/chat_engine_context.html)，首先检索与用户查询相关的上下文，然后将其与来自*内存*缓冲区的聊天历史一起发送到LLM，以便LLM在生成下一个答案时了解先前的上下文。

一个更复杂的案例是 [CondensePlusContextMode](https://docs.llamaindex.ai/en/stable/examples/chat_engine/chat_engine_condense_plus_context.html) — 在每次交互中，聊天历史和最后一条消息被压缩成一个新的查询，然后这个查询进入索引，检索到的上下文与原始用户消息一起传递给 LLM 以生成答案。

请注意，LlamaIndex 也支持基于 OpenAI 代理的聊天引擎，提供更灵活的聊天模式，Langchain 也支持 OpenAI 功能 API。

![](https://picture.fanfer.top/img/0_9cxhMMkUf8veRnRB.png)

不同聊天引擎类型和原理的插图

存在其他聊天引擎类型，如[ReAct Agent](https://docs.llamaindex.ai/en/stable/examples/chat_engine/chat_engine_react.html)，但让我们跳到第 7 节中的代理本身。

## 6. 查询路由

查询路由是在用户查询的基础上，由LLM驱动的决策步骤，决定下一步要做什么——通常的选择包括总结、对某些数据索引进行搜索，或者尝试多种不同的路线，然后在单个答案中综合它们的输出。

查询路由器还用于选择索引或更广泛的数据存储，以发送用户查询——要么你有多个数据源，例如，一个经典向量存储和图数据库或关系型数据库，要么你有索引的层次结构——对于多文档存储，一个相当经典的案例是一个摘要索引和另一个文档块向量索引，例如。

定义查询路由器包括设置它可以做出的选择。
选择路由选项是通过一个 LLM 调用来执行的，以预定义的格式返回其结果，用于将查询路由到指定的索引，或者，如果我们考虑的是族性行为，则路由到子链或甚至其他代理，如下面的 **多文档代理方案** 所示。

LlamaIndex 和 LangChain 都支持查询路由器。

## 7. RAG 中的代理

代理（由[Langchain](https://python.langchain.com/docs/modules/agents/)和[LlamaIndex](https://docs.llamaindex.ai/en/latest/use_cases/agents.html)支持）几乎自第一个LLM API 发布以来就存在了——**想法是提供一个LLM，能够进行推理，并附带一系列工具和待完成的任务**。这些工具可能包括一些确定性函数，如任何代码函数或外部 API，甚至是其他代理——这种LLM链式思想是 LangChain 名称的由来。

代理本身就是一个大话题，在 RAG 概述中深入探讨是不可能的，所以我将继续讨论基于代理的多文档检索案例，并在 OpenAI 助手站短暂停留，因为它是一个相对较新的东西，在最近的开源 AI 开发者大会上作为 GPTs 展示，并在下面描述的 RAG 系统下运行。[最近的开源 AI 开发者大会](https://openai.com/blog/new-models-and-developer-products-announced-at-devday)

《OpenAI 助手》基本上实现了围绕 LLM 所需的许多工具，我们之前在开源中已有——聊天历史、知识存储、文档上传界面，也许最重要的是，[**功能调用 API**](https://platform.openai.com/docs/assistants/tools/function-calling)。后者提供了将自然语言转换为 API 调用外部工具或数据库查询的能力。

在 LlamaIndex 中，有一个[OpenAIAgent](https://docs.llamaindex.ai/en/stable/examples/agent/openai_agent.html)类，将这种高级逻辑与 ChatEngine 和 QueryEngine 类相结合，提供基于知识和上下文感知的聊天，以及在一个对话回合中调用多个 OpenAI 函数的能力，这真正带来了智能代理行为。

让我们看看[**多文档代理**](https://docs.llamaindex.ai/en/stable/examples/agent/multi_document_agents.html)**方案**——一个相当复杂的设置，涉及在每个文档上初始化一个**代理**（[OpenAIAgent](https://docs.llamaindex.ai/en/stable/examples/agent/openai_agent.html)），能够进行文档摘要和经典问答机制，以及一个顶级代理，负责将查询路由到文档代理并合成最终答案。

每个文档代理有两个工具——一个向量存储索引和一个摘要索引，根据路由的查询决定使用哪一个。而对于顶级代理，所有文档代理都是工具。

本方案展示了具有大量由每个参与代理做出的路由决策的高级 RAG 架构。**这种方法的优点是能够比较不同文档和它们的摘要中描述的不同解决方案或实体**，以及经典的单文档摘要和问答机制——这基本上涵盖了最常见的与文档集合进行聊天的情况。

![](https://picture.fanfer.top/img/0_FZp2J2NyHHBXPtii.png)

一个说明多文档代理的方案，涉及查询路由和代理行为模式。

这种复杂方案的缺点可以从图中猜出——由于代理内部有多个来回迭代，所以速度有点慢。无论如何，LLM 调用总是 RAG 管道中最耗时的操作——搜索在设计上已经优化了速度。因此，对于大型多文档存储，我建议考虑对这个方案进行一些简化，使其可扩展。

## 8. 响应合成器

这是任何 RAG 管道的最终步骤——根据我们精心检索的所有上下文和初始用户查询生成答案。最简单的方法就是将所有检索到的上下文（在某个相关性阈值以上）与查询一起一次性输入到一个LLM中。但，就像往常一样，还有其他更复杂的选择，涉及多次LLM调用以细化检索到的上下文并生成更好的答案。

主要响应合成方法包括：1. 通过将检索到的上下文分块发送到 LLM 进行迭代优化答案 2. 概括检索到的上下文以适应提示 3. 基于不同的上下文块生成多个答案，然后进行连接或概括。更多详情请查看 [响应合成模块文档](https://docs.llamaindex.ai/en/stable/module_guides/querying/response_synthesizers/root.html)。

# 编码器和LLM微调

这种方法涉及调整我们 RAG 管道中涉及的两个深度学习模型中的一些——要么是 Transformer 编码器，负责嵌入质量以及因此上下文检索质量，要么是负责最佳使用提供的上下文来回答用户查询的**LLM**——幸运的是，后者是一个很好的几样本学习器。

如今的一大优势是高端的 LLMs（如 GPT-4）可用于生成高质量合成数据集的可用性。但您始终应意识到，使用由专业研究团队在精心收集、清洗和验证的大型数据集上训练的开源模型，并使用小型合成数据集进行快速调整，可能会限制模型在一般情况下的能力。

## 编码器微调

我也对编码器微调方法有点怀疑，因为最新的针对搜索优化的 Transformer 编码器相当高效。因此，我在 LlamaIndex 笔记本设置下测试了（撰写本文时的 MTEB 排行榜前 4 名）的微调带来的性能提升，并展示了 2%的检索质量提升。虽然没有那么戏剧性，但了解这个选项还是不错的，尤其是如果你正在构建针对狭窄领域数据集的 RAG 时。

## 排名微调

其他好的老选择是使用一个交叉编码器来重新排序您检索到的结果，如果您不完全信任您的基编码器。它的工作方式如下——您将查询和每个排名前 k 的检索到的文本块传递给交叉编码器，由 SEP 标记分隔，并微调它以输出 1 表示相关块和 0 表示非相关块。这样一个调优过程的良好例子可以在[这里](https://docs.llamaindex.ai/en/latest/examples/finetuning/cross_encoder_finetuning/cross_encoder_finetuning.html)找到，结果显示通过交叉编码器微调，成对得分提高了 4%。

## LLM 微调

最近，OpenAI 开始提供 LLM 微调 [API](https://platform.openai.com/docs/guides/fine-tuning)，LlamaIndex 在 [tutorial](https://docs.llamaindex.ai/en/stable/examples/finetuning/openai_fine_tuning.html) 中介绍了如何在 RAG 设置下微调 GPT-3.5-turbo 以“提炼”一些 GPT-4 的知识。这里的想法是取一份文档，使用 GPT-3.5-turbo 生成一系列问题，然后使用 GPT-4 根据文档内容生成这些问题的答案（构建一个由 GPT4 驱动的 RAG 流程），然后在该问答对数据集上微调 GPT-3.5-turbo。用于 RAG 流程评估的 [ragas](https://docs.ragas.io/en/latest/index.html) 框架显示，在忠实度指标上提高了 5%，这意味着微调后的 GPT 3.5-turbo 模型比原始模型更好地利用了提供的上下文来生成答案。

近期，Meta AI Research 发表的论文《RA-DIT：检索增强双指令微调》展示了一种更复杂的方法，该方法建议调整LLM和检索器
（原始论文中的双编码器）**在查询、上下文和答案的三元组上**。有关实现细节，请参阅此[指南](https://docs.llamaindex.ai/en/stable/examples/finetuning/knowledge/finetune_retrieval_aug.html#fine-tuning-with-retrieval-augmentation)。这项技术被用于通过微调 API 和 Llama2 开源模型（在原始论文中）微调 OpenAI LLMs，从而在知识密集型任务指标上提高了约 5%（与 Llama2 65B 搭配 RAG 相比）以及在常识推理任务上提高了几个百分点。

 *如果您对 RAG 的LLM微调有更好的方法，请在评论区分享您的专业知识，尤其是如果它们应用于较小的开源LLMs。*

# 评估

存在几个用于 RAG 系统性能评估的框架，它们共享这样的观点：拥有几个独立的指标，如整体**答案相关性、答案扎根性、忠实度和检索到的上下文相关性**。

Ragas，在上一节中提到，使用[忠实度](https://docs.ragas.io/en/latest/index.html)和[答案相关性](https://docs.ragas.io/en/latest/concepts/metrics/faithfulness.html)作为生成答案的质量指标，以及经典上下文的[精确度](https://docs.ragas.io/en/latest/concepts/metrics/context_precision.html)和[召回率](https://docs.ragas.io/en/latest/concepts/metrics/context_recall.html)作为 RAG 方案的检索部分。

在最近发布的一门优秀短期课程《构建和评估高级 RAG》中，由 Andrew NG、LlamaIndex 和评估框架 Truelens 共同提出，他们建议了 RAG 三元组——**检索到的上下文相关性**、**基于事实性**（LLM 答案得到提供上下文支持的程度）以及**答案相关性**。

关键和最可控的指标是**检索到的上下文相关性**——基本上上述高级 RAG 管道的第 1-7 部分以及编码器和排序器的微调部分旨在提高此指标，而第 8 部分和LLM微调则专注于答案的相关性和基于事实性。

一个相当简单的检索评估流程的例子可以在[这里](https://github.com/run-llama/finetune-embedding/blob/main/evaluate.ipynb)找到，并在编码器微调部分得到了应用。在 OpenAI [食谱](https://github.com/openai/openai-cookbook/blob/main/examples/evaluation/Evaluate_RAG_with_LlamaIndex.ipynb)中展示了一种更高级的方法，它不仅考虑了**命中率**，还考虑了**平均倒数排名**，这是一个常见的搜索引擎指标，以及生成的答案指标，如忠实度和相关性。

LangChain 拥有一个相当先进的评估框架[LangSmith](https://docs.smith.langchain.com/)，其中可以实施自定义评估器，并且它还监控 RAG 管道内部运行的跟踪，以便使您的系统更加透明。

如果您正在使用 LlamaIndex 构建，有一个[rag\_evaluator llama 包](https://github.com/run-llama/llama-hub/tree/dac193254456df699b4c73dd98cdbab3d1dc89b0/llama_hub/llama_packs/rag_evaluator)，提供了一种快速工具，用于使用公共数据集评估您的流水线。

# 结论

我试图概述 RAG 的核心算法方法，并希望展示其中一些，以激发您在 RAG 管道中尝试一些新想法，或者为今年发明的大量技术带来一些系统——对我来说，2023 年是迄今为止机器学习中最激动人心的年份。

有许多其他需要考虑的事项，如基于 RAG 的网页搜索（LlamaIndex、webLangChain 等），深入探讨代理架构（以及最近 OpenAI 在这场游戏中的股份）以及一些关于**LLMs长期记忆**的想法。

主要生产挑战是速度，除了答案的相关性和忠实度之外，特别是如果你对更灵活的基于代理的方案感兴趣，但这将是另一篇文章的内容。ChatGPT 和大多数其他助手使用的这种流式功能并非随机赛博朋克风格，而仅仅是一种缩短感知答案生成时间的方式。这就是为什么我认为小型 LLMs 和 Mixtral 和 Phi-2 的最新发布前景光明。

