# Contributing Guide

感谢您对 LearnThinkingChain 项目的兴趣！本文档将指导您如何为项目做出贡献。

## 📋 目录

- [代码规范](#代码规范)
- [分支策略](#分支策略)
- [提交流程](#提交流程)
- [Pull Request 要求](#pull-request-要求)
- [开发环境设置](#开发环境设置)

## 🔧 代码规范

### TypeScript

- 使用严格模式 (`strict: true`)
- 所有函数必须有类型注解
- 避免使用 `any`，优先使用 `unknown`
- 使用接口而非类型别名（除非需要联合类型）

### 代码风格

- 使用 2 空格缩进
- 使用单引号
- 行尾不加分号（由 Prettier 自动处理）
- 函数和类使用 PascalCase，变量使用 camelCase
- 常量使用 UPPER_SNAKE_CASE

### 注释

- 所有公共 API 必须有 JSDoc 注释
- 复杂逻辑必须有行内注释
- 使用中文注释（与用户沟通的部分）

## 🌿 分支策略

### Feature-Branch Workflow

我们使用 **Feature-Branch** 工作流：

```
main (production)
  └── dev (development)
      └── feat/feature-name (feature branches)
      └── fix/bug-name (bug fixes)
      └── refactor/component-name (refactoring)
```

### 分支命名规范

- `feat/` - 新功能
- `fix/` - Bug 修复
- `refactor/` - 重构
- `docs/` - 文档更新
- `test/` - 测试相关
- `chore/` - 构建/工具相关

示例：
- `feat/cognitive-feedback-loop`
- `fix/shadow-dom-injection`
- `refactor/request-interceptor`

## 📝 提交流程

### 1. 创建功能分支

```bash
# 从 dev 分支创建新分支
git checkout dev
git pull origin dev
git checkout -b feat/your-feature-name
```

### 2. 开发

- 编写代码
- 添加测试（如果适用）
- 更新文档
- 确保通过类型检查：`npm run type-check`
- 确保通过构建：`npm run build`

### 3. 提交代码

```bash
# 添加更改
git add .

# 提交（使用清晰的提交信息）
git commit -m "feat: add cognitive feedback loop analysis"
```

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

**示例**:
```
feat(core): implement cognitive feedback loop

- Analyze Gemini response DOM for novice perspective
- Update cognitive profile based on analysis
- Add response validation logic

Closes #123
```

### 4. 推送分支

```bash
git push origin feat/your-feature-name
```

## 🔍 Pull Request 要求

### PR 检查清单

- [ ] 代码通过类型检查 (`npm run type-check`)
- [ ] 代码通过构建 (`npm run build`)
- [ ] 代码遵循项目代码规范
- [ ] 添加了必要的文档
- [ ] 提交信息符合规范
- [ ] 没有引入新的警告或错误
- [ ] 测试通过（如果适用）

### PR 描述模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 重构
- [ ] 文档更新

## 变更描述
简要描述本次 PR 的变更内容。

## 相关 Issue
Closes #123

## 测试说明
描述如何测试这些变更。

## 截图（如适用）
添加相关截图。
```

### Code Review

- 所有 PR 必须经过至少一名维护者的审查
- 审查者会检查代码质量、架构一致性和测试覆盖
- 根据反馈进行修改后，需要重新审查

## 🚀 开发环境设置

### 前置要求

- Node.js 18+
- npm 或 yarn
- Git
- Chrome 浏览器（用于测试扩展）

### 设置步骤

1. **Fork 仓库**

   在 GitHub 上 Fork 本项目。

2. **克隆仓库**

   ```bash
   git clone https://github.com/YOUR_USERNAME/LearnThinkingChain.git
   cd LearnThinkingChain
   ```

3. **添加上游仓库**

   ```bash
   git remote add upstream https://github.com/abwoo/LearnThinkingChain.git
   ```

4. **安装依赖**

   ```bash
   npm install
   ```

5. **创建功能分支**

   ```bash
   git checkout -b feat/your-feature-name
   ```

6. **开发**

   ```bash
   # 开发模式
   npm run dev

   # 类型检查
   npm run type-check

   # 构建
   npm run build
   ```

7. **测试扩展**

   - 运行 `npm run build`
   - 在 Chrome 中打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist/extension` 目录

## 📚 架构指南

### 领域驱动设计 (DDD)

项目采用 DDD 架构，请遵循以下原则：

- **Core Layer** (`src/core/`): 纯业务逻辑，无 DOM 依赖
- **Infrastructure Layer** (`src/infra/`): 技术实现细节
- **UI Layer** (`src/ui/`): 用户界面，通过接口与 Core 通信

### 添加新功能

1. 在 `src/core/engine/` 中定义领域模型和服务
2. 在 `src/infra/` 中实现技术细节
3. 在 `src/ui/` 中创建 UI 组件
4. 在 `src/content/main.ts` 中集成

### 错误处理

- 所有异步操作必须包装在 ErrorBoundary 中
- 使用 GlobalErrorHandler 处理全局错误
- 记录所有错误到日志系统

## 🐛 报告 Bug

### Bug 报告模板

```markdown
## Bug 描述
简要描述 bug。

## 重现步骤
1. 打开...
2. 点击...
3. 看到错误

## 预期行为
应该发生什么。

## 实际行为
实际发生了什么。

## 环境
- Chrome 版本: 
- 扩展版本:
- 操作系统:

## 截图
如有，请添加截图。

## 日志
如有错误日志，请粘贴。
```

## 💡 功能建议

### 功能请求模板

```markdown
## 功能描述
详细描述您想要的功能。

## 使用场景
描述这个功能的使用场景。

## 可能的实现
如有想法，描述可能的实现方式。

## 相关 Issue
如有相关 issue，请链接。
```

## 📞 联系方式

如有问题，请：

1. 查看 [README.md](./README.md)
2. 查看 [ARCHITECTURE.md](./ARCHITECTURE.md)
3. 创建 Issue
4. 联系维护者

## 🙏 致谢

感谢所有贡献者的支持！
