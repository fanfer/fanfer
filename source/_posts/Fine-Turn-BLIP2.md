---
title: Fine Turn BLIP2
date: 2023-08-22 10:38:16
tags:
    - 教程
categories:
    - 教程
cover: https://picture.fanfer.top/Test_pics/IMG_5022.JPG
top_img: /assets/background.JPG
description: 对BLIP2进行微调的教程，目前遇到OOM问题，需要使用Accelerate进行分布式训练
---
```python
!pip install -q datasets
```

    
    [1m[[0m[34;49mnotice[0m[1;39;49m][0m[39;49m A new release of pip is available: [0m[31;49m23.1.1[0m[39;49m -> [0m[32;49m23.2.1[0m
    [1m[[0m[34;49mnotice[0m[1;39;49m][0m[39;49m To update, run: [0m[32;49mpip install --upgrade pip[0m


教程网址：
Fine-tune BLIP using Hugging Face transformers and datasets 🤗
https://colab.research.google.com/drive/1lbqiSiA0sDF7JDWPeS0tccrM85LloVha?usp=sharing

讨论区：
https://github.com/salesforce/BLIP/issues/37

数据集制作方法：
https://colab.research.google.com/drive/1HLxgrG7xZJ9FvXckNG61J72FkyrbqKAA?usp=sharing

```python
import json

root = "image_in_rainly_river/"

from datasets import load_dataset 
```

    /home/huyifan/anaconda3/envs/yolov5/lib/python3.8/site-packages/tqdm/auto.py:21: TqdmWarning: IProgress not found. Please update jupyter and ipywidgets. See https://ipywidgets.readthedocs.io/en/stable/user_install.html
      from .autonotebook import tqdm as notebook_tqdm



```python
dataset = load_dataset("imagefolder",data_dir=root,split="train")
```

    Resolving data files: 100%|████████████████████████████████████████████████████████████████| 171/171 [00:00<00:00, 201524.58it/s]



```python
dataset
```




    Dataset({
        features: ['image', 'caption'],
        num_rows: 170
    })




```python
example = dataset[0]
image = example["image"]
width, height = image.size
display(image.resize((int(0.3*width), int(0.3*height))))
```


    
![png](https://picture.fanfer.top/Test_pics/IMG_5022.JPG)
    



```python
example["caption"]
```




    'a narrow river in the city with buildings on both sides'




```python
from torch.utils.data import Dataset
```


```python
class ImageCaptioningDataset(Dataset):
    def __init__(self, dataset, processor):
        self.dataset = dataset
        self.processor = processor

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, idx):
        item = self.dataset[idx]

        encoding = self.processor(images=item["image"], text=item["caption"], padding="max_length",return_tensors="pt")

        # remove batch dimension
        encoding = {k:v.squeeze() for k,v in encoding.items()}

        return encoding
```


```python
from transformers import Blip2Processor, Blip2ForConditionalGeneration
```


```python
processor = Blip2Processor.from_pretrained("Salesforce/blip2-opt-2.7b")
```


```python
model = Blip2ForConditionalGeneration.from_pretrained("Salesforce/blip2-opt-2.7b")
```

    Loading checkpoint shards: 100%|██████████████████████████████████████████████████| 2/2 [00:14<00:00,  7.09s/it]



```python
train_dataset = ImageCaptioningDataset(dataset, processor)
```


```python
from torch.utils.data import DataLoader

train_dataloader = DataLoader(train_dataset, shuffle=True, batch_size=1)
```


```python
import torch

optimizer = torch.optim.AdamW(model.parameters(), lr=5e-5)
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
```

```python
model.train()
for epoch in range(50):
  print("Epoch:", epoch)
  for idx, batch in enumerate(train_dataloader):
    input_ids = batch.pop("input_ids").to(device)
    pixel_values = batch.pop("pixel_values").to(device)

    outputs = model(input_ids=input_ids,
                    pixel_values=pixel_values,
                    labels=input_ids)
    
    loss = outputs.loss

    print("Loss:", loss.item())

    loss.backward()

    optimizer.step()
    optimizer.zero_grad()
```