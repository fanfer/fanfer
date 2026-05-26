---
title: Seed-Thinking-v1.5
date: '2025-03-01'
tags:
  - LLM
categories:
  - LLM
description: 'Seed-Thinking-v1.5：字节跳动MoE推理模型，20B激活参数实现卓越推理能力'
top_img: /assets/background.JPG
---

> **快速摘要：** Seed-Thinking-v1.5是字节跳动推出的推理模型，采用MoE架构，具有20B激活参数和200B总参数。该模型在STEM和编程领域展现了卓越的推理能力，同时在非推理任务上也具备良好的泛化能力。训练数据分为可验证问题（STEM、代码、逻辑推理）和不可验证问题（创意写作、翻译等），并开发了Seed-Verifier和Seed-Thinking-Verifier两种渐进式奖励建模方案。算法层面融合了VC-PPO、DAPO、VAPO等技术，采用Online Data Distribution Adaptation解决不同数据领域间的干扰问题。此外，本文还构建了BeyondAIME和Codeforces两个新benchmark，用于更全面地评估推理能力。

原文链接: https://zhuanlan.zhihu.com/p/1901269311118640868

---

论文Seed-Thinking-v1.5: Advancing Superb Reasoning Models with Reinforcement Learning，原文[https://github.com/ByteDance-Seed/Seed-Thinking-v1.5/blob/main/seed-thinking-v1.5.pdf](http://link.zhihu.com/?target=https%3A//github.com/ByteDance-Seed/Seed-Thinking-v1.5/blob/main/seed-thinking-v1.5.pdf)。

本文介绍了字节的Seed-Thinking-v1.5模型，该模型为推理模型，在STEM和编程领域的卓越推理能力，用时在非推理任务上也展现出了显著的泛化能力。Seed-Thinking-v1.5是MoE模型，具有20B激活参数和200B总参数，规模较小，但仍能发挥出较高水平。同时，本文还开发了BeyondAIME和Codeforces两个benchmark。

在Seed-Thinking-v1.5推理模型的开发中，有三个关键点：训练数据、RL算法和RL基建，后文将对此进行详细讨论。### 数据

RL训练数据由两个主要部分组成：具有明确答案的可验证问题和没有明确答案的非可验证问题。模型的推理能力主要来自第一部分，并且可以泛化到第二部分。

**可验证问题**：可验证问题主要包括配有答案的STEM问题、配备单测的编程问题以及可进行自动化验证的逻辑推理。

**STEM数据：**数据集由数十万个涵盖数学、物理和化学的高质量、竞赛级别的问题组成，其中数学问题占多数（超过80%）。之后对数据进行清洗，消除陈述不完整、符号不一致或要求不明确的问题。对于剩余的问题，使用Doubao-Pro 1.5生成多个response。**模型在某个问题上worst of N为1分的问题被认为过于简单，会被移除**。最后，一些问题可能有不准确的参考答案。使用SOTA推理模型为每个问题生成多个候选response。**如果模型的答案与参考答案不一致，但模型的输出显示出高度的内部一致性，或者仅涉及极少量的推理token，会认为参考答案不正确**。然后，人类专家对这些问题进行手动验证，以确保参考答案的正确性。**本文还应用数据增强来使数据更适合学习和评估，会将多项选择题转换为填空或简答题格式，以消除猜测的可能性并更好地评估推理能力。还修改了部分数学问题，以确保答案始终是整数，避免答案的小数误差。**

在数据清洗和增强之后，最终获得了一个包含10万个STEM问题的训练集。在训练过程中，会使用基于模型的Seed-Verifier来评估响应的正确性。

**代码数据：**对于编程问题，数据主要来竞争性编程竞赛。会过滤数据以确保每个问题都包含全面的规范：清晰的问题描述、单元测试和检查脚本。单元测试验证解决方案的功能正确性，而检查脚本强制执行额外的约束，如输出格式和边界情况。还对难度进行过滤，确保问题具有适当的复杂度和适用性。

对于评估，本文开发了一种离线评估方法。所有训练和评估的问题都集成到内部的代码沙盒环境中，从而能够直接执行和评估模型生成的代码。

**逻辑推理数据**：收集了22个常见的研究任务，如24点、数独、迷宫等。对于每个任务，会构建了数据生成器和答案验证器。数据生成器可以自动生成大量的训练和评估数据。此外，很多任务可以配置生成问题的难度。**在训练过程中，会根据模型在某些任务上的表现逐渐调整训练数据的难度。**答案验证器严格评估生成的正确性，并可以无缝集成到强化学习中作为奖励函数。本文为强化学习训练生成了大约1万个逻辑推理问题。

**非可验证问题：**非可验证问题主要包括需要基于人类偏好进行质量评估的非推理任务，涉及创意写作、翻译、知识问答、角色扮演等任务。这些任务的prompt来源于Doubao-1.5 Pro强化学习训练数据。

本文会摒弃样本得分方差低且难度低的数据。具体而言，会使用SFT模型为每个提示生成多个候选答案，然后使用奖励模型对它们进行评分。**首先会移除得分方差低的prompt，因为它们表现出的采样多样性有限，并且改进潜力极小。同时，在Doubao 1.5 Pro强化学习训练过程中，奖励分数提升超过某一阈值的prompt也会被移除。**此类数据可能过于简单，或者已在数据集中大量存在。实验表明，过度优化此类样本会导致模型探索空间的过早崩溃，并降低性能。

对于这些不可验证的数据，本文采用pair-wise的奖励方法进行强化学习训练的评分，比较两个样本的相对质量。

**高级数学benchmark**：当前的推理模型通常使用AIME作为主要benchmark来评估数学推理能力，其有限的数量可能导致高方差评估结果。为了更好地评估模型在数学推理方面的能力，本文构建了一个新的基准数据集：BeyondAIME。通过严格的筛选，编制了最终的100个问题集，每个问题的难度等于或大于AIME中最难问题的难度。与AIME类似，所有答案都保证为整数（且不限于特定数值范围），这简化了评估过程并使其更加稳定。### 奖励函数建模

**可验证问题**：设计了两种渐进式的奖励建模解决方案：Seed-Verifier和Seed-Thinking-Verifier。

Seed-Verifier基于一组由人类精心制定的原则，利用LLMs强大的推理能力来评估由问题、参考答案和模型生成的答案组成的三元组。**如果参考答案和模型生成的答案本质上等价，返回"YES"，否则返回"NO"。等价是基于计算规则和数学原则的更深层次的评估，以证明两个答案传达相同的数学意义。**

Seed-Thinking-Verifier受到人类判断过程的启发，通过细致的思考和深入分析生成结论性判断。本文训练了一个验证器，将训练过程视为一个可验证的任务，与其他数学推理任务一起进行优化。训练出的验证器可以剖析模型生成答案的相似性和差异性，提供精确和细致的判断结果。

Seed-Thinking-Verifier显著缓解了与Seed-Verifier相关的三个主要问题：- **Reward** **hacking**：非Seed-Thinking-Verifier中详细的推理过程使hacking更加困难。- **预测的不确定性**：在参考答案和模型生成的答案本质上等价但格式不同的情况下，例如2^19与524288，Seed-Verifier有时返回"NO"。Seed-Thinking-Verifier通过彻底分析答案背后的推理提供一致的结果。- **边缘案例**：某些边缘案例，Seed-Verifier难以有效处理。Seed-Thinking-Verifier提供详细推理的能力使其能够更好地解决这些复杂场景。

下图展示了两种验证器的性能：![image](/assets/art12_f9edb7215c1d.jpg)

**不可验证问题：**对于不可验证问题，为强化学习训练一个奖励模型。奖励模型的训练数据与Doubao 1.5 Pro中使用的人类偏好数据一致，主要包括创意写作和总结等类别。

为了提高奖励模型的有效性，本文采用了A Unified Pairwise Framework for [RLHF](https://zhida.zhihu.com/search?content_id=256924379&content_type=Article&match_order=1&q=RLHF&zhida_source=entity): Bridging Generative Reward Modeling and Policy Optimization中提到的成对生成奖励模型，该模型评估两个响应的优劣，并使用"YES"或"NO"的概率作为最终奖励分数（参考[https://zhuanlan.zhihu.com/p/1898841404463097341](https://zhuanlan.zhihu.com/p/1898841404463097341)）。这种方法使模型在评分时能够直接比较response之间的差异，从而避免过度关注无关细节。实验结果表明，这种奖励建模方法通过最小化两种不同奖励建模范式之间的冲突，提高了强化学习训练的稳定性，特别是在涉及不可验证和可验证问题的混合训练场景中。这种改进可能归因于pair-wise生成奖励模型在缓解异常分数生成方面的固有优势，从而避免了验证器在分数分布上的显著差异。### 算法

**SFT：**使用包含40万个问题的SFT数据集，其中包括30万个可验证问题和10万个不可验证问题。可验证问题是从Doubao-Pro 1.5的SFT数据中随机抽样的，涵盖了创意写作、知识问答、安全性和函数调用等领域。

本文采用了带有模型合成、人类注释和rejection sampling 的迭代工作流程。首先，人类专家使用prompt engineering技术，以及与内部模型进行交互式对话，以产生具有各种推理模式的response。在积累了数万个高质量的冷启动样本后，训练一个具有长上下文的推理模型，然后对这个推理模型使用Seed-Verifier进行rejection sampling。

在训练期间，截断长度为32000，峰值学习率为2×10−5，并逐渐衰减到2×10−6。

**强化学习：**本文开发了统一的强化学习框架，无缝融合了来自广泛领域的数据。这种融合结合了三类数据：- **可验证数据**：从验证器获得反馈。- **一般数据**：由奖励模型评分。- **特殊类别数据**：结合了来自验证器和奖励模型的分数。这种混合数据类型利用了基于验证和基于奖励评估的优势。

RLHF训练过程，会使用VC-PPO，DAPO，VAPO的一些tricks：![image](/assets/art12_524e6b378b90.jpg)

参考本专栏之前的文章，VC-PPO： [https://zhuanlan.zhihu.com/p/1889394650344846851](https://zhuanlan.zhihu.com/p/1889394650344846851)，

DAPO：[https://zhuanlan.zhihu.com/p/1891116737048594100](https://zhuanlan.zhihu.com/p/1891116737048594100)，

VAPO：[https://zhuanlan.zhihu.com/p/1897662021366968967](https://zhuanlan.zhihu.com/p/1897662021366968967)。

在合并来自不同领域的数据并整合多样化的评分机制时，面临着不同数据领域之间干扰的挑战。这种干扰可能源于难度水平的差异、reward hacking的风险以及其他潜在因素。为了应对这一问题，本文使用入了Online Data Distribution Adaptation的方式，将在强化学习过程中将固定的prompt分布转换为自适应分布，以更好地满足模型在训练过程中的需求，确保在不同能力上实现更平衡的提升。### RL基建

**框架：**训练框架使用HybridFlow编程。整个训练工作负载在Ray集群上运行。数据加载器和RL算法在单个进程Ray Actor中实现。模型训练和response生成以流控制方式在Ray Worker Group中实现。单控制器调用Ray Worker Group暴露的各种API来构建训练流。

**Streaming Rollout System：**Seed-Thinking-v1.5通过混合引擎架构进行训练，在长上下文生成期间，由于不同提示之间响应长度的巨大差异导致的严重GPU空闲时间的straggler现象。为了缓解straggler长尾repsonse生成问题，本文提出了Streaming Rollout System，会策略性地部署独立的流控制计算单元，将系统约束从内存限制转换为计算限制。

设置超参数，控制on-policy和off-policy数据的比例：![image](/assets/art12_c0cc9e7a8dab.jpg)

使用动态精度调整，FP8精度进行后训练，并且结合了TP，EP，SP混合并行。

**训练系统：**TP/EP/CP混合并行，各个mini batch之间长度平衡，各层之间recompute/offload，自动并行，checkpoint加载，**![image](/assets/art12_f01063f89417.jpg)**### 实验

自动评估结果：![image](/assets/art12_8f9e96a36621.jpg)

人类评估结果：![image](/assets/art12_f093de8afe00.jpg)

预训练模型的影响：RFT初始化的预训练模型效果会更差。![image](/assets/art12_1b8ce56f51f9.jpg)
