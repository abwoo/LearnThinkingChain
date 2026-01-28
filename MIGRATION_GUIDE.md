# 迁移指南 (Migration Guide)

## 从旧结构迁移到 Monorepo 结构

### 目录结构变化

**旧结构:**
```
LearnThinkingChain/
├── extension/
├── src/
│   ├── app/
│   ├── background/
│   ├── content/
│   ├── core/
│   └── ...
└── web/
```

**新结构:**
```
LearnThinkingChain/
├── apps/
│   ├── extension/      # Chrome 扩展
│   └── web/            # 云端仪表板
├── packages/
│   └── shared/         # 共享代码（技能系统、Supabase 等）
└── dist/               # 构建输出
```

### 迁移步骤

#### 1. 安装新依赖

```bash
npm install
```

#### 2. 配置 Supabase

1. 在 [Supabase](https://app.supabase.com) 创建新项目
2. 运行 `packages/shared/supabase/schema.sql` 创建数据库表
3. 复制 `.env.example` 为 `.env.local` 并填入 Supabase 配置

#### 3. 迁移扩展代码

需要将 `src/` 下的代码移动到 `apps/extension/`：

- `src/background/index.ts` → `apps/extension/background/index.ts`
- `src/content/main.ts` → `apps/extension/content/main.ts`
- `src/app/popup.*` → `apps/extension/popup.*`
- `src/app/styles.css` → `apps/extension/styles.css`
- `extension/icons/` → `apps/extension/icons/`

#### 4. 迁移仪表板代码

需要将 `src/app/dashboard.*` 移动到 `apps/web/`：

- `src/app/dashboard.html` → `apps/web/index.html`
- `src/app/dashboard.ts` → `apps/web/main.tsx`
- `src/app/dashboard.css` → `apps/web/styles.css`

#### 5. 更新导入路径

所有对共享代码的导入需要更新：

```typescript
// 旧导入
import { something } from '../core/...';

// 新导入
import { something } from '@shared/...';
```

#### 6. 集成技能系统

在扩展的 `content/main.ts` 中：

```typescript
import { getSyncEngine } from '@shared/sync/SyncEngine';

// 初始化同步引擎
const syncEngine = getSyncEngine();
await syncEngine.initialize({
  extensionId: chrome.runtime.id,
  sessionId: currentSessionId,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
});

// 捕获并推送事件
await syncEngine.captureAndPush(promptText, aiResponse);
```

在仪表板的 `main.tsx` 中：

```typescript
import { SkillTree } from './components/SkillTree';
import { getSyncEngine } from '@shared/sync/SyncEngine';

// 订阅技能更新
const syncEngine = getSyncEngine();
syncEngine.onSkillUpdate((skills) => {
  setSkills(skills);
});
```

### 构建和运行

```bash
# 开发模式
npm run dev:extension  # 开发扩展
npm run dev:web        # 开发仪表板

# 生产构建
npm run build:extension
npm run build:web
```

### 注意事项

1. **环境变量**: 确保在 `apps/extension/` 和 `apps/web/` 中都能访问到 Supabase 配置
2. **路径别名**: 使用 `@shared` 别名引用共享代码
3. **类型检查**: 运行 `npm run type-check` 确保类型正确

### 回滚

如果遇到问题，可以：

1. 检查 Git 历史恢复到旧版本
2. 保留 `src/` 目录作为备份，直到迁移完成
3. 逐步迁移，先迁移共享代码，再迁移应用代码
