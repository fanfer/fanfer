---
title: HuggingFace-下载模型
date: 2024-1-18 15:48:40
tags:
    - 笔记
    - HuggingFace
categories:
    - 笔记
    - HuggingFace
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/huggingfacepipeline.png
---
# Hugging Face保存模型

# Cache setup

如果本地和缓存中均没有模型的话，那么运行`model.fromPretrained`会从huggingface官网中下载模型，保存到本地的默认路径`~/.cache/huggingface/hub`.下

因此可以从`~/.cache/huggingface/hub`下进入删除你不再需要的模型参数

# Offline mode

如果在有防火墙或者离线的情况下使用Huggingface在cache file中保存的文件，通过设置环境变量

`TRANSFORMERS_OFFLINE=1`.如果要使用本地的数据集，设置`HF_DATASETS_OFFLINE=1`.

```bash
HF_DATASETS_OFFLINE=1 TRANSFORMERS_OFFLINE=1 \
python examples/pytorch/translation/run_translation.py --model_name_or_path t5-small --dataset_name wmt16 --dataset_config ro-en ...
```

上述指令就不会尝试从huggingface在线的加载模型

同时也可以选**[from_pretrained()](https://huggingface.co/docs/transformers/v4.34.0/en/main_classes/model#transformers.PreTrainedModel.from_pretrained)**在模型加载的时候传递一个参数`local_files_only`

```bash
from transformers import T5Model

model = T5Model.from_pretrained("./path/to/local/directory", local_files_only=True)
```

# 离线保存模型参数

- 从**[Model Hub](https://huggingface.co/models)下载**
- 使**[PreTrainedModel.from_pretrained()](https://huggingface.co/docs/transformers/v4.34.0/en/main_classes/model#transformers.PreTrainedModel.from_pretrained)** 和**[PreTrainedModel.save_pretrained()](https://huggingface.co/docs/transformers/v4.34.0/en/main_classes/model#transformers.PreTrainedModel.save_pretrained)：**

1.提前下载模型

```bash

**from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tokenizer = AutoTokenizer.from_pretrained("bigscience/T0_3B")
model = AutoModelForSeq2SeqLM.from_pretrained("bigscience/T0_3B")**
```

2.将模型保存到指定的文件夹

```bash
tokenizer.save_pretrained("./your/path/bigscience_t0")
model.save_pretrained("./your/path/bigscience_t0")
```

3.之后就可以从本地文件夹中提取模型

```bash
tokenizer = AutoTokenizer.from_pretrained("./your/path/bigscience_t0")
model = AutoModel.from_pretrained("./your/path/bigscience_t0")
```

- 使用**[huggingface_hub](https://github.com/huggingface/huggingface_hub/tree/main/src/huggingface_hub)**

```bash
python -m pip install huggingface_hub
```

```bash
from huggingface_hub import hf_hub_download

hf_hub_download(repo_id="bigscience/T0_3B", filename="config.json", cache_dir="./your/path/bigscience_t0")
```

以上代码就是从T0模型中下载了config.json文件到了指定文件夹

# 使用镜像网站
本站域名 hf-mirror.com，用于镜像 huggingface.co 域名。

更多用法（多线程加速等）详见这篇文章。简介：

方法一：使用huggingface 官方提供的 huggingface-cli 命令行工具。

(1) 安装依赖
```bash
python pip install -U huggingface_hub
```
(2) 基本命令示例：
```bash
export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download --resume-download --local-dir-use-symlinks False bigscience/bloom-560m --local-dir bloom-560m
```
(3) 下载需要登录的模型（Gated Model）
```bash
请添加--token hf_***参数，其中hf_***是 access token，请在huggingface官网这里获取。示例：
huggingface-cli download --token hf_*** --resume-download --local-dir-use-symlinks False meta-llama/Llama-2-7b-hf --local-dir Llama-2-7b-hf
```
方法二：使用url直接下载时，将 huggingface.co 直接替换为本站域名hf-mirror.com。使用浏览器或者 wget -c、curl -L、aria2c 等命令行方式即可。
下载需登录的模型需命令行添加 --header hf_*** 参数，token 获取具体参见上文。
方法三：(非侵入式，能解决大部分情况)huggingface 提供的包会获取系统变量，所以可以使用通过设置变量来解决。
```bash
HF_ENDPOINT=https://hf-mirror.com python your_script.py
```

不过有些数据集有内置的下载脚本，那就需要手动改一下脚本内的地址来实现了