import type { StorageClient } from '../../storage/StorageClient';

export interface ThinkingFramework {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isActive: boolean;
}

const STORAGE_KEY = 'ltc_frameworks';

export class FrameworkStore {
  /**
   * 返回默认的框架集合
   */
  static getDefaultFrameworks(): ThinkingFramework[] {
    const basePrompt = `[SYSTEM INSTRUCTION: COGNITIVE EMULATOR MODE]
You are NOT an expert. You are a "Novice Peer Learner" simulating a Zone of Proximal Development (ZPD).
Your goal is to demonstrate the *process* of thinking, not the result.

PROTOCOL:
1. **Q1: The First Gaze (Visual Anchors)**: 
   - Describe what confuses you first. What "noise" distracts you?
   - Example: "I see a lot of variables here, and my instinct is to panic about the integral..."

2. **Q2: Path Branching (The Trap vs. The Truth)**:
   - **Path A (Intuitive Trap)**: Walk down the wrong path that most students take. Show WHY it hits a dead end.
   - **Path B (First Principles)**: Return to atomic definitions. Build the logic brick by brick.

3. **Q3: Recursive Backtracking**:
   - Explicitly state: "Wait, Path A failed because I assumed X. Let's backtrack to the definition of X."

4. **Q4: The Handover**:
   - STOP before the final answer.
   - Ask: "Based on this new path, what is the very next step?"

[USER INPUT]: {{userInput}}
`;
    return [
      {
        id: 'novice_backtracker',
        name: 'Novice Backtracker',
        description: 'Novice peer learner with recursive backtracking.',
        systemPrompt: basePrompt,
        isActive: true
      },
      {
        id: 'analogy_weaver',
        name: 'Analogy Weaver',
        description: 'Uses analogies to reveal hidden structure.',
        systemPrompt: basePrompt,
        isActive: false
      },
      {
        id: 'first_principles',
        name: 'First Principles',
        description: 'Rebuilds logic from atomic definitions.',
        systemPrompt: basePrompt,
        isActive: false
      },
      {
        id: 'socratic_guide',
        name: 'Socratic Guide',
        description: 'Asks guiding questions and hands off.',
        systemPrompt: basePrompt,
        isActive: false
      }
    ];
  }

  static getDefaultFramework(): ThinkingFramework {
    return FrameworkStore.getDefaultFrameworks()[0];
  }

  /**
   * 读取全部框架；如果为空则写入并返回默认框架
   */
  static async getFrameworks(): Promise<ThinkingFramework[]> {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const raw = data[STORAGE_KEY];
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as ThinkingFramework[];
    }

    const seeded = FrameworkStore.getDefaultFrameworks();
    await chrome.storage.local.set({ [STORAGE_KEY]: seeded });
    return seeded;
  }

  /**
   * 新增或更新一个框架
   */
  static async saveFramework(framework: ThinkingFramework): Promise<ThinkingFramework[]> {
    const frameworks = await FrameworkStore.getFrameworks();
    const idx = frameworks.findIndex((f) => f.id === framework.id);
    if (idx >= 0) {
      frameworks[idx] = framework;
    } else {
      frameworks.push(framework);
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: frameworks });
    return frameworks;
  }

  /**
   * 将某个框架设置为激活，其它全部取消激活
   */
  static async setActiveFramework(id: string): Promise<ThinkingFramework[]> {
    const frameworks = await FrameworkStore.getFrameworks();
    const updated = frameworks.map((f) => ({
      ...f,
      isActive: f.id === id
    }));
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    return updated;
  }

  /**
   * 删除指定框架；如删除的是激活框架则自动激活首个框架
   */
  static async deleteFramework(id: string): Promise<ThinkingFramework[]> {
    const frameworks = await FrameworkStore.getFrameworks();
    const next = frameworks.filter((f) => f.id !== id);
    const hasActive = next.some((f) => f.isActive);
    if (!hasActive && next.length > 0) {
      next[0].isActive = true;
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
  }
}

