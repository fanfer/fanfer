---
title: 为Linux新增用户
date: 2023-10-10 11:34:29
tags:
    - 教程
categories:
    - 教程
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/GitHub.jpeg
---
创建新用户所使用的命令是：

```bash
sudo useradd -r -m -s /bin/bash test
```

命令来设置新用户的密码。

```bash
sudo passwd test
```

上面命令的参数意义如下：

- r：建立系统账号
- m：自动建立用户的登入目录
- s：指定用户登入后所使用的shell

输入ls /home/可以看到用户目录被成功创建了

然后需要登陆新用户,为新用户创建密钥

```bash
su test
[test@host ~]$ ssh-keyge
```

在 当前 用户的家目录中生成了一个 .ssh 的隐藏目录，内含两个密钥文件。id_rsa 为私钥，id_rsa.pub 为公钥。
为了确保连接成功，要保证以下文件权限正确：

```bash
[test@host ~]$ cd .ssh
[test@host .ssh]$ cat id_rsa.pub >> authorized_keys
```

在服务器上安装公钥
键入以下命令，在服务器上安装公钥：

```bash
su root
[root@host .ssh]$ chmod 600 authorized_keys
[root@host .ssh]$ chmod 700 ~/.ssh
```

将私钥id_rsa下载到本地，可以通过

```bash
cp /home/test/.ssh/id_rsa /home/test/id_rsa
```

然后将密钥下载到本地

为新建的用户添加root权限

```bash
sudo vi /etc/sudoers
```

```ruby
# 修改/etc/sudoers
# 新增：
## Allow root to run any commands anywhere
root    ALL=(ALL)       ALL
test    ALL=(ALL)       ALL
# 退出时，需要强制保存，因为该文件是只读的
:wq!
```