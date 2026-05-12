---
title: HuggingFace Pipeline
date: 2023-08-18 15:26:43
tags:
    - 笔记
    - HuggingFace
categories:
    - 笔记
    - HuggingFace
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/huggingfacepipeline.png
---
## HuggingFace 中的pipeline

pipline是使用模型进行推理的一种很好且简单的方法。使用pipline()可以使用**[Hub](https://huggingface.co/models)**中的任何模型来推理任何语言、计算机视觉、语音和多模式任务。而不用考虑模型底层代码。

这些pipline是从库中抽象出大部分复杂代码的对象，提供专用于多个任务的简单 API

### 简单使用

每个任务都有其关联的pipline，使用应用于特定任务的pipeline的时候，能够自动加载默认模型和能够处理该任务的预处理类

1. 首先创建**[pipeline()](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.pipeline)**并指定推理任务：

```python
from transformers import pipeline

generator = pipeline(task="automatic-speech-recognition")
```

2. 将输入文本传递给**[pipeline()](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.pipeline)**：

```python
generator("https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac")
```

3.也可以更换参数量更大的模型进行推理

```python
generator = pipeline(model="openai/whisper-large")
generator("https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac")
```

4.可以将pipline用在批量数据或者数据集上

```python
generator(
    [
        "https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/mlk.flac",
        "https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/1.flac",
    ]
)
```

## Parameters

参数列表如下：

- **task** (`str`) — The task defining which pipeline will be returned. Currently accepted tasks are:
    - `"audio-classification"`: will return a **[AudioClassificationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.AudioClassificationPipeline)**.
    - `"automatic-speech-recognition"`: will return a **[AutomaticSpeechRecognitionPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.AutomaticSpeechRecognitionPipeline)**.
    - `"conversational"`: will return a **[ConversationalPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ConversationalPipeline)**.
    - `"depth-estimation"`: will return a **[DepthEstimationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.DepthEstimationPipeline)**.
    - `"document-question-answering"`: will return a **[DocumentQuestionAnsweringPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.DocumentQuestionAnsweringPipeline)**.
    - `"feature-extraction"`: will return a **[FeatureExtractionPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.FeatureExtractionPipeline)**.
    - `"fill-mask"`: will return a **[FillMaskPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.FillMaskPipeline)**:.
    - `"image-classification"`: will return a **[ImageClassificationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ImageClassificationPipeline)**.
    - `"image-segmentation"`: will return a **[ImageSegmentationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ImageSegmentationPipeline)**.
    - `"image-to-text"`: will return a **[ImageToTextPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ImageToTextPipeline)**.
    - `"mask-generation"`: will return a `MaskGenerationPipeline`.
    - `"object-detection"`: will return a **[ObjectDetectionPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ObjectDetectionPipeline)**.
    - `"question-answering"`: will return a **[QuestionAnsweringPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.QuestionAnsweringPipeline)**.
    - `"summarization"`: will return a **[SummarizationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.SummarizationPipeline)**.
    - `"table-question-answering"`: will return a **[TableQuestionAnsweringPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.TableQuestionAnsweringPipeline)**.
    - `"text2text-generation"`: will return a **[Text2TextGenerationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.Text2TextGenerationPipeline)**.
    - `"text-classification"` (alias `"sentiment-analysis"` available): will return a **[TextClassificationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.TextClassificationPipeline)**.
    - `"text-generation"`: will return a **[TextGenerationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.TextGenerationPipeline)**:.
    - `"token-classification"` (alias `"ner"` available): will return a **[TokenClassificationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.TokenClassificationPipeline)**.
    - `"translation"`: will return a **[TranslationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.TranslationPipeline)**.
    - `"translation_xx_to_yy"`: will return a **[TranslationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.TranslationPipeline)**.
    - `"video-classification"`: will return a **[VideoClassificationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.VideoClassificationPipeline)**.
    - `"visual-question-answering"`: will return a **[VisualQuestionAnsweringPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.VisualQuestionAnsweringPipeline)**.
    - `"zero-shot-classification"`: will return a **[ZeroShotClassificationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ZeroShotClassificationPipeline)**.
    - `"zero-shot-image-classification"`: will return a **[ZeroShotImageClassificationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ZeroShotImageClassificationPipeline)**.
    - `"zero-shot-audio-classification"`: will return a **[ZeroShotAudioClassificationPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ZeroShotAudioClassificationPipeline)**.
    - `"zero-shot-object-detection"`: will return a **[ZeroShotObjectDetectionPipeline](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/pipelines#transformers.ZeroShotObjectDetectionPipeline)**.
- **model** (`str` or **[PreTrainedModel](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/model#transformers.PreTrainedModel)** or **[TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/model#transformers.TFPreTrainedModel)**, *optional*) — The model that will be used by the pipeline to make predictions. This can be a model identifier or an actual instance of a pretrained model inheriting from **[PreTrainedModel](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/model#transformers.PreTrainedModel)** (for PyTorch) or **[TFPreTrainedModel](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/model#transformers.TFPreTrainedModel)** (for TensorFlow).
    
    If not provided, the default for the `task` will be loaded.
    
- **config** (`str` or **[PretrainedConfig](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/configuration#transformers.PretrainedConfig)**, *optional*) — The configuration that will be used by the pipeline to instantiate the model. This can be a model identifier or an actual pretrained model configuration inheriting from **[PretrainedConfig](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/configuration#transformers.PretrainedConfig)**.
    
    If not provided, the default configuration file for the requested model will be used. That means that if `model` is given, its default configuration will be used. However, if `model` is not supplied, this `task`’s default model’s config is used instead.
    
- **tokenizer** (`str` or **[PreTrainedTokenizer](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/tokenizer#transformers.PreTrainedTokenizer)**, *optional*) — The tokenizer that will be used by the pipeline to encode data for the model. This can be a model identifier or an actual pretrained tokenizer inheriting from **[PreTrainedTokenizer](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/tokenizer#transformers.PreTrainedTokenizer)**.
    
    If not provided, the default tokenizer for the given `model` will be loaded (if it is a string). If `model` is not specified or not a string, then the default tokenizer for `config` is loaded (if it is a string). However, if `config` is also not given or not a string, then the default tokenizer for the given `task` will be loaded.
    
- **feature_extractor** (`str` or `PreTrainedFeatureExtractor`, *optional*) — The feature extractor that will be used by the pipeline to encode data for the model. This can be a model identifier or an actual pretrained feature extractor inheriting from `PreTrainedFeatureExtractor`.
    
    Feature extractors are used for non-NLP models, such as Speech or Vision models as well as multi-modal models. Multi-modal models will also require a tokenizer to be passed.
    
    If not provided, the default feature extractor for the given `model` will be loaded (if it is a string). If `model` is not specified or not a string, then the default feature extractor for `config` is loaded (if it is a string). However, if `config` is also not given or not a string, then the default feature extractor for the given `task` will be loaded.
    
- **framework** (`str`, *optional*) — The framework to use, either `"pt"` for PyTorch or `"tf"` for TensorFlow. The specified framework must be installed.
    
    If no framework is specified, will default to the one currently installed. If no framework is specified and both frameworks are installed, will default to the framework of the `model`, or to PyTorch if no model is provided.
    
- **revision** (`str`, *optional*, defaults to `"main"`) — When passing a task name or a string model identifier: The specific model version to use. It can be a branch name, a tag name, or a commit id, since we use a git-based system for storing models and other artifacts on huggingface.co, so `revision` can be any identifier allowed by git.
- **use_fast** (`bool`, *optional*, defaults to `True`) — Whether or not to use a Fast tokenizer if possible (a **[PreTrainedTokenizerFast](https://huggingface.co/docs/transformers/v4.31.0/en/main_classes/tokenizer#transformers.PreTrainedTokenizerFast)**).
- **use_auth_token** (`str` or *bool*, *optional*) — The token to use as HTTP bearer authorization for remote files. If `True`, will use the token generated when running `huggingface-cli login` (stored in `~/.huggingface`).
- **device** (`int` or `str` or `torch.device`) — Defines the device (*e.g.*, `"cpu"`, `"cuda:1"`, `"mps"`, or a GPU ordinal rank like `1`) on which this pipeline will be allocated.
- **device_map** (`str` or `Dict[str, Union[int, str, torch.device]`, *optional*) — Sent directly as `model_kwargs` (just a simpler shortcut). When `accelerate` library is present, set `device_map="auto"` to compute the most optimized `device_map` automatically (see **[here](https://huggingface.co/docs/accelerate/main/en/package_reference/big_modeling#accelerate.cpu_offload)** for more information).
    
    Do not use `device_map` AND `device` at the same time as they will conflict
    
- **torch_dtype** (`str` or `torch.dtype`, *optional*) — Sent directly as `model_kwargs` (just a simpler shortcut) to use the available precision for this model (`torch.float16`, `torch.bfloat16`, … or `"auto"`).
- **trust_remote_code** (`bool`, *optional*, defaults to `False`) — Whether or not to allow for custom code defined on the Hub in their own modeling, configuration, tokenization or even pipeline files. This option should only be set to `True` for repositories you trust and in which you have read the code, as it will execute code present on the Hub on your local machine.
- **model_kwargs** (`Dict[str, Any]`, *optional*) — Additional dictionary of keyword arguments passed along to the model’s `from_pretrained(..., **model_kwargs)` topction.
- **kwargs** (`Dict[str, Any]`, *optional*) — Additional keyword arguments passed along to the specific pipeline init (see the documentation for the corresponding pipeline class for possible values).

### Device

- **device** (`int` or `str` or `torch.device`) — Defines the device (*e.g.*, `"cpu"`, `"cuda:1"`, `"mps"`, or a GPU ordinal rank like `1`) on which this pipeline will be allocated.

```python
generator = pipeline(model="openai/whisper-large", device=0)
```

如果模型太大，使用单张GPU不够，可以通过设置 device_map = “auto”使用 🤗 **[Accelerate](https://huggingface.co/docs/accelerate)** 自动分配显存，加载模型参数

```python
#!pip install accelerate
generator = pipeline(model="openai/whisper-large", device_map="auto")
```

如果你使用了device_map = “auto”，那么在实例化pipline的时候就不需要设置device参数的值

- **device_map** (`str` or `Dict[str, Union[int, str, torch.device]`, *optional*) — Sent directly as `model_kwargs` (just a simpler shortcut). When `accelerate` library is present, set `device_map="auto"` to compute the most optimized `device_map` automatically (see **[here](https://huggingface.co/docs/accelerate/main/en/package_reference/big_modeling#accelerate.cpu_offload)** for more information).

### Batch Size

默认情况下pipline不会进行批处理，但是可以通过下面的方式使用

```python
generator = pipeline(model="openai/whisper-large", device=0, batch_size=2)
audio_filenames = [f"audio_{i}.flac" for i in range(10)]
texts = generator(audio_filenames)
```

上述的代码使用pipline对10个音频文件进行推理，但是会按照两个批次传递给位于GPU上模型。

对于list或者dataset或者generator都可以使用批处理

```python
from transformers import pipeline
from transformers.pipelines.pt_utils import KeyDataset
import datasets

dataset = datasets.load_dataset("imdb", name="plain_text", split="unsupervised")
pipe = pipeline("text-classification", device=0)
for out in pipe(KeyDataset(dataset, "text"), batch_size=8, truncation="only_first"):
    print(out)
    # [{'label': 'POSITIVE', 'score': 0.9998743534088135}]
    # Exactly the same output as before, but the content are passed
    # as batches to the model
```

但是批处理也不是都会给模型加速，可能会变慢，甚至导致内存泄漏

**Dataset1**

```python
from transformers import pipeline
from torch.utils.data import Dataset
from tqdm.auto import tqdm

pipe = pipeline("text-classification", device=0)

class MyDataset(Dataset):
    def __len__(self):
        return 5000

    def __getitem__(self, i):
        return "This is a test"

dataset = MyDataset()

for batch_size in [1, 8, 64, 256]:
    print("-" * 30)
    print(f"Streaming batch_size={batch_size}")
    for out in tqdm(pipe(dataset, batch_size=batch_size), total=len(dataset)):
        pass
```

```python
# On GTX 970
------------------------------
Streaming no batching
100%|██████████████████████████████████████████████████████████████████████| 5000/5000 [00:26<00:00, 187.52it/s]
------------------------------
Streaming batch_size=8
100%|█████████████████████████████████████████████████████████████████████| 5000/5000 [00:04<00:00, 1205.95it/s]
------------------------------
Streaming batch_size=64
100%|█████████████████████████████████████████████████████████████████████| 5000/5000 [00:02<00:00, 2478.24it/s]
------------------------------
Streaming batch_size=256
100%|█████████████████████████████████████████████████████████████████████| 5000/5000 [00:01<00:00, 2554.43it/s]
(diminishing returns, saturated the GPU)
```

**Dataset2**

```python
class MyDataset(Dataset):
    def __len__(self):
        return 5000

    def __getitem__(self, i):
        if i % 64 == 0:
            n = 100
        else:
            n = 1
        return "This is a test" * n
```

```python
------------------------------
Streaming no batching
100%|█████████████████████████████████████████████████████████████████████| 1000/1000 [00:05<00:00, 183.69it/s]
------------------------------
Streaming batch_size=8
100%|█████████████████████████████████████████████████████████████████████| 1000/1000 [00:03<00:00, 265.74it/s]
------------------------------
Streaming batch_size=64
100%|██████████████████████████████████████████████████████████████████████| 1000/1000 [00:26<00:00, 37.80it/s]
------------------------------
Streaming batch_size=256
  0%|                                                                                 | 0/1000 [00:00<?, ?it/s]
Traceback (most recent call last):
  File "/home/nicolas/src/transformers/test.py", line 42, in <module>
    for out in tqdm(pipe(dataset, batch_size=256), total=len(dataset)):
....
    q = q / math.sqrt(dim_per_head)  # (bs, n_heads, q_length, dim_per_head)
RuntimeError: CUDA out of memory. Tried to allocate 376.00 MiB (GPU 0; 3.95 GiB total capacity; 1.72 GiB already allocated; 354.88 MiB free; 2.46 GiB reserved in total by PyTorch)
```

由于第二个数据集中，存在个别特别长的数据，就导致同一批次的所有数据都要padding到400个token长，那个一个batch就会从之前的【64，4】变成【64，400】，当批次再增大到256的时候，程序就会崩溃。

但是对于这样的问题，没有通用的解决方案，只能根据经验和实际的数据进行测试

下面这些情况不要使用Batch

对于模型推理的实时性要求较高、如果使用CPU、如果对于可能的输入的sequence_length未知

如果使用了batching，那么需要注意OOMs(out of memory)

### Pipeline chunk batching

像zero-shot- classification和QA问题这样的，一个输入可能需要对一个模型做多个前向传播，所以需要使用ChunkPipeline而不是普通的Pipeline

普通模型：

```python
preprocessed = pipe.preprocess(inputs)
model_outputs = pipe.forward(preprocessed)
outputs = pipe.postprocess(model_outputs)
```

chunk pipeline:

```python
all_model_outputs = []
for preprocessed in pipe.preprocess(inputs):
    model_outputs = pipe.forward(preprocessed)
    all_model_outputs.append(model_outputs)
outputs = pipe.postprocess(all_model_outputs)
```

## 在dataset上使用pipeline

从🤗 **[Datasets](https://github.com/huggingface/datasets/)加载并迭代数据集**

```python
# KeyDataset is a util that will just output the item we're interested in.
from transformers.pipelines.pt_utils import KeyDataset
from datasets import load_dataset

pipe = pipeline(model="hf-internal-testing/tiny-random-wav2vec2", device=0)
dataset = load_dataset("hf-internal-testing/librispeech_asr_dummy", "clean", split="validation[:10]")

for out in pipe(KeyDataset(dataset, "audio")):
    print(out)
```

## 在大模型上通过accelerate使用pipeline

```python
# pip install accelerate
import torch
from transformers import pipeline

pipe = pipeline(model="facebook/opt-1.3b", torch_dtype=torch.bfloat16, device_map="auto")
output = pipe("This is a cool example!", do_sample=True, top_p=0.95)
```

也可以传递 8 位加载模型`load_in_8bit=True`

```python
# pip install accelerate bitsandbytes
import torch
from transformers import pipeline

pipe = pipeline(model="facebook/opt-1.3b", device_map="auto", model_kwargs={"load_in_8bit": True})
output = pipe("This is a cool example!", do_sample=True, top_p=0.95)
```