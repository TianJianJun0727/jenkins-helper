# Webview UI

这是 Jenkins Helper 扩展的 Webview UI 部分，使用 React + Ant Design + Rsbuild 构建。

## 技术栈

- **React 18**: UI 框架
- **Ant Design 6**: UI 组件库
- **Rsbuild**: 构建工具
- **TypeScript**: 类型安全

## 目录结构

```
webview-ui/
├── src/
│   ├── components/         # UI 组件
│   │   ├── banner/        # 顶部横幅
│   │   ├── build/         # 构建相关组件
│   │   │   ├── form.tsx   # 构建表单
│   │   │   ├── status.tsx # 构建状态
│   │   │   └── index.tsx  # 构建页面
│   │   └── config/        # 配置页面
│   ├── utils/
│   │   └── vscode.ts      # VSCode API 集成
│   ├── App.tsx            # 主应用
│   └── index.tsx          # 入口文件
├── dist/                  # 构建产物
└── rsbuild.config.ts      # Rsbuild 配置
```

## 开发

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run dev
```

这会启动一个开发服务器，可以在浏览器中预览 UI。但是 VSCode API 在浏览器中不可用，会使用模拟模式。

### 构建

```bash
pnpm run build
```

构建产物会输出到 `dist/` 目录，所有资源（JS、CSS）会打包到根目录，便于 VSCode 扩展加载。

## VSCode API 集成

### 发送消息到扩展

```typescript
import { postMessage } from '../utils/vscode';

// 发送消息
postMessage({
  type: 'trigger',
  branch: 'main',
  env: 'dev',
});
```

### 接收来自扩展的消息

```typescript
import { onMessage } from '../utils/vscode';

useEffect(() => {
  const unsubscribe = onMessage((message) => {
    if (message?.type === 'update-data') {
      // 处理数据更新
      console.log(message);
    }
  });

  return () => {
    unsubscribe();
  };
}, []);
```

### 通知 Webview 已准备好

```typescript
import { notifyReady } from '../utils/vscode';

// 在组件挂载后调用
notifyReady();
```

## 消息协议

### 从 Webview 到扩展

- `ready`: Webview 已准备好
- `get-config`: 请求配置数据
- `save-config`: 保存配置
- `clear-config`: 清除配置
- `load-build-data`: 加载构建数据
- `trigger`: 触发构建

### 从扩展到 Webview

- `init-data`: 初始化数据
- `switch-to-config`: 切换到配置页面
- `config-data`: 配置数据
- `config-saved`: 配置已保存
- `config-cleared`: 配置已清除
- `update-data`: 更新构建数据
- `build-progress`: 构建进度更新
- `build-result`: 构建结果
- `load-error`: 加载错误

## 构建配置

Rsbuild 配置（`rsbuild.config.ts`）的关键点：

1. **禁用文件名哈希**: 便于扩展加载资源
2. **所有资源输出到根目录**: 简化路径处理
3. **单个 JS 包**: 使用 `all-in-one` 策略

```typescript
export default defineConfig({
  plugins: [pluginReact()],
  output: {
    filenameHash: false, // 禁用哈希
    distPath: {
      // 所有资源都输出到根目录
      root: 'dist',
      html: './',
      js: './',
      css: './',
      // ...
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'all-in-one', // 单个 JS 文件
    },
  },
});
```

## 注意事项

1. **VSCode API**: 只在 VSCode Webview 中可用，开发模式会使用模拟 API
2. **资源路径**: 扩展会自动转换资源路径为 `vscode-resource://` 协议
3. **CSP**: 扩展会自动添加 Content Security Policy
4. **样式隔离**: Webview 的样式与扩展主题隔离，需要自行处理主题适配

## 调试

1. 在 VSCode 中按 `F5` 启动扩展开发模式
2. 打开 Jenkins 构建助手面板
3. 在面板中右键选择"检查元素"打开开发者工具
4. 可以在控制台中查看日志和调试

## 参考

- [VSCode Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Ant Design](https://ant.design/)
- [Rsbuild](https://rsbuild.dev/)
