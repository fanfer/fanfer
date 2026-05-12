---
title: GameFormer
date: 2023-08-12 13:42:44
tags: 
    - 论文
    - iccv
    - 笔记
categories:
    - 论文
description:
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/gameformer1.png
---
Author: Zhiyu Huang, Haochen Liu, Chen Lv
Code: https://mczhi.github.io/GameFormer/
Comment: level-k game theory for planning
Key Words: Fusion, Object Detection
Score: ⭐️⭐️⭐️⭐️⭐️
Source: ICCV2023

"hierarchical game theory" 的中文翻译是 "分层博弈论"。

trajectories翻译成中文是“轨迹”。

motion prediction 运动预测

level-k 理论是一个在行为经济学和游戏理论中使用的人类行为模型。它假设参与战略游戏的玩家根据其他玩家的行动预测来决定自己的举动。玩家因此可以按照理解其他玩家举动的深度来分类。级别-k理论假设每个玩家都认为自己是游戏中最精明的人。这被归因于许多因素,如“维护成本”或单纯的过分自信。玩家因此根据玩家认为其他竞争者所处的复杂程度而被归类为k级别。你认为他人愈幼稚,你的分类就愈低。这种模式延续至更高级别的玩家,但每个玩家只有有限的推理深度,意味着个体玩家在战略思考的深度上有所限制。

## Abstract

1.本文通过采用分层博弈论来阐述交互预测问题

2.提出了GameFormer框架：使用Transformer解码器结构，使用上一级的预测结果和环境背景来迭代地改进交互过程

3.提出一个学习过程，以调节agent在当前级别的行为，以响应上一级别其他agent的行为

## Conclusion

本论文介绍了 GameFormer，这是一种基于 Transformer 的模型，利用分层博弈论进行交互式预测和规划。我们提出的方法在预测模型中加入了新颖的level-k解码器，用于迭代地改善交互代理的未来轨迹，同时还有一个学习过程，根据上一级的预测结果来调节代理的预测行为。在 Waymo 开放数据集上的实验结果表明，我们的模型在交互预测方面达到了最先进的精度，并在开环和闭环规划测试中优于基线方法。

## Introduction

问题：准确预测周围交通参与者的未来行为并做出安全的符合规范的决策（Motion Prediction and planning）

挑战：交通参与者的行为依赖于道路结构，交通规范和交通参与者之间的相互作用

Transformer模型：flexibility and effectiveness 擅长处理多种类别的混合信息，以及处理这些不同类别元素之间的关系。所以在运动模型预测中应用广泛

当前方法的问题：对于驾驶场景编码，利用agent过去的轨迹表示交互，缺少对未来交互的明确建模。缺少了自动驾驶车辆之间的交互。

条件预测模型：使用自动驾驶车辆的内部计划来预测其他代理对自动驾驶车辆的反应。这种单向交互方案仍然忽略了自动驾驶车辆和其他道路用户之间的动态相互影响。从博弈论的角度来看，当前的预测/规划模型可以被看作是具有有限交互层级的领导者-追随者博弈。

![Gameformer1](https://picture.fanfer.top/img/gameformer1.png)

图一：

我们采用分层推理博弈以迭代的方式来建模代理之间的未来交互，以更好地反映认知推理过程。

首先，我们使用Transformer编码器将驾驶场景编码为背景信息，包括向量化地图和观察到的代理状态。在未来的解码阶段，我们遵循k-level博弈论，假设代理进行有限次的策略推理。

0层agent独立行动而不考虑其他代理，而k层agent则假定其他agent处于k-1层，并做出反应。具体而言，我们设置了一系列Transformer解码器来实现k-level推理。

level-0解码器仅使用初始的模态查询和编码的场景上下文作为键和值来预测代理的多模态未来轨迹。然后，在每个迭代k中，level-k解码器将来自level-(k-1)解码器的预测轨迹，以及背景信息作为输入，来预测当前级别下代理的轨迹。

此外，我们设计了一个学习过程，通过规范化代理的轨迹来避免与上一级其他代理的轨迹发生碰撞，同时也确保接近于人类驾驶数据。

本文贡献：

1. 我们提出了GameFormer，这是一个基于Transformer的交互预测和规划框架，利用分层推理来建模agent之间的交互。
2. 我们设计了一个学习过程，基于level-k博弈来训练该框架。
3. 在Waymo交互预测的benchmark中获得SOTA
4. 我们验证了该框架在开环驾驶场景和闭环模拟中的规划性能，并研究了博弈论设置的影响。

## Methodology（Game Former）
提出的框架从代理交互的层次博弈模型中得到启发。该框架通过基于转换器的编码器将代理和地图的历史状态编码为背景信息。基于初始模态查询，0级代理的未来轨迹被独立解码。在level-k，一个代理响应level-(k-1)的所有其他代理。0级解码器使用模态嵌入和代理历史编码作为查询输入，以独立解码0级代理的未来轨迹和分数。k级解码器包含一个自我关注模块，以模拟在level-(k-1)级的未来交互，并将该信息附加到场景上下文编码中。
![Gameformer2](https://picture.fanfer.top/img/gameformer2.png)

GameFormer架构（Encoder-Decoder）

![Gameformer3](https://picture.fanfer.top/img/gameformer3.png)

## Experiments

**open-loop and closed-loop**

close-loop是一个动作进行一次交互，得到新的状态。

open-loop是指观察第一个状态，然后返回一系列动作，这些都是agent自己想的。

数据集：Waymo Open Motion Dataset(包含1200h真实驾驶数据)
给定智能体过去 1 秒在相应地图上的轨迹，预测最多 8 名智能体未来 8 秒的位置。
测试集的真实未来数据隐藏。因此，测试集仅包含 1 秒的历史数据。
验证集包含用于模型开发的真实未来数据。
此外，测试集和验证集还提供了要预测的场景中最多 8 个对象轨迹的列表。

所有指标都是通过首先将所有对象存储到对象类型中来计算的。然后按类型计算指标。每种对象类型的指标（miniADE、miniFDE、Miss Rate、和 mAP）均在 3、5 和 8 秒时间点处计算
