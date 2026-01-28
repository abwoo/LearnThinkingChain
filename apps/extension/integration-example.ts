/**
 * 扩展端集成示例
 * 
 * 展示如何在 content script 中集成技能系统和 Supabase 同步
 */

import { getSyncEngine } from '@shared/sync/SyncEngine';
import { getSkillById, type Skill } from '@shared/types/skills';

// 在 content script 初始化时
async function initializeSkillsSystem() {
  const extensionId = chrome.runtime.id;
  const sessionId = generateSessionId(); // 你的会话 ID 生成逻辑

  const syncEngine = getSyncEngine();
  
  const initialized = await syncEngine.initialize({
    extensionId,
    sessionId,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  });

  if (!initialized) {
    console.error('Failed to initialize sync engine');
    return;
  }

  // 订阅技能更新
  syncEngine.onSkillUpdate((skills) => {
    // 更新 UI 显示当前技能状态
    updateSkillsDisplay(skills);
    
    // 更新 ThinkingOrb 组件
    const activeCategory = getActiveCategory(skills);
    updateThinkingOrb(activeCategory, skills);
  });
}

// 当用户提交提示词并收到 AI 回复时
async function handleAIResponse(promptText: string, aiResponse: string) {
  const syncEngine = getSyncEngine();
  
  // 捕获并推送事件（会自动检测技能并分配经验值）
  const detectedSkills = await syncEngine.captureAndPush(promptText, aiResponse, {
    mode: currentMode,
    timestamp: Date.now()
  });

  console.log('Detected skills:', detectedSkills);
  
  // 显示技能获得通知
  for (const skillId of detectedSkills) {
    const skill = getSkillById(skillId);
    if (skill) {
      showSkillNotification(skill, 10); // +10 XP
    }
  }
}

// 更新技能显示
function updateSkillsDisplay(skills: Record<string, Skill>) {
  // 按类别分组
  const byCategory = {
    hunter: Object.values(skills).filter(s => s.category === 'hunter'),
    builder: Object.values(skills).filter(s => s.category === 'builder'),
    sage: Object.values(skills).filter(s => s.category === 'sage'),
    berserker: Object.values(skills).filter(s => s.category === 'berserker')
  };

  // 更新 UI
  // ...
}

// 获取当前活跃类别（经验值最高的）
function getActiveCategory(skills: Record<string, Skill>): 'hunter' | 'builder' | 'sage' | 'berserker' | null {
  const categoryTotals = {
    hunter: 0,
    builder: 0,
    sage: 0,
    berserker: 0
  };

  for (const skill of Object.values(skills)) {
    categoryTotals[skill.category] += skill.exp;
  }

  const maxCategory = Object.entries(categoryTotals).reduce((a, b) => 
    a[1] > b[1] ? a : b
  );

  return maxCategory[1] > 0 ? maxCategory[0] as SkillCategory : null;
}

// 显示技能获得通知
function showSkillNotification(skill: Skill, expGain: number) {
  // 创建通知 UI
  // ...
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
