---
title: 书生·浦语大模型实战营（六）：Lagent & AgentLego 智能体应用搭建
date: 2024-04-22 10:04:57
tags: 
    - InternLM2
    - 笔记
categories:
    - 笔记
description: Hello world this is fanfer's Blog!
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/InternLM2.webp
---
文档：https://github.com/InternLM/Tutorial/tree/camp2/agent

视频：https://www.bilibili.com/video/BV1Xt4217728/?spm_id_from=333.788&vd_source=3194af3e77968cb10b1d50711d07106a

仓库：

https://github.com/InternLM/Lagent

https://github.com/InternLM/AgentLego

> **什么是智能体**
1.可以感知环境中的动态条件。
(perception of dynamic conditions in the environment)
2.能采取动作影响环境。
(action to affect conditions in the environment)
3.能运用推理能力理解信息、解决问题、产生推断、决定动作。
(reasoning to interpret perceptions, solve problems, draw inferences, and determine actions)
—Hayes-Roth 1995
An Architecture for Adaptive Intelligent Systems
> 

大脑：作为控制器，承担记忆、思考和决策任务。接受来自感知模块的信息，并采取相应动作。

---

感知：对外部环境的多模态信息进行感知和处理。包括但不限于图像、音频、视频、传感器等。

---

动作：利用并执行工具以影响环境。工具可能包括文本的检索、调用相关 API、操控机械臂等。

---

## Lagent

Lagent 是一个轻量级开源智能体框架，旨在让用户可以高效地构建基于大语言模型的智能体。同时它也提供了一些典型工具以增强大语言模型的能力。

Lagent 目前已经支持了包括 AutoGPT、ReAct 等在内的多个经典智能体范式，也支持了如下工具：

- Arxiv 搜索
- Bing 地图
- Google 学术搜索
- Google 搜索
- 交互式 IPython 解释器
- IPython 解释器
- PPT
- Python 解释器

## AgentLego

AgentLego 是一个提供了多种开源工具 API 的多模态工具包，旨在像是乐高积木一样，让用户可以快速简便地拓展自定义工具，从而组装出自己的智能体。通过 AgentLego 算法库，不仅可以直接使用多种工具，也可以利用这些工具，在相关智能体框架（如 Lagent，Transformers Agent 等）的帮助下，快速构建可以增强大语言模型能力的智能体。

AgentLego 目前提供了如下工具：

| 通用能力 | 语音相关 | 图像处理 | AIGC |
| --- | --- | --- | --- |
| • 计算器
• 谷歌搜素 | • 文本 -> 音频（TTS）
• 音频 -> 文本（STT） | • 描述输入图像
• 识别文本（OCR）
• 视觉问答（VQA）
• 人体姿态估计
• 人脸关键点检测
• 图像边缘提取（Canny）
• 深度图生成
• 生成涂鸦（Scribble）
• 检测全部目标
• 检测给定目标
• SAM
    ◦ 分割一切
    ◦ 分割给定目标 | • 文生图
• 图像拓展
• 删除给定对象
• 替换给定对象
• 根据指令修改
• ControlNet 系列
    ◦ 根据边缘+描述生成
    ◦ 根据深度图+描述生成
    ◦ 根据姿态+描述生成
    ◦ 根据涂鸦+描述生成
• ImageBind 系列
    ◦ 音频生成图像
    ◦ 热成像生成图像
    ◦ 音频+图像生成图像
    ◦ 音频+文本生成图像 |

两者之间的关系可以用下图来表示：

![截屏2024-04-22 11.37.35.png](https://picture.fanfer.top/img/intern61.png)

## 作业
![Untitled](https://picture.fanfer.top/img/intern62.png)

![Untitled](https://picture.fanfer.top/img/intern63.png)