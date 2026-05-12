---
title: 书生·浦语大模型实战营（五）：LMDeploy 量化
date: 2024-04-20 10:04:57
tags: 
    - InternLM2
    - 笔记
categories:
    - 笔记
description: Hello world this is fanfer's Blog!
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/InternLM2.webp
---
文档：https://github.com/InternLM/Tutorial/tree/camp2/lmdeploy

视频：https://www.bilibili.com/video/BV1tr421x75B/?spm_id_from=333.788&vd_source=3194af3e77968cb10b1d50711d07106a

### 模型部署

- 定义
    - 将训练好的模型在特定软硬件环境中启动的过程，使模型能够接收输入并返回预测结果
    - 为了满足性能和效率的需求，常常需要对模型进行优化，例如模型压缩和硬件加速
- 产品形态
    - 云端、边缘计算端、移动端
- 计算设备
    - CPU、GPU、NPU、TPU 等

### 大模型特点

- 内存开销巨大
    - 庞大的参数量。7B模型仅权重就需要 14+G 内存
    - 采用自回归生成 token，需要缓存 Attention 的 k/v，带来巨大的内存开销
- 动态 shape
    - 请求数不固定
    - Token 逐个生成，且数量不定
- 相对视觉模型，LLM 结构简单
    - Transformers 结构，大部分是 decoder-only

### 大模型部署挑战

- 设备
    - 如何应对巨大的存储问题？低存储设备（消费级显卡、手机等）如何部署？
- 推理
    - 如何加速 token 的生成速度
    - 如何解决动态 shape，让推理可以不间断
    - 如何有效管理和利用内存
- 服务如何提升系统整体吞吐量？
- 对于个体用户，如何降低响应时间？

### 大模型部署方案

- 技术点
    - 模型并行
    - 低比特量化
    - Page Attention
    - transformer 计算和访存优化
    - Continuous Batch
    - …
- 方案
    - huggingface transformers
    - 专门的推理加速框架
        - 云端
            - lmdeploy
            - vllm
            - tensorrt-llm
            - deepspeed
            - …
        - 移动端
            - llama.cpp
            - mlc-llm
            - …

## LMDeploy 简介

LMDeploy 是 LLM 在英伟达设备上部署的全流程解决方案。包括模型轻量化、推理和服务。项目地址： https://github.com/InternLM/lmdeploy

LMDeploy 提供以下核心功能（细节详见官方仓库，这里不做赘述）：

- **高效推理引擎 TurboMind**：开发了 Persistent Batch(即 Continuous Batch)，Blocked K/V Cache，动态拆分和融合，张量并行，高效的计算 kernel等重要特性，保障了 LLMs 推理时的高吞吐和低延时。
- **有状态推理**：通过缓存多轮对话过程中 attention 的 k/v，记住对话历史，从而避免重复处理历史会话。显著提升长文本多轮对话场景中的效率。
- **量化**：LMDeploy 支持多种量化方式和高效的量化模型推理。在不同规模的模型上，验证了量化的可靠性。

**HuggingFace**

[HuggingFace](https://huggingface.co/)是一个高速发展的社区，包括Meta、Google、Microsoft、Amazon在内的超过5000家组织机构在为HuggingFace开源社区贡献代码、数据集和模型。可以认为是一个针对深度学习模型和数据集的在线托管社区，如果你有数据集或者模型想对外分享，网盘又不太方便，就不妨托管在HuggingFace。

托管在HuggingFace社区的模型通常采用HuggingFace格式存储，简写为**HF格式**。

但是HuggingFace社区的服务器在国外，国内访问不太方便。国内可以使用阿里巴巴的[MindScope](https://www.modelscope.cn/home)社区，或者上海AI Lab搭建的[OpenXLab](https://openxlab.org.cn/home)社区，上面托管的模型也通常采用**HF格式**。

**TurboMind**

TurboMind是LMDeploy团队开发的一款关于LLM推理的高效推理引擎，它的主要功能包括：LLaMa 结构模型的支持，continuous batch 推理模式和可扩展的 KV 缓存管理器。

TurboMind推理引擎仅支持推理TurboMind格式的模型。因此，TurboMind在推理HF格式的模型时，会首先自动将HF格式模型转换为TurboMind格式的模型。**该过程在新版本的LMDeploy中是自动进行的，无需用户操作。**

几个容易迷惑的点：

- TurboMind与LMDeploy的关系：LMDeploy是涵盖了LLM 任务全套轻量化、部署和服务解决方案的集成功能包，TurboMind是LMDeploy的一个推理引擎，是一个子模块。LMDeploy也可以使用pytorch作为推理引擎。
- TurboMind与TurboMind模型的关系：TurboMind是推理引擎的名字，TurboMind模型是一种模型存储格式，TurboMind引擎只能推理TurboMind格式的模型。

## 量化

总的来说，量化是一种以参数或计算中间结果精度下降换空间节省（以及同时带来的性能提升）的策略。

正式介绍 LMDeploy 量化方案前，需要先介绍两个概念：

- 计算密集（compute-bound）: 指推理过程中，绝大部分时间消耗在数值计算上；针对计算密集型场景，可以通过使用更快的硬件计算单元来提升计算速度。
- 访存密集（memory-bound）: 指推理过程中，绝大部分时间消耗在数据读取上；针对访存密集型场景，一般通过减少访存次数、提高计算访存比或降低访存量来优化。

常见的 LLM 模型由于 Decoder Only 架构的特性，实际推理时大多数的时间都消耗在了逐 Token 生成阶段（Decoding 阶段），是典型的访存密集型场景。

那么，如何优化 LLM 模型推理中的访存密集问题呢？ 我们可以使用**KV8量化**和**W4A16**量化。KV8量化是指将逐 Token（Decoding）生成过程中的上下文 K 和 V 中间结果进行 INT8 量化（计算时再反量化），以降低生成过程中的显存占用。W4A16 量化，将 FP16 的模型权重量化为 INT4，Kernel 计算时，访存量直接降为 FP16 模型的 1/4，大幅降低了访存成本。Weight Only 是指仅量化权重，数值计算依然采用 FP16（需要将 INT4 权重反量化）。

## 作业

![截屏2024-04-22 13.20.58.png](https://picture.fanfer.top/img/intern51.png)