---
title: 书生·浦语大模型实战营（二）：InternLM Demo
tags: 
    - InternLM2
    - 笔记
categories:
    - 笔记
description: Hello world this is fanfer's Blog!
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/InternLM2.webp
---
github：[https://github.com/InternLM/Tutorial/tree/camp2](https://github.com/InternLM/Tutorial/blob/camp2/helloworld/hello_world.md)

视频地址：https://www.bilibili.com/video/BV1AH4y1H78d/

## 工具记录

```
# 从本地使用 ssh 连接 studio 端口
# 将下方端口号 38374 替换成自己的端口号
ssh -CNg -L 6006:127.0.0.1:6006 root@ssh.intern-ai.org.cn -p 38374
```

**模型下载**

**6.2.1 Hugging Face**

使用 `Hugging Face` 官方提供的 `huggingface-cli` 命令行工具。安装依赖:

```
pip install -U huggingface_hub
```

然后新建 `python` 文件，填入以下代码，运行即可。

- resume-download：断点续下
- local-dir：本地存储路径。

其中 linux 环境下需要填写绝对路径.

```
import os
# 下载模型
os.system('huggingface-cli download --resume-download internlm/internlm2-chat-7b --local-dir your_path')
```

以下内容将展示使用 `huggingface_hub` 下载模型中的部分文件

```
import os
from huggingface_hub import hf_hub_download  # Load model directly

hf_hub_download(repo_id="internlm/internlm2-7b", filename="config.json")
```

**6.2.2 ModelScope**

使用 `modelscope` 中的 `snapshot_download` 函数下载模型，第一个参数为模型名称，参数 `cache_dir` 为模型的下载路径。

注意：`cache_dir` 最好为绝对路径。

安装依赖：

```
pip install modelscope==1.9.5
pip install transformers==4.35.2
```

在当前目录下新建 `python` 文件，填入以下代码，运行即可。

```
import torch
from modelscope import snapshot_download, AutoModel, AutoTokenizer
import os
model_dir = snapshot_download('Shanghai_AI_Laboratory/internlm2-chat-7b', cache_dir='your path', revision='master')
```

**6.2.3 OpenXLab**

`OpenXLab` 可以通过指定模型仓库的地址，以及需要下载的文件的名称，文件所需下载的位置等，直接下载模型权重文件，使用 `download`函数导入模型中心的模型。

```
import torch
import os
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoModel
base_path = './local_files'
os.system('apt install git')
os.system('apt install git-lfs')
os.system(f'git clone https://code.openxlab.org.cn/Usr_name/repo_name.git {base_path}')
os.system(f'cd {base_path} && git lfs pull')
```

**6.3 （可选参考）软链接清除方法**

当我们建立安全链接之后，如果想要将其删除可以选择以下命令：

```
unlink link_name
```

我们举一个例子，当我想删除软链接 `/root/demo/internlm2-chat-7b` 时：

```
cd /root/demo/
unlink internlm2-chat-7b
```

## 作业

chat：

![Untitled](https://picture.fanfer.top/img/Intern12.png)

## Lagent

Lagent 是一个轻量级、开源的基于大语言模型的智能体（agent）框架，支持用户快速地将一个大语言模型转变为多种类型的智能体，并提供了一些典型工具为大语言模型赋能。它的整个框架图如下:

!https://github.com/InternLM/Tutorial/raw/camp2/helloworld/images/Lagent-1.png

Lagent 的特性总结如下：

- 流式输出：提供 stream_chat 接口作流式输出，本地就能演示酷炫的流式 Demo。
- 接口统一，设计全面升级，提升拓展性，包括：
    - Model : 不论是 OpenAI API, Transformers 还是推理加速框架 LMDeploy 一网打尽，模型切换可以游刃有余；
    - Action: 简单的继承和装饰，即可打造自己个人的工具集，不论 InternLM 还是 GPT 均可适配；
    - Agent：与 Model 的输入接口保持一致，模型到智能体的蜕变只需一步，便捷各种 agent 的探索实现；
- 文档全面升级，API 文档全覆盖。

调用数据分析：
![Untitled](https://picture.fanfer.top/img/Intern11.png)