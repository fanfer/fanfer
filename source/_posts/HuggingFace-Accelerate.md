---
title: HuggingFace Accelerate
date: 2023-08-21 10:24:40
tags:
    - 笔记
    - HuggingFace
categories:
    - 笔记
    - HuggingFace
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/huggingfacepipeline.png
---
## ****使用 🤗 Accelerate 进行分布式训练****

随着模型变得越来越大，并行训练已经成为在有限的硬件上训练更大模型，并将训练速度提高几个数量级的必备策略。Hugging Face 创建了**[🤗 Accelerate](https://huggingface.co/docs/accelerate)**库，在任何类型的分布式设置上轻松训练 🤗 Transformers 模型，无论是一台机器上的多个 GPU 还是跨多台机器的多个 GPU。

本文关于如何自定义 PyTorch 训练循环以在分布式环境中启用训练。

## **Setup**

首先安装下载分布式训练库 **🤗 Accelerate** 并导入

```python
!pip install accelerate

from accelerate import Accelerator

accelerator = Accelerator()
```

如果你需要自己手动的分配每块GPU的内存，那么在初始化的时候需要传递参数`device_placement=False`

然后将所有的训练相关的对象传递给prepare函数，包括用于训练和用于模型评估的Dataloader、model和optimizer

```python
train_dataloader, eval_dataloader, model, optimizer = accelerator.prepare(
    train_dataloader, eval_dataloader, model, optimizer
)
```

训练的实际批量大小将是所使用的设备数量乘以您在脚本中设置的批量大小:例如，在创建train_dataloader时设置的批量大小为16的4个GPU上的训练将在实际批量大小为64时进行训练。

或者，可以在创建和初始化加速器时使用`split_batches=True`选项，在这种情况下，无论您在1、2、4或64个GPU上运行脚本，批处理大小都将保持不变。

在执行此方法时，您的训练数据加载器可能会更改长度:如果您在X个GPU上运行，它的长度将除以X(因为您的实际批处理大小将乘以X)，除非设置`split_batches=True`。

## 反向传递

将loss.backward()替换成accelerate的backward方法

```python
for epoch in range(num_epochs):
    for batch in train_dataloader:
        outputs = model(**batch)
        loss = outputs.loss
        accelerator.backward(loss)

        optimizer.step()
        lr_scheduler.step()
        optimizer.zero_grad()
        progress_bar.update(1)
```

只需要做以下修改

```python
+ from accelerate import Accelerator
  from transformers import AdamW, AutoModelForSequenceClassification, get_scheduler

+ accelerator = Accelerator()

  model = AutoModelForSequenceClassification.from_pretrained(checkpoint, num_labels=2)
  optimizer = AdamW(model.parameters(), lr=3e-5)

- device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
- model.to(device)

+ train_dataloader, eval_dataloader, model, optimizer = accelerator.prepare(
+     train_dataloader, eval_dataloader, model, optimizer
+ )

  num_epochs = 3
  num_training_steps = num_epochs * len(train_dataloader)
  lr_scheduler = get_scheduler(
      "linear",
      optimizer=optimizer,
      num_warmup_steps=0,
      num_training_steps=num_training_steps
  )

  progress_bar = tqdm(range(num_training_steps))

  model.train()
  for epoch in range(num_epochs):
      for batch in train_dataloader:
-         batch = {k: v.to(device) for k, v in batch.items()}
          outputs = model(**batch)
          loss = outputs.loss
-         loss.backward()
+         accelerator.backward(loss)

          optimizer.step()
          lr_scheduler.step()
          optimizer.zero_grad()
          progress_bar.update(1)
```

## 模型训练

### **Train with a script**

首先创建并保存accelerate config，该配置被保存在/home/username/.cache/huggingface/accelerate/default_config.yaml路径下

```python
accelerate config
```

如果不需要使用一些其他配置，也可以直接运行

```python
python -c "from accelerate.utils import write_basic_config; write_basic_config(mixed_precision='fp16')"
```

然后使用下面的指令进行训练

```python
accelerate launch train.py
```

使用下面的指令可以查看accelerate的配置

```python
accelerate env
```

例如我的训练环境为：

```python
- `Accelerate` version: 0.21.0
- Platform: Linux-5.4.0-92-generic-x86_64-with-glibc2.10
- Python version: 3.8.16
- Numpy version: 1.24.3
- PyTorch version (GPU?): 2.0.0+cu117 (True)
- PyTorch XPU available: False
- PyTorch NPU available: False
- System RAM: 125.56 GB
- GPU type: NVIDIA GeForce RTX 3090
- `Accelerate` default config:
        - compute_environment: LOCAL_MACHINE
        - distributed_type: MULTI_GPU
        - mixed_precision: fp16
        - use_cpu: False
        - num_processes: 3
        - machine_rank: 0
        - num_machines: 1
        - rdzv_backend: static
        - same_network: False
        - main_training_topction: main
        - downcast_bf16: False
        - tpu_use_cluster: False
        - tpu_use_sudo: False
```

### **Train with a notebook**

🤗 Accelerate 也可以使用notebook进行训练 **[notebook_launcher](https://huggingface.co/docs/accelerate/v0.21.0/en/package_reference/launchers#accelerate.notebook_launcher)**:

```python
>>> from accelerate import notebook_launcher

>>> notebook_launcher(training_topction)
```

## 模型评估

至于您的训练数据加载器，这将意味着(如果您在多个设备上运行您的脚本)，每个设备将只能看到部分评估数据。这意味着你需要将你的预测组合在一起。使用gather_for_metrics()方法很容易做到这一点。
```python
for inputs, targets in validation_dataloader:
    predictions = model(inputs)
    # Gather all predictions and targets
    all_predictions, all_targets = accelerator.gather_for_metrics((predictions, targets))
    # Example of use with a *Datasets.Metric*
    metric.add_batch(all_predictions, all_targets)
```