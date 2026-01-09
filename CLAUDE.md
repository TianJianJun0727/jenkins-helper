# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

Jenkins Helper 是一个 VS Code 扩展,用于快速触发和跟踪 Jenkins 构建。它使用双架构设计:
- **Extension 层**:TypeScript + Node.js,运行在 VS Code Extension Host 中
- **Webview UI 层**:React + Ant Design,运行在独立的 Webview 中,使用 Rsbuild 构建

## 开发命令

### 安装依赖

```bash
# 安装扩展依赖
pnpm install

# 安装 Webview UI 依赖(必须执行)
cd webview-ui && pnpm install && cd ..
```

### 开发模式

```bash
# 扩展开发:实时编译 + TypeScript 类型检查
pnpm run watch

# 仅 Webview UI 开发(启动开发服务器)
cd webview-ui && pnpm run dev
```

**注意**:修改 Webview UI 后,需要在扩展中查看效果时,必须先运行 `pnpm run build:webview`。

### 构建

```bash
# 完整构建(扩展 + Webview UI)
pnpm run vscode:prepublish

# 仅构建 Webview UI
pnpm run build:webview

# 仅编译扩展
pnpm run compile
```

### 测试与检查

```bash
# 类型检查
pnpm run check-types

# Lint 检查
pnpm run lint

# 运行测试
pnpm run test
```

### 打包与发布

```bash
# 打包为 .vsix 文件
pnpm run package

# 发布到 Marketplace
pnpm run publish
```

## 架构要点

### 1. 通信机制:类型安全的消息系统

Extension 和 Webview 之间通过 `postMessage` 进行通信,所有消息类型定义在 [src/types/messages.ts](src/types/messages.ts):

```typescript
// Extension -> Webview
export type ExtensionMessage =
  | InitDataMessage
  | BuildProgressMessage
  | BuildResultMessage
  | ...

// Webview -> Extension
export type WebviewMessage =
  | TriggerBuildMessage
  | SaveConfigMessage
  | ...
```

**关键原则**:
- 所有消息必须包含 `type: MessageType` 字段
- 使用 TypeScript 联合类型确保类型安全
- 修改消息结构时,Extension 和 Webview 代码必须同步更新

### 2. 分层架构

```
extension.ts (入口,消息路由)
    ↓
services/* (业务逻辑)
    ├─ config.ts       # 配置管理(~/.jenkins-helper/config.json)
    ├─ git.ts          # Git 操作(simple-git)
    ├─ jenkins-api.ts  # Jenkins REST API 封装
    └─ jenkins.ts      # 构建生命周期管理
    ↓
utils/* (工具函数)
    ├─ request.ts      # HTTP 请求(axios + retry)
    └─ url.ts          # URL 处理
```

**依赖原则**:
- 上层依赖下层,下层不依赖上层
- `services/*` 可以调用 `utils/*`,但 `utils/*` 不能调用 `services/*`
- 避免循环依赖

### 3. Jenkins 构建生命周期

构建流程由 [src/services/jenkins.ts](src/services/jenkins.ts) 中的 `triggerBuildWithLifecycle()` 管理:

```
1. triggerBuild()        → 触发构建,获取 queueLocation
2. waitForExecutable()   → 轮询队列,等待分配构建号
3. pollBuildStatus()     → 轮询 Blue Ocean API,获取 Pipeline 阶段进度
4. getBuildResult()      → 获取最终构建结果
```

**关键点**:
- 使用 Blue Ocean API (`/blue/rest/organizations/jenkins/pipelines/{job}/runs/{buildNumber}/nodes/`) 获取详细进度
- 轮询间隔和最大次数在 [src/constants/index.ts](src/constants/index.ts) 的 `POLLING` 中定义
- 进度和结果通过回调函数 `onProgress` 和 `onResult` 实时发送到 Webview

### 4. Webview 资源路径处理

Webview 加载的 HTML/CSS/JS 必须使用特殊的 URI 格式:

```typescript
// 在 src/webview/panel.ts 中
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(context.extensionUri, 'webview-ui', 'dist', 'static', 'js', 'index.js')
);
```

**注意**:
- 所有静态资源路径必须通过 `webview.asWebviewUri()` 转换
- Webview UI 的构建产物位于 `webview-ui/dist/`,会被打包到扩展中
- 修改静态资源路径时,同步更新 [src/webview/panel.ts](src/webview/panel.ts)

### 5. 配置存储

Jenkins 配置保存在用户主目录:

```
~/.jenkins-helper/config.json
```

包含:
- `url`: Jenkins 服务器地址
- `username`: 用户名
- `token`: API Token
- `webhook`: 可选的 Webhook 通知地址

**敏感信息处理**:
- 不要在代码中硬编码 token 或密码
- 使用 Jenkins API Token 而非明文密码
- 配置文件不应提交到版本控制

### 6. Git 分支获取逻辑

[src/services/git.ts](src/services/git.ts) 中的 `getBranchInfo()`:

1. 执行 `git fetch` 获取最新远程分支
2. 获取当前分支(`git status`)
3. 获取所有分支列表(`git branch -a`)
4. 返回格式化的分支选项(`LabeledValue[]`)

**注意**:
- 远程分支名会自动去除 `remotes/origin/` 前缀
- 分支列表会去重(本地和远程同名分支只保留一个)

## 修改指南

### 添加新的消息类型

1. 在 [src/types/messages.ts](src/types/messages.ts) 中定义消息接口
2. 添加到 `MessageType` 枚举
3. 更新 `ExtensionMessage` 或 `WebviewMessage` 联合类型
4. 在 [src/extension.ts](src/extension.ts) 的 `handleWebviewMessage()` 中添加处理逻辑
5. 在 Webview 中添加消息发送/接收逻辑

### 修改 Webview UI

1. 修改 `webview-ui/src/` 中的 React 组件
2. 运行 `pnpm run build:webview` 构建
3. 在 VS Code 调试窗口中重新加载扩展

**注意**:Webview UI 是独立的 React 项目,不能直接 import 扩展中的 TypeScript 代码,只能通过消息通信。

### 添加新的 Jenkins API 调用

1. 在 [src/services/jenkins-api.ts](src/services/jenkins-api.ts) 中添加 API 函数
2. 使用统一的错误处理模式:`[error, data]` 元组
3. 在 [src/types/jenkins.ts](src/types/jenkins.ts) 中定义响应类型
4. 在 [src/services/jenkins.ts](src/services/jenkins.ts) 中封装业务逻辑

### 调试技巧

- **Extension 端调试**:在 VS Code 中按 F5,会启动 Extension Development Host
- **Webview 端调试**:在 Extension Development Host 中,命令面板执行 "Developer: Open Webview Developer Tools"
- **查看消息通信**:Webview 端所有发送的消息会通过 `console.log` 记录

## 代码约定

- 使用 TypeScript strict 模式
- 所有 API 调用使用 `[error, data]` 元组返回值
- 避免在 services 层直接调用 `vscode.window.showErrorMessage`,由 extension.ts 统一处理
- 消息类型使用 `MessageType` 枚举,不使用字符串字面量
- URL 处理使用 `utils/url.ts` 中的工具函数

## 常见问题

### 修改 Webview UI 后看不到效果

1. 确保执行了 `pnpm run build:webview`
2. 在 Extension Development Host 中重新加载扩展(命令面板 -> "Developer: Reload Window")
3. 如果仍有问题,清除缓存后重启

### 构建失败

- 检查 `webview-ui/dist/` 目录是否存在且包含构建产物
- 确保 `webview-ui/` 的依赖已安装(`cd webview-ui && pnpm install`)
- 检查 esbuild 配置是否正确

### 类型错误

- Extension 和 Webview 共享的类型定义在 `src/types/` 中
- Webview 项目需要单独复制类型定义到 `webview-ui/src/types/`
- 修改类型时,确保两边同步更新
