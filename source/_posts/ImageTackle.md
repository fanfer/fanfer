---
title: 数字图像处理
tags: 
    - 相机
    - 图像
    - 笔记
categories:
    - 笔记
date: 2023-05-07 20:24:57
description:
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/Lena.png
---

## 边缘提取基本原理

​		图像边缘是图像最基本的特征，所谓边缘(Edge) 是指图像局部特性的不连续性。灰度或结构等信息的突变处称之为边缘。例如，灰度级的突变、颜色的突变,、纹理结构的突变等。边缘是一个区域的结束，也是另一个区域的开始，利用该特征可以分割图像。

​		图像的边缘有方向和幅度两种属性。边缘通常可以通过一阶导数或二阶导数检测得到。一阶导数是以最大值作为对应的边缘的位置，而二阶导数则以过零点作为对应边缘的位置。

​		要得到一幅图像的梯度，则要求在图像的每个像素点位置处计算偏导数。我们处理的是数字量，因此要求关于一点的邻域上的偏导数的数字近似，因此一幅图像在(x,y)位置和x,y方向上的梯度大小计算如下：


$$
\frac {\partial f(x,y) } {\partial x }=\lim_{x \to 0} \frac{f(x+\epsilon,y)-f(x,y)}{\epsilon}  \tag{1.1}
$$

$$
\frac {\partial f(x,y) } {\partial y }=\lim_{x \to 0} \frac{f(x+\epsilon,y)-f(x,y)}{\epsilon} \tag{1.2}
$$

（1）一阶导数的边缘算子

通过模板作为核与图像的每个像素点做卷积和运算，然后选取合适的阈值来提取图像的边缘。常见的有Roberts算子、Sobel算子和Prewitt算子。

（2）二阶导数的边缘算子

依据于二阶导数过零点，常见的有Laplacian 算子，此类算子对噪声敏感。

（3）其他边缘算子

前面两类均是通过微分算子来检测图像边缘，还有一种就是Canny算子，其是在满足一定约束条件下推导出来的边缘检测最优化算子。

对于不同的滤波器模板得到的梯度是不同的，这也就衍生出很多算子，如Roberts、Prewitt、Sobel和Laplacian算子等。

### Sobel算子

Sobel算子是一种用于边缘检测的离散微分算子，它结合了高斯平滑和微分求导。该算子用于计算图像明暗程度近似值，根据图像边缘旁边明暗程度把该区域内超过某个数的特定点记为边缘。Sobel算子在Prewitt算子的基础上增加了权重的概念，认为相邻点的距离远近对当前像素点的影响是不同的，距离越近的像素点对应当前像素的影响越大，从而实现图像锐化并突出边缘轮廓。

Sobel算子根据像素点上下、左右邻点灰度加权差，在边缘处达到极值这一现象检测边缘。对噪声具有平滑作用，提供较为精确的边缘方向信息。因为Sobel算子结合了高斯平滑和微分求导（分化），因此结果会具有更多的抗噪性，当对精度要求不是很高时，Sobel算子是一种较为常用的边缘检测方法。

Sobel算子的边缘定位更准确，常用于噪声较多、灰度渐变的图像。其算法模板如下面的公式所示，其中  表示水平方向， 表示垂直方向。
$$
d_x=\begin{bmatrix} -1 & 0 &1 \\ -2 & 0 & 2\\-1 & 0 &1 \end{bmatrix}\quad d_y=\begin{bmatrix} -1 & -2 &1 \\ 0 & 0 & 0\\1 & 2 &1 \end{bmatrix}\quad
$$


### Roberts算子

Roberts算子又称为交叉微分算法，它是基于交叉差分的梯度算法，通过局部差分计算检测边缘线条。常用来处理具有陡峭的低噪声图像，当图像边缘接近于正45度或负45度时，该算法处理效果更理想。其缺点是对边缘的定位不太准确，提取的边缘线条较粗。Roberts算子的模板分为水平方向和垂直方向，如下式所示，从其模板可以看出，Roberts算子能较好的增强正负45度的图像边缘。

$$
d_x=\begin{bmatrix} -1 & 0 \\ 0 & 1 \end{bmatrix}\quad d_y=\begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}\quad
$$


### Prewitt算子

Prewitt算子是一种图像边缘检测的微分算子，其原理是利用特定区域内像素灰度值产生的差分实现边缘检测。由于Prewitt算子采用 33 模板对区域内的像素值进行计算，而Robert算子的模板为 22，故Prewitt算子的边缘检测结果在水平方向和垂直方向均比Robert算子更加明显。Prewitt算子适合用来识别噪声较多、灰度渐变的图像，其计算公式如下所示： 
$$
d_x=\begin{bmatrix} -1 & 0 &1 \\ -1 & 0 &1\\-1 & 0 &1 \end{bmatrix}\quad d_y=\begin{bmatrix} -1 & -1 &-1 \\ 0 & 0 & 0\\1 & 1 &1 \end{bmatrix}\quad
$$


### Marr算子

一种利用图像强度二阶导数的零交叉点来求边缘点的算法对噪声十分敏感，所以在边缘增强前滤除噪声。这是一种根据人类视觉特性提出了一种边缘检测的方法，该方法将高斯滤波和拉普拉斯检测算子结合在一起进行边缘检测的方法。Marr和Hildreth证明了边缘检测中灰度变化和图像的尺寸无关检测算子可以为不同尺度；灰度变化梯度在一阶导数的极值点，或在二阶导数为零的交叉点。

在laplace算子 中，满足f是标准差的二维高斯分布函数为

$$
f(x,y)=e^{-\frac{x^2+y^2}{2\sigma^2 } }
$$
对 $f(x,y)$ 求微分得：

$$
\bigtriangledown ^2f(x,y)=\frac{\ {\partial^2}  f(x,y)}{\partial x^2} +\frac{\ {\partial^2}  f(x,y)}{\partial y^2}
$$

$$
\bigtriangledown ^2f(x,y)=\left [ \frac{x^2+y^2-2\sigma ^2}{\sigma ^4}  \right ]  e^{-\frac{x^2+y^2}{2\sigma ^2} }
$$
其中上式被称为高斯拉普拉斯(LoG)，LoG的零点出现在 $x^2+y^2=2\sigma^2$处。

### Canny边缘检测

​	Canny边缘检测算法是比较出色的算法，它包含以下四个步骤：

1.**高斯滤波**

滤波的主要目的是降噪，一般的图像处理算法都需要先进行降噪。而高斯滤波主要使图像变得平滑（模糊），同时也有可能增大了边缘的宽度。

高斯函数是一个类似与正态分布的中间大两边小的函数。

对于一个位置（m,n）的像素点，其灰度值为f(m,n)。

那么经过高斯滤波后的灰度值将变为：
$$
g_\sigma (m,n)=\frac{ 1}{\sqrt{2\pi \sigma ^2}} e^{-\frac{m^2+n^2}{2\sigma^2} }\cdot f(m,n)
$$
​	简单说就是用一个高斯矩阵乘以每一个像素点及其邻域，取其带权重的平均值作为最后的灰度值。

**2. 计算梯度值和梯度方向**

​	边缘是什么？边缘就是灰度值变化较大的的像素点的集合。一道黑边一道白边中间就是边缘，它的灰度值变化是最大的，在图像中，用梯度来表示灰度值的变化程度和方向。

​	它可以通过点乘一个sobel或其它算子得到不同方向的梯度值 $g_x(m,n),g_y(m,n)$。

​	梯度通过以下公式计算梯度值和梯度方向：

$$
G(m,n)=\sqrt{g_x(m,n)^2+g_y(m,n)^2}
$$

$$
\theta=arctan\frac{g_y(m,n)}{g_x(m,n)}
$$

**3. 过滤非最大值**

​	在高斯滤波过程中，边缘有可能被放大了。这个步骤使用一个规则来过滤不是边缘的点，使边缘的宽度尽可能为1个像素点：如果一个像素点属于边缘，那么这个像素点在梯度方向上的梯度值是最大的。否则不是边缘，将灰度值设为0。
$$
M_T(m,n)=\begin{equation}
\left\{
\begin{array}{lr}
M(m,n) & \textsf{if}\ M(m,n)>T\\
0 & otherwise\\
\end{array}
\right.
\end{equation}
$$
**4. 使用上下阈值来检测边缘**

​	一般情况下，使用一个阈值来检测边缘，但是这样做未免太武断了。如果能够使用启发式的方法确定一个上阀值和下阀值，位于下阀值之上的都可以作为边缘，这样就可能提高准确度。

## 各类算子效果比较

（1）Roberts 算子 

​	Roberts算子利用局部差分算子寻找边缘，边缘定位精度较高，但容易丢失一部分边缘，不具备抑制噪声的能力。该算子对具有陡峭边缘且含噪声少的图像效果较好，尤其是边缘正负45度较多的图像，但定位准确率较差；

（2）Sobel 算子

​	Sobel算子考虑了综合因素，对噪声较多的图像处理效果更好，Sobel 算子边缘定位效果不错，但检测出的边缘容易出现多像素宽度。

（3） Prewitt 算子

​	Prewitt算子对灰度渐变的图像边缘提取效果较好，而没有考虑相邻点的距离远近对当前像素点的影响，与Sobel 算子类似，不同的是在平滑部分的权重大小有些差异；

（4）Marr算子

​	Marr 算子不依赖于边缘方向的二阶微分算子，对图像中的阶跃型边缘点定位准确，该算子对噪声非常敏感，它使噪声成分得到加强，这两个特性使得该算子容易丢失一部分边缘的方向信息，造成一些不连续的检测边缘，同时抗噪声能力比较差.

（5）Canny边缘检测

​	Canny边缘检测算子是所有边缘检测算子中最优秀的，具有低错误率。已定位的边缘尽可能的接近真实边缘，由检测子标记为边缘的一点和真实边缘的中心之间的距离最小。对于没一个真实的边缘点，检测子都只返回一个点，意味着真实边缘周围的局部最大数最小。

## 实现

​	本次实验过程中，采用的是经典的Model.jpg,在anaconda python版本3.7 Jupyter-notebook中进行实验。在读取图片后统一对图像进行了灰度化，并进行高斯滤波和阈值处理。

```python
#读取图像
img = cv2.imread('model.jpg')
img_RGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) 
#灰度化处理图像
grayImage = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
#高斯滤波
gaussianBlur = cv2.GaussianBlur(grayImage, (3,3), 0)
#阈值处理
ret, binary = cv2.threshold(gaussianBlur, 127, 255, cv2.THRESH_BINARY)
```

​	在实验过程中，依次将图像经过自定义的函数进行处理提取图像边缘。

​	使用Sobel算子进行边缘提取。

```python
def usSobel(grayImage):
    x = cv2.Sobel(grayImage, cv2.CV_16S, 1, 0)  # 对x求一阶导
    y = cv2.Sobel(grayImage, cv2.CV_16S, 0, 1)  # 对y求一阶导
    absX = cv2.convertScaleAbs(x)
    absY = cv2.convertScaleAbs(y)
    Sobel = cv2.addWeighted(absX, 0.5, absY, 0.5, 0) 
    ret, binary = cv2.threshold(Sobel, 127, 255, cv2.THRESH_BINARY)
    plt.subplot(121),plt.imshow(binary, cmap=plt.cm.gray ),plt.title('二值图'), plt.axis('off')
    plt.subplot(122),plt.imshow(Sobel, cmap=plt.cm.gray ),plt.title('Sobel算子'), plt.axis('off')
    plt.show()
```

​	使用Roberts算子进行边缘提取。

```python
def useRoberts(grayImage):
    # Roberts算子
    kernelx = np.array([[-1, 0], [0, 1]], dtype=int)
    kernely = np.array([[0, -1], [1, 0]], dtype=int)
    x = cv2.filter2D(grayImage, cv2.CV_16S, kernelx)
    y = cv2.filter2D(grayImage, cv2.CV_16S, kernely)
    # 转uint8
    absX = cv2.convertScaleAbs(x)
    absY = cv2.convertScaleAbs(y)
    Roberts = cv2.addWeighted(absX, 0.5, absY, 0.5, 0)
    ret, binary = cv2.threshold(Roberts, 127, 255, cv2.THRESH_BINARY)
    plt.subplot(121),plt.imshow(binary, cmap=plt.cm.gray ),plt.title('二值图'), plt.axis('off')
    plt.subplot(122),plt.imshow(Roberts, cmap=plt.cm.gray ),plt.title('Roberts算子'), plt.axis('off')
    plt.show()
```

​	使用Prewitt算子进行边缘提取。

```python
def usePrewitt(grayImage):
    # Prewitt算子
    kernelx = np.array([[1, 1, 1], [0, 0, 0], [-1, -1, -1]], dtype=int)
    kernely = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=int)
    x = cv2.filter2D(grayImage, cv2.CV_16S, kernelx)
    y = cv2.filter2D(grayImage, cv2.CV_16S, kernely)
    absX = cv2.convertScaleAbs(x)
    absY = cv2.convertScaleAbs(y)
    Prewitt = cv2.addWeighted(absX, 0.5, absY, 0.5, 0)
    ret, binary = cv2.threshold(Prewitt, 127, 255, cv2.THRESH_BINARY)
    plt.subplot(121),plt.imshow(binary, cmap=plt.cm.gray ),plt.title('二值图'), plt.axis('off')
    plt.subplot(122),plt.imshow(Prewitt, cmap=plt.cm.gray ),plt.title('Prewitt算子'), plt.axis('off')
    plt.show()
```

​	使用canny算子进行边缘提取。

```python
def useCanny(gaussianBlur):
    #using system topction
    Canny = cv2.Canny(gaussianBlur, 50, 150)
    ret, binary = cv2.threshold(Canny, 127, 255, cv2.THRESH_BINARY)
    plt.subplot(121),plt.imshow(binary, cmap=plt.cm.gray ),plt.title('二值图'), plt.axis('off')
    plt.subplot(122), plt.imshow(Canny, cmap=plt.cm.gray), plt.title('Canny算子'), plt.axis('off')
```

​	使用Marr进行边缘提取。

```python
def useMarr(binary):
    dst = cv2.Laplacian(binary, cv2.CV_16S, ksize = 3)
    Laplacian = cv2.convertScaleAbs(dst)
    ret, binary = cv2.threshold(Laplacian, 127, 255, cv2.THRESH_BINARY)
    plt.subplot(121),plt.imshow(binary, cmap=plt.cm.gray ),plt.title('二值图'), plt.axis('off')
    plt.subplot(122),plt.imshow(Laplacian, cmap=plt.cm.gray ),plt.title('Laplacian算子'), plt.axis('off')
```

​	最后输出图像，比较结果。

```python
plt.subplot(231),plt.imshow(img_RGB),plt.title('原始图像'), plt.axis('off') #坐标轴关闭
plt.subplot(232),plt.imshow(binary, cmap=plt.cm.gray ),plt.title('二值图'), plt.axis('off')
plt.subplot(233),plt.imshow(Roberts, cmap=plt.cm.gray ),plt.title('Roberts算子'), plt.axis('off')
plt.subplot(234),plt.imshow(Prewitt, cmap=plt.cm.gray ),plt.title('Prewitt算子'), plt.axis('off')
plt.subplot(235),plt.imshow(Sobel, cmap=plt.cm.gray ),plt.title('Sobel算子'), plt.axis('off')
plt.subplot(236),plt.imshow(Laplacian, cmap=plt.cm.gray ),plt.title('Laplacian算子'), plt.axis('off')
plt.show()
```