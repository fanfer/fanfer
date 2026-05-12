---
title: Transformers Quick Start
date: 2023-08-17 16:49:06
tags:
    - 笔记
    - HuggingFace
categories:
    - 笔记
    - HuggingFace
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/hflogowithtitle.png
---
# HuggingFace入门教程

## 快速入门

在开始之前, 确保你已经安装了所有必要的库:

```python
!pip install transformers datasets
```

你还需要安装喜欢的机器学习框架: pytorch

使用`pipeline()`是利用预训练模型进行推理的最简单的方式. 你能够将`pipeline()`开箱即用地用于跨不同模态的多种任务. 它支持的任务列表:

![Untitled](https://picture.fanfer.top/img/huggingface1.png)

## 使用官方模型库中的模型

使用BLIP2作为例子，这是一个image-captioning的Image2Language模型

```python
from transformers import Blip2Processor, Blip2ForConditionalGeneration
```

使用GPU加速模型，通过processor将图片转化为模型输入，通过model实现输

```python
processor = Blip2Processor.from_pretrained("Salesforce/blip2-opt-2.7b")
model = Blip2ForConditionalGeneration.from_pretrained("Salesforce/blip2-opt-2.7b", device_map="auto")
device = "cuda" if torch.cuda.is_available() else "cpu"
```

读取一张照片完成推理

```python
image = Image.open(requests.get("https://picture.fanfer.top/Test_pics/1681699301.322593.jpg", stream=True).raw).convert('RGB')
inputs = processor(images=image, return_tensors="pt").to(device, torch.float16)
generated_ids = model.generate(**inputs)
generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
print(generated_text)
```

保存模型

```python
pt_save_directory = "./pt_save_pretrained"
processor.save_pretrained(pt_save_directory)
model.save_pretrained(pt_save_directory)
```

重新从保存的模型处加在模型

```python
processor = Blip2Processor.from_pretrained(tf_save_directory)
pt_model = Blip2ForConditionalGeneration.from_pretrained(tf_save_directory, from_tf=True)
```

## 根据Config自定义模型

可以修改模型的配置类来更改模型的构建方式。配置指定模型的属性，例如隐藏层或注意力头的数量。从自定义配置类初始化模型时，模型参数是随机初始化的，需要先训练模型，然后才能使用它来获得有意义的结果。

[Create a custom architecture](https://huggingface.co/docs/transformers/main/en/create_a_model)

```python
from transformers import AutoConfig
my_config = AutoConfig.from_pretrained("distilbert-base-uncased", n_heads=12)
from transformers import AutoModel
my_model = AutoModel.from_config(my_config)
```

## 训练模型

所有的模型都是 **`[torch.nn.Module](https://pytorch.org/docs/stable/nn.html#torch.nn.Module)`** 所以可以完成train loop. 🤗 Transformers 为PyTorch提供了 **[Trainer](https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.Trainer)** 类，可以按照下面的方法进行训练

1.导入预训练模型或者自定义模型

```python
from transformers import AutoModelForSequenceClassification
model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased")
```

2.**[TrainingArguments](https://huggingface.co/docs/transformers/main/en/main_classes/trainer#transformers.TrainingArguments)**包含可以更改的模型超参数，例如学习率、批量大小和训练周期数。如果不指定任何训练参数，则使用默认值：

```python
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir="path/to/save/folder/",
    learning_rate=2e-5,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=2,
)
```

3.加载预处理类，例如tokenizer, image processor, feature extractor, processor

```python
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
```

4.加载数据集

```python
from datasets import load_dataset
dataset = load_dataset("rotten_tomatoes")  # doctest: +IGNORE_RESULT
```

5.对数据进行预处理

```python
def tokenize_dataset(dataset):
		...
    return tokenizer(dataset["text"])

dataset = dataset.map(tokenize_dataset, batched=True)
```

6. **[DataCollatorWithPadding](https://huggingface.co/docs/transformers/main/en/main_classes/data_collator#transformers.DataCollatorWithPadding)** 从dataset中创建batch

```python
from transformers import DataCollatorWithPadding
data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
```

7.创建Trainer对象并训练
```python
from transformers import Trainer

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    tokenizer=tokenizer,
    data_collator=data_collator,
)  # doctest: +SKIP

trainer.train()
```