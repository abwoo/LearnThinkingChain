/**
 * Sync Engine
 * 
 * 数据同步引擎：捕获、推送、监听、更新
 */

import { SupabaseService, ThinkingEvent } from '../supabase/SupabaseService';
import { detectSkillsFromText, updateSkillExp, type Skill } from '../types/skills';

export interface SyncEngineConfig {
  extensionId: string;
  sessionId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface SkillUpdateCallback {
  (skills: Record<string, Skill>): void;
}

export class SyncEngine {
  private supabase: SupabaseService;
  private config: SyncEngineConfig | null = null;
  private unsubscribe: (() => void) | null = null;
  private skillUpdateCallbacks: SkillUpdateCallback[] = [];
  private currentSkills: Record<string, Skill> = {};

  constructor() {
    this.supabase = new SupabaseService();
  }

  /**
   * 初始化同步引擎
   */
  async initialize(config: SyncEngineConfig): Promise<boolean> {
    this.config = config;

    // 初始化 Supabase
    await this.supabase.initialize({
      url: config.supabaseUrl,
      anonKey: config.supabaseAnonKey
    });

    if (!this.supabase.isInitialized()) {
      console.error('Failed to initialize Supabase');
      return false;
    }

    // 加载现有技能数据
    await this.loadUserSkills();

    // 订阅实时更新
    this.subscribeToUpdates();

    return true;
  }

  /**
   * 捕获用户输入和 AI 响应，分析并推送事件
   */
  async captureAndPush(
    promptText: string,
    aiResponse: string,
    metadata?: Record<string, unknown>
  ): Promise<string[]> {
    if (!this.config) {
      console.error('SyncEngine not initialized');
      return [];
    }

    // 检测技能
    const detectedSkills = detectSkillsFromText(aiResponse);
    
    // 计算经验值增益（每个检测到的技能 +10 XP）
    const skillExpGains: Record<string, number> = {};
    for (const skillId of detectedSkills) {
      skillExpGains[skillId] = 10;
    }

    // 创建思考事件
    const event: ThinkingEvent = {
      extension_id: this.config.extensionId,
      session_id: this.config.sessionId,
      prompt_text: promptText,
      ai_response: aiResponse,
      detected_skills: detectedSkills,
      skill_exp_gains: skillExpGains,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };

    // 推送到 Supabase
    const success = await this.supabase.pushThinkingEvent(event);

    if (success) {
      // 立即更新本地技能状态
      await this.updateLocalSkills(skillExpGains);
    }

    return detectedSkills;
  }

  /**
   * 订阅实时更新
   */
  private subscribeToUpdates(): void {
    if (!this.config) {
      return;
    }

    this.unsubscribe = this.supabase.subscribeToThinkingEvents(
      this.config.extensionId,
      (event) => {
        // 当新事件到达时，更新技能
        this.updateLocalSkills(event.skill_exp_gains);
      }
    );
  }

  /**
   * 加载用户的技能数据
   */
  private async loadUserSkills(): Promise<void> {
    if (!this.config) {
      return;
    }

    const skillsData = await this.supabase.getUserSkills(this.config.extensionId);
    
    // 转换为 Skill 对象
    const { SKILL_DB } = await import('../types/skills');
    this.currentSkills = {};

    for (const skill of SKILL_DB) {
      const data = skillsData[skill.id];
      if (data) {
        this.currentSkills[skill.id] = {
          ...skill,
          exp: data.exp,
          level: data.level
        };
      } else {
        this.currentSkills[skill.id] = { ...skill };
      }
    }

    this.notifySkillUpdate();
  }

  /**
   * 更新本地技能状态
   */
  private async updateLocalSkills(expGains: Record<string, number>): Promise<void> {
    const { SKILL_DB } = await import('../types/skills');
    let updated = false;

    for (const [skillId, expGain] of Object.entries(expGains)) {
      const skill = this.currentSkills[skillId] || SKILL_DB.find(s => s.id === skillId);
      if (skill) {
        const oldLevel = skill.level;
        this.currentSkills[skillId] = updateSkillExp(skill, expGain);
        
        // 检查是否升级
        if (this.currentSkills[skillId].level > oldLevel) {
          console.log(`Skill ${skillId} leveled up! ${oldLevel} -> ${this.currentSkills[skillId].level}`);
        }
        
        updated = true;
      }
    }

    if (updated) {
      this.notifySkillUpdate();
    }
  }

  /**
   * 注册技能更新回调
   */
  onSkillUpdate(callback: SkillUpdateCallback): () => void {
    this.skillUpdateCallbacks.push(callback);
    
    // 立即调用一次，传递当前技能状态
    callback(this.currentSkills);

    // 返回取消注册函数
    return () => {
      const index = this.skillUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.skillUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 通知所有回调
   */
  private notifySkillUpdate(): void {
    for (const callback of this.skillUpdateCallbacks) {
      callback(this.currentSkills);
    }
  }

  /**
   * 获取当前技能状态
   */
  getCurrentSkills(): Record<string, Skill> {
    return { ...this.currentSkills };
  }

  /**
   * 获取最近的思考事件
   */
  async getRecentEvents(limit: number = 50): Promise<ThinkingEvent[]> {
    if (!this.config) {
      console.error('SyncEngine not initialized');
      return [];
    }
    return this.supabase.getRecentEvents(this.config.extensionId, limit);
  }

  /**
   * 获取指定类别的技能
   */
  getSkillsByCategory(category: 'hunter' | 'builder' | 'sage' | 'berserker'): Skill[] {
    return Object.values(this.currentSkills).filter(skill => skill.category === category);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.supabase.dispose();
    this.skillUpdateCallbacks = [];
    this.currentSkills = {};
    this.config = null;
  }
}

// 单例实例
let syncEngineInstance: SyncEngine | null = null;

/**
 * 获取同步引擎单例
 */
export function getSyncEngine(): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine();
  }
  return syncEngineInstance;
}
