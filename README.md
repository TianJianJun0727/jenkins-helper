# jenkins-helper

简洁的 VS Code 扩展，用于快速触发与跟踪 Jenkins 构建。

## 功能

- 在侧栏/编辑器上下文中快速打开 Jenkins 构建面板
- 选择目标环境与分支并触发带参数的构建
- 在 Webview 中实时显示构建队列与构建进度
- 保存 Jenkins 访问配置到本地（位于用户主目录的 `.jenkins-helper/config.json`）


## 使用说明

1. 打开一个工作区（扩展会尝试读取当前工作区名作为项目名）。
2. 通过命令面板或菜单执行命令：

```text
命令: 打开Jenkins 构建助手 (jenkins-helper.openPanel)
```

3. 在弹出的面板中，填写或保存 Jenkins 配置（URL、用户名、API Token）。
4. 选择环境与分支，点击“触发构建”，面板会显示队列与构建进度。

## 配置与存储

配置文件保存在用户主目录下：

```
~/.jenkins-helper/config.json
```

内容示例：

```json
{
  "url": "https://jenkins.example.com",
  "username": "your-user",
  "token": "your-api-token"
}
```

## 贡献

欢迎提交 issue 或 PR。请确保遵循项目的代码风格并运行 `pnpm run lint` 与类型检查。

## 许可

MIT
