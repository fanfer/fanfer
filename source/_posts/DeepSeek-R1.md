---
title: DeepSeek-R1
date: '2026-01-22'
tags:
  - LLM
categories:
  - LLM
description: 'DeepSeek-R1：通过纯强化学习激发LLM推理能力，展示自我进化与蒸馏有效性'
top_img: /assets/background.JPG
---

> **快速摘要：** DeepSeek-R1是DeepSeek推出的推理模型系列，包括DeepSeek-R1-Zero和DeepSeek-R1两个版本。DeepSeek-R1-Zero探索了在无任何监督数据的条件下，通过纯强化学习（GRPO算法）提升语言模型推理能力的方法，模型在训练过程中自发涌现出反思、重新评估等复杂行为，并展现出"aha moment"。为解决R1-Zero的可读性差和多语言混合问题，DeepSeek-R1引入了少量高质量冷启动数据进行SFT，再进行推理导向的RL训练，并经过Rejection Sampling与SFT、全场景RL等阶段。本文还证明了将大模型推理模式蒸馏到小模型的有效性，蒸馏后的14B模型超越了QwQ-32B-Preview，32B和70B模型则突破了同规模模型的记录。


---

论文DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via

Reinforcement Learning

本文介绍了DeepSeek的LLM reasoning模型DeepSeek-R1-Zero和DeepSeek-R1。DeepSeek-R1-Zero通过纯粹的强化学习来提升语言模型的推理能力，在没有任何监督数据的情况下，通过强化学习过程自我演化，以提高推理能力。

DeepSeek-R1-Zero在推理benchmark中取得很好的表现，但仍然存在可读性差和多语言混合问题。为了解决这些问题并，DeepSeek提出DeepSeek-R1模型，使用小部分数据冷启动，之后再进行推理导向的强化学习训练。

本文还进一步探讨了从DeepSeek-R1到较小规模模型的蒸馏（distillation），并将蒸馏后的Qwen和Llama模型开源。蒸馏后的14B模型在推理benchmark上的表现超过了QwQ-32B-Preview（Qwen，2024a），而蒸馏后的32B和70B模型则在推理benchmark上突破了同规模模型的记录。### 本文贡献

**Post-Training：**提出直接对base模型应用强化学习的训练步骤，这种方法使模型能够探索解决复杂问题的CoT （不需要SFT，PRM，MCTS）。

**蒸馏：**证明了大模型中的推理模式可以被蒸馏到小模型中，且其性能优于直接在小模型上通过 RL 训练获得的性能。### DeepSeek-R1-Zero

DeepSeek-R1-Zero探索了在**无任何监督数据**的条件下，让LLM通过纯粹的强化学习来提升推理能力的方法，使base模型就能生成自洽的CoT推理。

DeepSeek-R1-Zero使用的RL算法和DeepSeek系列模型相同，都是不带有value model的GRPO算法：![image](/assets/art13_3e371c52ee58.jpg)

**奖励建模**：训练 DeepSeek-R1-Zero时采用rule-based的reward model，主要包含以下两种类型的奖励：- **Accuracy rewards**：用于评估模型的回答是否正确。例如，对于具有确定性结果的数学问题，模型需要以特定格式（如在方框内）给出最终答案，从而可以通过的rule-based方式对答案正确性进行验证。- **Format rewards**：格式奖励模型，要求模型将其思考过程置于 "<think\>" 和 "</think\>" 标签之间。

训练DeepSeek-R1-Zero 的过程中，没有使用额外的reward model，包括过程奖励模型（PRM）。因为使用RM可能会出现reward hacking的现象，需要重新训练奖励模型，消耗额外的训练资源，使整个训练流程变得更加复杂。

**训练模板**：在训练 DeepSeek-R1-Zero 时，设计了一个简单的模板，引导模型遵循指令。该模板要求 DeepSeek-R1-Zero 先给出推理过程，然后再给出最终答案。将思考过程约束限制在结构化格式中：![image](/assets/art13_1e8c616abf4b.jpg)

**DeepSeek-R1-Zero 的性能：**下图展示了DeepSeek-R1-Zero在AIME 2024基准上随RL训练过程的性能变化情况。随着训练的推进，DeepSeek-R1-Zero 的性能稳步且持续提升，最后达到了与 OpenAI-o1-0912 相当的表现水平。![image](/assets/art13_5ff9ec202611.jpg)![image](/assets/art13_4b1445f1ee54.jpg)

**DeepSeek-R1-Zero 的自我进化过程**：如下图所示，**DeepSeek-R1-Zero 的思考时长在整个训练过程中持续增长**。这种提升并非外部调整的结果，而是模型内部的自发选择，**DeepSeek-R1-Zero 自然而然地学会了利用更长的test-time** **computation来解决愈发复杂的推理任务**。该计算过程可能会从生成数百个推理tokens扩展到数千个，从而让模型能够在更深层次上探索和完善其思考过程（**最终输出长度超过10K，长文模型**）。![image](/assets/art13_57a68780c1ea.jpg)

观察发现，DeepSeek-R1-Zero的自我进化过程中，模型会出现更复杂的行为。模型可能会进行反思——回顾并重新评估之前的推理步骤——然后探索替代的解决方案。**这些行为并非通过显式编程实现，而是模型在与环境交互过程中自发涌现的。**此类自发发展极大地增强了DeepSeek-R1-Zero的推理能力，使其能够以更高效、更准确的方式应对更具挑战性的任务。

**DeepSeek-R1-Zero 的aha moment**：在训练 DeepSeek-R1-Zero 的过程中，观察到了 "aha moment"。如下表所示，这一时刻出现在模型的某个中间版本。DeepSeek-R1-Zero 通过重新评估其初始方法，为问题分配了更多的思考时间。这种行为不仅证明了模型推理能力会不断提升，也展示了强化学习会带来意料之外且更为复杂的结果：![image](/assets/art13_c36858ca20b1.jpg)

aha moment表明，**与其显式地教模型如何解题，只需提供合适的奖励，模型便能自主发展出先进的问题解决策略**。

**DeepSeek-R1-Zero 的缺点**：尽管 DeepSeek-R1-Zero 展现出了强大的推理能力，它仍然面临一些问题。DeepSeek-R1-Zero 在可读性和语言混合等方面存在不足。为了解决这些问题，本文进一步提出了DeepSeek-R1，在强化学习中结合了冷启动数据。### DeepSeek-R1: Reinforcement Learning with Cold Start

DeepSeek-R1模型通过引入少量高质量数据来冷启动，加速了收敛过程，并且改进了RL流程使模型能够生成清晰连贯的CoT。

DeepSeek-R1 的训练流程由以下几个阶段构成：

**冷启动：**为了避免从base模型直接开始强化学习训练，训练初期出现训练不稳定的现象，DeepSeek-R1构建并收集了一小部分长链式思考数据，用于微调模型，之后再进行RL。收集数据时探索了几种方法：- 使用few-shot prompting，以长CoT作为示例- 直接提示模型生成带有反思和验证的详细答案- 收集DeepSeek-R1-Zero输出的可读格式的数据- 通过人工标注后的后处理来优化结果

本工作收集了数千条冷启动数据，对DeepSeek-V3-Base进行微调，作为RL的起点。与 DeepSeek-R1-Zero 相比，使用冷启动数据具有以下优势：- **可读性提高**：DeepSeek-R1-Zero的主要局限在于其输出内容往往不适合阅读。回答中可能会混杂多种语言，或缺乏markdown格式来突出答案。而在为DeepSeek-R1创建冷启动数据时，设计了一种易读的模式，即在每个回答末尾包含摘要，并过滤掉那些不友好的输出。格式如下：**![image](/assets/art13_b4655e32c34d.jpg)- 潜力提升**：使用人类先验设计的冷启动数据之后，模型性能较DeepSeek-R1-Zero有所提升。

**面向推理的强化学习**: 在使用冷启动数据进行微调后，采用与DeepSeek-R1-Zero相同的大规模强化学习训练流程。该阶段主要增强模型的推理能力，尤其是在编码、数学、科学和逻辑推理等推理任务上，这些任务具有明确的问题定义和清晰的解答。在训练过程中，发现CoT往往会出现语言混合现象，特别是在prompt涉及多种语言时。为缓解语言混合问题，在RL训练中引入了**语言一致性奖励**，其计算方式为CoT中目标语言单词所占比例。虽然消融实验显示这种对齐会略微降低模型的整体表现，但该奖励符合人类偏好，使输出更加易读。最后，会将推理任务的准确性奖励和语言一致性奖励直接相加，形成最终奖励。

**Rejection** **Sampling与SFT**：面向推理的RL收敛后，会利用得到的checkpoint收集下一轮SFT数据。与最初关注的推理数据不同，这一阶段引入了其他领域的数据，以提升模型在写作、角色扮演及其他通用任务方面的能力。按照如下方式生成数据并微调模型：- **推理数据**：对上述RL训练得到的checkpoint进行Rejection Sampling生成推理轨迹。在之前的阶段，训练数据只包含能够通过规则奖励进行评估的数据；但在这一阶段，**会引入额外数据扩充数据集**，其中部分数据利用生成型奖励模型（将真实答案与模型的回复输入DeepSeek-V3进行评判）获得。此外，由于模型输出有时较为混乱且难以阅读，会过滤掉包含混合语言、冗长段落和代码块的链式思考。对于每个prompt，会采样多个回答，并仅保留正确的答案。最终共收集了约 60 万条与推理相关的训练样本。- **非推理数据**：对于写作、事实问答、自我认知和翻译等非推理数据，采用DeepSeek-V3 的流程，并复用部分DeepSeek-V3的SFT数据集。对于某些非推理任务，会调用DeepSeek-V3，在回答问题前生成潜在的链式思考；最终共收集了大约20万条与推理无关的训练样本。

使用上述约80万条精心整理的数据集，对DeepSeek-V3-Base进行了2 epoch的微调。

**面向所有场景的强化学习**：为了进一步使模型符合人类偏好，再一次进行强化学习，旨在提升模型的有用性和无害性，同时进一步优化其推理能力。这里会结合多种奖励信号：- 对于推理数据，遵循 DeepSeek-R1-Zero的方法，利用基于规则的奖励引导数学、代码和逻辑推理等领域的学习；- 对于通用数据，则采用奖励模型来捕捉复杂且细微场景下的人类偏好。基于 DeepSeek-V3 的流程，并采用类似的偏好对分布和训练prompt。

在有用性方面，只关注最终输出，确保评估时强调回答的实用性和相关性，同时尽量减少对底层推理过程的干扰；而在无害性方面，会对模型的整个输出（包括推理过程和最终输出）进行评估，以识别并降低生成过程中可能出现的风险、偏见或有害内容。### 蒸馏

为了让更高效的小模型具备类似 DeepSeek-R1 的推理能力，使用DeepSeek-R1整理的约 80万条样本对开源模型（Qwen，Llama）进行微调。研究结果表明，这种简单直接的蒸馏方法显著增强了小模型的推理能力。微调的基础模型包括 Qwen2.5-Math-1.5B、Qwen2.5-Math-7B、Qwen2.5-14B、Qwen2.5-32B、Llama-3.1-8B 以及 Llama-3.3-70B-Instruct。

对于蒸馏得到的模型，仅采用SFT，而未加入RL，尽管引入RL可能会显著提升模型性能，但这里主要目标是展示蒸馏的有效性，所以没有进行RL阶段的探索。### 实验

**Benchmark**：在MMLU、MMLU-Redux、MMLU-Pro、C-Eval、CMMLU、IFEval、FRAMES、GPQA Diamond、SimpleQA、C-SimpleQA、SWE-Bench Verified、LiveCodeBench、Codeforces 2、CNMO 2024和AIME 2024等benchmark上进行了测试

除了标准benchmark外，还在开放式生成任务（例如AlpacaEval 2.0和Arena-Hard上），利用GPT-4-Turbo-1106来评估。

对于蒸馏模型，在AIME 2024、MATH-500、GPQA Diamond、Codeforces 和 LiveCodeBench 上的进行评估。

**Baseline**：对比DeepSeek-V3、Claude-Sonnet-3.5-1022、GPT-4o-0513、OpenAI-o1-mini 和 OpenAI-o1-1217，以及QwQ-32B-Preview。

**评估指标**：pass@1。![image](/assets/art13_08a1018b4880.jpg)

**评估结果：**R1模型评估结果如下：![image](/assets/art13_0c802d7567dc.jpg)

推理任务上DeepSeek-R1相比DeepSeek-V3表现更优，与o1相当。

此外，DeepSeek-R1在AlpacaEval 2.0和Arena-Hard上表现出色，表明其在写作任务和问答任务上的优势。DeepSeek-R1凭借大规模强化学习的泛化优势，不仅增强了推理能力，还提升了在多个领域的表现。

蒸馏模型评估结果如下：![image](/assets/art13_6069e3a9414e.jpg)

R1的蒸馏模型相比于同规模模型也有较大的提升。

**蒸馏大模型与强化学习比较：**对于小模型而言，直接整理大模型要比用小模型强化学习的效果更佳。![image](/assets/art13_c7c975638c9e.jpg)

更强大的模型蒸馏成小模型能够取得优异的效果，而依赖本文所述的大规模强化学习的方案训练小模型则需要巨大的计算资源，甚至可能无法达到蒸馏模型的性能。

**失败的尝试：**在开发DeepSeek-R1的早期阶段，DeepSeek尝试了PRM和MCTS，然而最终放弃了这个方案。

**过程奖励模型（PRM）**：在实践中，PRM 存在三个主要限制。首先，很难显式地定义一般推理中的细粒度步骤。其次，很难判断当前中间步骤是否正确。使用模型自动评估无法获得令人满意的结果，而手动评估又不利于规模化。第三，一旦引入基于模型的 PRM，会不可避免地导致reward hacking，并且重新训练奖励模型需要额外的训练资源。

**蒙特卡洛树搜索（MCTS）**：MCTS存在几个问题。首先，与棋类游戏相比，token的搜索空间呈指数增长。为每个节点设置最大扩展限制会导致模型陷入局部最优。其次，value model直接影响生成质量，训练一个精细的value model很难。### 不足

Deepseek-R1还存在一些不足之处：

**通用能力**：DeepSeek-R1在函数调用、多轮对话、复杂角色扮演和JSON输出等任务上，能力不及 DeepSeek-V3。

**语言混合**：DeepSeek-R1针对中文和英文进行了优化，这可能会导致在处理其他语言时出现语言混合问题。例如，即使query是其他语言，DeepSeek-R1也可能会使用英文进行推理和回答。

**提示工程：**DeepSeek-R1对prompt非常敏感。Few-shot prompting会降低其表现。建议用户在zero-shot设置中直接描述问题并指定输出格式，以获得最佳结果。

**软件工程任务：**大规模强化学习尚未广泛应用于Software Engineering 任务。DeepSeek-R1 在Software Engineering  benchmark上未能展现出比 DeepSeek-V3 更大的优势。
