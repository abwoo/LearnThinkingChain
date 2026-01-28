# 设置指南 (Setup Guide)

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/abwoo/LearnThinkingChain.git
cd LearnThinkingChain
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Supabase

#### 3.1 创建 Supabase 项目

1. 访问 [Supabase](https://app.supabase.com)
2. 创建新项目
3. 记录项目 URL 和匿名密钥（anon key）

#### 3.2 设置数据库

1. 在 Supabase Dashboard 中打开 SQL Editor
2. 运行 `packages/shared/supabase/schema.sql` 中的 SQL 脚本
3. 这将创建 `user_thinking_events` 表和相关的索引、视图

#### 3.3 配置环境变量

1. 复制 `.env.example` 为 `.env.local`
2. 填入你的 Supabase 配置：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. 开发模式

#### 开发扩展

```bash
npm run dev:extension
```

然后在 Chrome 中：
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist/extension` 目录

#### 开发仪表板

```bash
npm run dev:web
```

访问 `http://localhost:5173`

### 5. 生产构建

```bash
# 构建扩展
npm run build:extension

# 构建仪表板
npm run build:web

# 构建全部
npm run build
```

## 项目结构

```
LearnThinkingChain/
├── apps/
│   ├── extension/          # Chrome 扩展
│   │   ├── background/     # Service Worker
│   │   ├── content/        # Content Scripts
│   │   ├── components/     # React 组件
│   │   └── manifest.json    # 扩展清单
│   └── web/                # 云端仪表板
│       ├── components/     # React 组件
│       └── index.html      # 入口 HTML
├── packages/
│   └── shared/             # 共享代码
│       ├── types/          # TypeScript 类型
│       ├── supabase/       # Supabase 服务
│       └── sync/           # 同步引擎
└── dist/                    # 构建输出
```

## 技能系统

### 技能分类

- **Hunter (猎手)**: 感知类技能（10个）
- **Builder (建造者)**: 逻辑构建类技能（10个）
- **Sage (智者)**: 元认知类技能（10个）
- **Berserker (狂战士)**: 试错类技能（10个）

### 经验值系统

- 每次 AI 检测到相关技能使用时，自动增加 +10 XP
- 技能等级 = `Math.floor(exp / 100)`
- 技能树可视化会根据等级实时更新

## 故障排除

### Supabase 连接失败

1. 检查 `.env.local` 中的配置是否正确
2. 确认 Supabase 项目已启用 Realtime
3. 检查浏览器控制台是否有 CORS 错误

### 扩展无法加载

1. 确认已运行 `npm run build:extension`
2. 检查 `dist/extension` 目录是否存在
3. 查看 Chrome 扩展页面的错误信息

### 技能不更新

1. 确认 Supabase 表已正确创建
2. 检查扩展 ID 是否正确输入到仪表板
3. 查看浏览器控制台的网络请求

## 下一步

- 阅读 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 了解如何迁移现有代码
- 查看 [README.md](./README.md) 了解项目详情
- 参考 `integration-example.ts` 了解如何集成技能系统
