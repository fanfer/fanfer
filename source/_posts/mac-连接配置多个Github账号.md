---
title: mac 连接配置多个Github账号
date: 2023-08-21 12:34:29
tags:
    - 教程
categories:
    - 教程
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/GitHub.jpeg
---
### 1. 生成多个SSH密钥:

```bash
#bash# 将email修改为你的第一账户的email，建议为常用的账号
ssh-keygen -q -t rsa -C "your_email_1@example.com" -f ~/.ssh/id_rsa_github_1 --N ""
# 将email修改为你的第二账户的email
ssh-keygen -q -t rsa -C "your_email_2@example.com" -f ~/.ssh/id_rsa_github_2 -N ""
```

上述命令将将会生成两个SSH密钥对`id_rsa_github_1`和`id_rsa_github_2`,分别对应两个GitHub账号。

### 2. 添加SSH密钥到GitHub账号:

分别将`id_rsa_github_1.pub`和`id_rsa_github_2.pub`文件的内容添加到对应的GitHub账号的SSH Keys设置页面，注意别搞反了哦！

可以用以下命令将文件内容读取到剪贴板：

```bash
#bash
pbcopy < id_rsa_github_1.pub
pbcopy < id_rsa_github_2.pub
```

### 3. 配置SSH config文件:

在`~/.ssh/`目录下创建`config`文件：

```bash
touch ~/.ssh/config
```

然后在文件中输入以下内容并保存：

```bash
Host github.com
HostName github.com
IdentityFile ~/.ssh/id_rsa_github_1
PreferredAuthentications publickey

Host github_2.com 
HostName github.com
IdentityFile ~/.ssh/id_rsa_github_2
PreferredAuthentications publickey
```

这会将github.com对应到第一个GitHub账号,github_2.com对应到第二个GitHub账号。

**mac快捷键comman+shift+.可以查看隐藏文件，当用户不对时可以修改.ssh文件夹下的config更改git@github的内容来重新选择账号**

### 4. 把专用密钥添加到高速缓存中

```bash
#bash
ssh-add --apple-use-keychain ~/.ssh/id_rsa_github_1
ssh-add --apple-use-keychain ~/.ssh/id_rsa_github_2
```

### 5. 测试SSH连接:

```bash
*#bash*
ssh -T git@github.com
ssh -T git@github_2.com
```

正常情况下，你会得到如下消息:

```bash
Hi xxx! You've successfully authenticated, but GitHub does not provide shell access.
```

如果都可以成功登录,则SSH连接配置成功。

### 6. 清除global config配置

可以用`git config -l` 查看是否配置过`user.name`, `user.email`，如果配置过，则用以下命令unset:

```bash
git config --global --unset user.name 
git config --global --unset user.email
```

### 7.恭喜！！！！

> 使用方法：注意，在克隆仓库时用不用账户要使用对应的Host.
> 

当克隆第一个GitHub账号的仓库时,使用git@github.com:

```bash
*#bash*
git clone git@github.com:username/repo.git
```

当克隆第二个GitHub账号的仓库时,使用git@github_2.com:

```bash
*#bash* 
git clone git@github_2.com:username/repo.git
```

这会自动使用对应的SSH密钥与GitHub账号连接。

拉取成功后，为了方便，你可以在`cd`到对应的仓库目录下，用下述命令配置`user.name`和`user.email`

```bash
git config --local user.name "youname"
git config --local user.email "youemail@xx.com"
```

按照这些步骤,可以在一台Mac上配置任意多个GitHub账号,并可以方便地与之交互。

