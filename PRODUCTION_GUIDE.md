# 生产环境指南 (Production Guide)

## 🏗️ 架构概览

本项目采用**领域驱动设计 (DDD)** 架构，逻辑与 UI 完全解耦：

```
src/
├── core/engine/          # 核心业务逻辑（领域层）
│   ├── CognitiveProfile.ts    # 认知档案模型
│   ├── CognitiveBridge.ts    # 认知桥梁服务
│   └── PromptMiddleware.ts    # 提示词中间件
├── infra/dom/            # 基础设施层（DOM 操作）
│   ├── RequestInterceptor.ts  # 请求拦截器
│   └── CircuitBreaker.ts      # 熔断器
├── ui/shadow/            # UI 层（Shadow DOM）
│   ├── ShadowHost.ts          # Shadow DOM 宿主
│   └── FloatingHub.tsx        # 浮动控制中心
└── utils/                # 工具层
    ├── ErrorBoundary.ts       # 错误边界
    └── logger.ts              # 日志系统
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

### 4. 打包发布版本

```bash
npm run build:release
```

这会在 `release/` 目录生成 `LearnThinkingChain-v3.0.0.zip` 文件。

## 📦 手动安装扩展

1. 运行 `npm run build` 构建扩展
2. 打开 Chrome，访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `dist/extension` 目录

## 🔧 核心功能

### 1. 请求拦截 (RequestInterceptor)

- **捕获阶段拦截**: 在 React 事件处理之前拦截用户输入
- **事件阻止**: 使用 `stopImmediatePropagation()` 确保原始事件不会触发
- **异步处理**: 等待 PromptMiddleware 处理完成后再重新派发事件

### 2. 认知桥梁 (CognitiveBridge)

- **知识债务追踪**: 自动识别用户的知识薄弱点
- **ZPD 调整**: 根据用户水平调整提示词复杂度
- **逻辑桥梁**: 构建知识连接，强化薄弱环节

### 3. 提示词中间件 (PromptMiddleware)

- **递归搜索模式**: 实现 Q1-Q4 认知元架构
- **路径分支**: 同时探索"常见陷阱路径"和"第一性原理路径"
- **认知沙箱**: 将对话转换为认知实验环境

### 4. Shadow DOM UI

- **CSS 隔离**: 完全隔离的样式，不受 Gemini 页面影响
- **React 组件**: 使用 React 构建 UI，支持状态管理
- **可拖拽**: 浮动控制中心支持拖拽移动

### 5. 熔断器 (Circuit Breaker)

- **故障保护**: 连续 3 次失败后自动开启熔断
- **自动恢复**: 30 秒后尝试恢复
- **降级策略**: 熔断时允许原始输入通过

### 6. 错误边界 (ErrorBoundary)

- **错误捕获**: 捕获所有未处理的错误
- **错误存储**: 保存最近 50 个错误供调试
- **错误限流**: 防止错误风暴导致扩展崩溃

## 📊 数据流

```
用户输入
  ↓
RequestInterceptor (捕获阶段拦截)
  ↓
PromptMiddleware (递归搜索处理)
  ↓
CognitiveBridge (知识债务分析)
  ↓
CognitiveProfile (更新档案)
  ↓
处理后的提示词
  ↓
重新派发事件 → Gemini
```

## 🔍 调试

### 查看日志

扩展使用 `chrome.storage.local` 存储日志：

```javascript
// 在扩展控制台运行
chrome.storage.local.get('ltc_logs', (data) => {
  console.table(data.ltc_logs);
});
```

### 查看错误

```javascript
chrome.storage.local.get('ltc_errors', (data) => {
  console.table(data.ltc_errors);
});
```

### 查看认知档案

```javascript
chrome.storage.local.get('ltc_cognitive_profile', (data) => {
  console.log(data.ltc_cognitive_profile);
});
```

## 🎯 配置选项

### 修改拦截选择器

编辑 `src/content/main.ts` 中的 `inputSelectors` 和 `submitSelectors`。

### 调整熔断器阈值

编辑 `src/content/main.ts`：

```typescript
circuitBreaker = new CircuitBreaker({
  failureThreshold: 3,    // 失败阈值
  resetTimeout: 30000      // 恢复时间（毫秒）
});
```

### 自定义 Shadow DOM 样式

编辑 `src/ui/shadow/ShadowHost.ts` 中的 `getDefaultStyles()` 方法。

## 🚨 故障排除

### 扩展无法拦截输入

1. 检查 Gemini 页面是否更新了 DOM 结构
2. 更新 `inputSelectors` 以匹配新的选择器
3. 查看控制台日志了解拦截失败原因

### 熔断器频繁触发

1. 检查 PromptMiddleware 是否有错误
2. 查看错误日志找出根本原因
3. 考虑增加 `failureThreshold`

### Shadow DOM UI 不显示

1. 检查 `shadowHost.mount()` 是否成功调用
2. 查看是否有 CSS 冲突
3. 确认 React 组件正确渲染

## 📝 开发注意事项

1. **不要使用占位符**: 所有代码必须完整实现
2. **错误处理**: 所有异步操作必须包装在 ErrorBoundary 中
3. **日志记录**: 关键操作必须记录日志
4. **类型安全**: 使用 TypeScript 严格模式
5. **性能**: 避免阻塞主线程的操作

## 🔄 更新流程

1. 修改代码
2. 运行 `npm run build` 测试构建
3. 运行 `npm run type-check` 检查类型
4. 在 Chrome 中重新加载扩展测试
5. 运行 `npm run build:release` 打包
6. 提交代码并创建 Git tag
7. GitHub Actions 自动创建 Release

## 📚 相关文档

- [README.md](./README.md) - 项目说明
- [SETUP.md](./SETUP.md) - 设置指南
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 迁移指南
