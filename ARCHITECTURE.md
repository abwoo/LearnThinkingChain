# 架构文档 (Architecture Documentation)

## 🏗️ 领域驱动设计 (DDD) 架构

本项目采用严格的领域驱动设计，将业务逻辑与基础设施完全分离。

## 📁 目录结构

```
src/
├── core/                    # 核心领域层（业务逻辑）
│   └── engine/
│       ├── CognitiveProfile.ts      # 认知档案领域模型
│       ├── CognitiveBridge.ts      # 认知桥梁领域服务
│       └── PromptMiddleware.ts     # 提示词中间件（应用服务）
│
├── infra/                    # 基础设施层（技术实现）
│   └── dom/
│       ├── RequestInterceptor.ts   # DOM 拦截实现
│       └── CircuitBreaker.ts       # 熔断器实现
│
├── ui/                       # 用户界面层
│   └── shadow/
│       ├── ShadowHost.ts            # Shadow DOM 宿主
│       └── FloatingHub.tsx         # React UI 组件
│
└── utils/                    # 共享工具
    ├── ErrorBoundary.ts            # 错误边界
    └── logger.ts                   # 日志系统
```

## 🔄 数据流

### 1. 用户输入拦截流程

```
用户按下 Enter / 点击发送按钮
  ↓
RequestInterceptor.onKeydownCapture (捕获阶段)
  ↓
event.stopImmediatePropagation() 阻止原始事件
  ↓
RequestInterceptor.processInterception()
  ↓
PromptMiddleware.process() (异步)
  ↓
CognitiveBridge.bridge() (分析知识债务)
  ↓
CognitiveProfileService (更新档案)
  ↓
返回处理后的提示词
  ↓
setInputValue() 更新输入框
  ↓
replayEvent() 重新派发事件
  ↓
Gemini 接收处理后的提示词
```

### 2. 认知档案更新流程

```
PromptMiddleware 处理提示词
  ↓
CognitiveBridge 检测主题
  ↓
分析知识债务和薄弱点
  ↓
CognitiveProfileService.recordFailure() (如果失败)
  ↓
CognitiveProfileService.addSessionLog() (记录会话)
  ↓
CognitiveProfileService.updateKnowledgeDebt() (更新债务)
  ↓
保存到 chrome.storage.local
```

## 🧩 核心组件

### RequestInterceptor

**职责**: 在捕获阶段拦截用户输入，确保原始 React 事件不会触发。

**关键特性**:
- 使用 `addEventListener(..., true)` 在捕获阶段监听
- `stopImmediatePropagation()` 阻止所有后续处理器
- 异步处理，等待 PromptMiddleware 完成
- 支持 contenteditable 和 input/textarea

**使用示例**:
```typescript
const interceptor = new RequestInterceptor({
  inputSelectors: ['div[contenteditable="true"]'],
  submitSelectors: ['button[aria-label*="Send"]'],
  onIntercept: async (value, element) => {
    const processed = await processPrompt(value);
    return processed;
  }
});
```

### PromptMiddleware

**职责**: 实现递归搜索模式和路径分支逻辑。

**关键特性**:
- Q1-Q4 认知元架构
- 双路径探索（陷阱路径 vs 第一性原理路径）
- ZPD（最近发展区）调整
- 知识债务集成

**处理流程**:
1. 检测主题
2. 构建认知桥梁
3. 生成路径分支
4. 构建递归搜索提示词

### CognitiveBridge

**职责**: 连接用户的知识债务与提示词生成。

**关键特性**:
- 知识债务分析
- ZPD 复杂度调整
- 逻辑桥梁构建
- 脚手架策略生成

**ZPD 调整逻辑**:
- 高弱点 (≥5) → 低复杂度
- 低弱点 (≤1) → 高复杂度
- 根据偏好启发式调整策略

### CircuitBreaker

**职责**: 防止级联故障。

**状态机**:
- `CLOSED`: 正常操作
- `OPEN`: 失败过多，拒绝请求
- `HALF_OPEN`: 测试恢复

**阈值**:
- 失败阈值: 3 次
- 恢复时间: 30 秒

### ShadowHost

**职责**: 管理 Shadow DOM，防止 CSS 泄漏。

**关键特性**:
- 完全隔离的样式
- 支持自定义样式注入
- React 组件支持

## 🔐 错误处理策略

### 多层错误边界

1. **RequestInterceptor**: 捕获拦截错误
2. **CircuitBreaker**: 防止级联故障
3. **ErrorBoundary**: 全局错误捕获
4. **Logger**: 错误记录和存储

### 降级策略

1. **拦截失败**: 允许原始输入通过
2. **处理失败**: 返回 null，允许原始输入
3. **熔断开启**: 直接允许原始输入
4. **UI 错误**: 显示错误状态，不影响核心功能

## 📊 状态管理

### 认知档案 (CognitiveProfile)

存储在 `chrome.storage.local` 中：

```typescript
{
  weakPoints: Map<string, number>,        // 主题 -> 失败频率
  preferredHeuristics: 'visual' | ...,   // 偏好启发式
  sessionLogs: SessionLog[],              // 会话日志
  knowledgeDebt: Map<string, number>,    // 概念 -> 债务分数
  totalSessions: number,
  averageResponseTime: number
}
```

### 扩展状态

存储在 `chrome.storage.local` 中：

- `ltc_active`: boolean - 是否激活
- `ltc_mode`: string - 当前模式
- `ltc_protocols`: ProtocolMap - 协议定义

## 🎯 设计原则

### 1. 关注点分离

- **Core**: 纯业务逻辑，无 DOM 依赖
- **Infra**: 技术实现细节
- **UI**: 用户界面，通过接口与 Core 通信

### 2. 依赖倒置

- Core 层定义接口
- Infra 层实现接口
- UI 层依赖 Core 接口

### 3. 单一职责

每个类只有一个职责：
- `RequestInterceptor`: 只负责拦截
- `PromptMiddleware`: 只负责提示词处理
- `CognitiveBridge`: 只负责知识债务分析

### 4. 开闭原则

- 对扩展开放：可以添加新的协议、新的拦截策略
- 对修改封闭：核心逻辑不需要修改

## 🚀 扩展点

### 添加新协议

1. 在 `src/content/main.ts` 的 `getDefaultProtocols()` 中添加
2. 实现 Q1-Q4 逻辑
3. UI 自动显示新协议选项

### 添加新拦截策略

1. 扩展 `RequestInterceptor` 的选择器
2. 实现自定义 `onIntercept` 逻辑
3. 集成到主流程

### 添加新 UI 组件

1. 在 `src/ui/shadow/` 创建新组件
2. 使用 `ShadowHost` 挂载
3. 通过 React 渲染

## 📝 最佳实践

1. **错误处理**: 所有异步操作必须包装在 ErrorBoundary 中
2. **日志记录**: 关键操作必须记录日志
3. **类型安全**: 使用 TypeScript 严格模式
4. **性能**: 避免阻塞主线程
5. **测试**: 关键路径必须有错误处理

## 🔍 调试技巧

### 查看拦截日志

```javascript
// 在扩展控制台
chrome.storage.local.get('ltc_logs', console.log);
```

### 查看认知档案

```javascript
chrome.storage.local.get('ltc_cognitive_profile', console.log);
```

### 查看错误

```javascript
chrome.storage.local.get('ltc_errors', console.log);
```

### 手动触发熔断器重置

```javascript
// 在 content script 控制台
circuitBreaker.reset();
```
