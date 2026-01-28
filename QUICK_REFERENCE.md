# 快速参考 (Quick Reference)

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 配置

# 3. 设置 Supabase 数据库
# 在 Supabase Dashboard 运行 packages/shared/supabase/schema.sql

# 4. 开发
npm run dev:extension  # 扩展
npm run dev:web        # 仪表板

# 5. 构建
npm run build
```

## 📦 项目结构

```
LearnThinkingChain/
├── apps/
│   ├── extension/          # Chrome 扩展
│   └── web/                # 云端仪表板
├── packages/
│   └── shared/             # 共享代码
│       ├── types/          # TypeScript 类型
│       ├── supabase/       # Supabase 服务
│       └── sync/           # 同步引擎
└── dist/                   # 构建输出
```

## 🔑 关键 API

### SyncEngine

```typescript
import { getSyncEngine } from '@shared/sync/SyncEngine';

const syncEngine = getSyncEngine();

// 初始化
await syncEngine.initialize({
  extensionId: chrome.runtime.id,
  sessionId: 'session_123',
  supabaseUrl: '...',
  supabaseAnonKey: '...'
});

// 捕获并推送事件
await syncEngine.captureAndPush(promptText, aiResponse);

// 订阅技能更新
syncEngine.onSkillUpdate((skills) => {
  console.log('Skills updated:', skills);
});
```

### 技能系统

```typescript
import { 
  SKILL_DB, 
  getSkillById, 
  detectSkillsFromText,
  SKILL_CATEGORIES 
} from '@shared/types/skills';

// 获取所有技能
const allSkills = SKILL_DB;

// 获取技能
const skill = getSkillById('hunter_01');

// 检测文本中的技能
const detected = detectSkillsFromText('visual anchor pattern');

// 获取类别信息
const hunterCategory = SKILL_CATEGORIES.hunter;
```

### SupabaseService

```typescript
import { getSupabaseService } from '@shared/supabase/SupabaseService';

const supabase = getSupabaseService();

// 初始化
await supabase.initialize({
  url: '...',
  anonKey: '...'
});

// 推送事件
await supabase.pushThinkingEvent({
  extension_id: '...',
  session_id: '...',
  prompt_text: '...',
  ai_response: '...',
  detected_skills: ['hunter_01'],
  skill_exp_gains: { hunter_01: 10 }
});

// 订阅实时更新
const unsubscribe = supabase.subscribeToThinkingEvents(
  extensionId,
  (event) => console.log('New event:', event)
);
```

## 🎨 组件使用

### ThinkingOrb (扩展端)

```tsx
import { ThinkingOrb } from './components/ThinkingOrb';

<ThinkingOrb
  activeCategory="hunter"
  skills={skills}
  onHover={(category) => console.log(category)}
/>
```

### SkillTree (仪表板)

```tsx
import { SkillTree } from './components/SkillTree';

<SkillTree
  skills={skills}
  onSkillClick={(skill) => console.log(skill)}
/>
```

## 📊 技能类别

| 类别 | ID | 颜色 | 图标 | 技能数 |
|------|----|----|----|--------|
| 猎手 | `hunter` | Blue (#3B82F6) | 🎯 | 10 |
| 建造者 | `builder` | Green (#10B981) | 🏗️ | 10 |
| 智者 | `sage` | Purple (#8B5CF6) | 🧠 | 10 |
| 狂战士 | `berserker` | Red (#EF4444) | ⚡ | 10 |

## 🔧 环境变量

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 📝 常用命令

```bash
# 开发
npm run dev              # 同时开发扩展和仪表板
npm run dev:extension    # 仅开发扩展
npm run dev:web          # 仅开发仪表板

# 构建
npm run build            # 构建全部
npm run build:extension  # 构建扩展
npm run build:web        # 构建仪表板

# 类型检查
npm run type-check       # TypeScript 类型检查
```

## 🐛 故障排除

### Supabase 连接失败
- 检查 `.env.local` 配置
- 确认 Supabase 项目已启用 Realtime
- 检查浏览器控制台错误

### 扩展无法加载
- 确认已运行 `npm run build:extension`
- 检查 `dist/extension` 目录
- 查看 Chrome 扩展页面错误

### 技能不更新
- 确认数据库表已创建
- 检查扩展 ID 是否正确
- 查看网络请求日志

## 📚 相关文档

- [README.md](./README.md) - 项目说明
- [SETUP.md](./SETUP.md) - 详细设置指南
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 迁移指南
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 实施总结
