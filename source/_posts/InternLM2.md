---
title: 书生·浦语大模型实战营（一）：书生·浦语大模型全链路开源体系
tags: 
    - InternLM2
    - 笔记
categories:
    - 笔记
description: Hello world this is fanfer's Blog!
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/InternLM2.webp
---
# **书生·浦语大模型实战营（一）：书生·浦语大模型全链路开源体系**

github：https://github.com/InternLM/Tutorial/tree/camp2

InternLM2 报告：https://arxiv.org/pdf/2403.17297.pdf

视频地址：https://www.bilibili.com/video/BV1Vx421X72D/

![Untitled](https://picture.fanfer.top/img/Intern1.jpeg)

模型到应用的典型流程：

对于机器人领域，构建智能体应该更能满足应用场景的要求。

项目案例：

https://github.com/BestAnHongjun/InternDog

针对水面无人艇而言，在设计的过程中，应该有较好的顶层设计，哪些信息从外界API获取，哪些功能通过调用API执行，同时要注意工具是备选，应该是通过选择工作，完成指令，而不是变成分类任务，机械地调用

同时，针对特定情境下，应该通过代码生成，从而构建新的内部API

![Untitled](https://picture.fanfer.top/img/Intern2.jpeg)

![Untitled](https://picture.fanfer.top/img/Intern3.jpeg)

Lagent，借助AutoGPT等方式，实现更好的工具选择。

同时使用更加丰富的多模态智能体工具箱，多模态的信息输入对于机器人而言应该是很重要的信息补充

![Untitled](https://picture.fanfer.top/img/Intern4.jpeg)

关于微调：

增量训练的目的是了解垂类领域的知识

有监督微调的目的是完成高质量的生成，在计算能力不足的时候，对部分参数进行微调

![Untitled](https://picture.fanfer.top/img/Intern5.jpeg)

部署：不太了解，感觉涉及到更多的底层。

如何将模型轻量化，从而能实现端侧部署，应该是一个可以看的点

![Untitled](https://picture.fanfer.top/img/Intern6.jpeg)
