/**
 * Supabase Service
 * 
 * 处理 Supabase 认证、实时订阅和数据推送
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface ThinkingEvent {
  id?: string;
  user_id?: string;
  extension_id: string;
  session_id: string;
  prompt_text: string;
  ai_response: string;
  detected_skills: string[]; // Skill IDs
  skill_exp_gains: Record<string, number>; // { skill_id: exp_gain }
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private config: SupabaseConfig | null = null;

  /**
   * 初始化 Supabase 客户端
   */
  async initialize(config: SupabaseConfig): Promise<void> {
    this.config = config;
    this.client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false, // 扩展中不使用持久化会话
        autoRefreshToken: false
      }
    });

    // 尝试匿名登录（如果 Supabase 配置允许）
    try {
      const { error } = await this.client.auth.signInAnonymously();
      if (error && error.message !== 'Email rate limit exceeded') {
        console.warn('Supabase anonymous auth failed:', error.message);
        // 继续执行，某些操作可能不需要认证
      }
    } catch (err) {
      console.warn('Supabase anonymous auth error:', err);
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * 推送思考事件到 Supabase
   */
  async pushThinkingEvent(event: ThinkingEvent): Promise<boolean> {
    if (!this.client) {
      console.error('Supabase client not initialized');
      return false;
    }

    try {
      const { error } = await this.client
        .from('user_thinking_events')
        .insert([{
          extension_id: event.extension_id,
          session_id: event.session_id,
          prompt_text: event.prompt_text,
          ai_response: event.ai_response,
          detected_skills: event.detected_skills,
          skill_exp_gains: event.skill_exp_gains,
          timestamp: event.timestamp || new Date().toISOString(),
          metadata: event.metadata || {}
        }]);

      if (error) {
        console.error('Failed to push thinking event:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error pushing thinking event:', err);
      return false;
    }
  }

  /**
   * 订阅实时更新
   */
  subscribeToThinkingEvents(
    extensionId: string,
    callback: (event: ThinkingEvent) => void
  ): () => void {
    if (!this.client) {
      console.error('Supabase client not initialized');
      return () => {};
    }

    // 创建实时频道
    this.channel = this.client
      .channel(`user_thinking_events:${extensionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_thinking_events',
          filter: `extension_id=eq.${extensionId}`
        },
        (payload: { new: ThinkingEvent }) => {
          const event = payload.new;
          callback(event);
        }
      )
      .subscribe();

    // 返回取消订阅函数
    return () => {
      if (this.channel) {
        this.client?.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  /**
   * 获取用户的技能数据
   */
  async getUserSkills(extensionId: string): Promise<Record<string, { exp: number; level: number }>> {
    if (!this.client) {
      console.error('Supabase client not initialized');
      return {};
    }

    try {
      // 从 user_thinking_events 聚合技能经验值
      const { data, error } = await this.client
        .from('user_thinking_events')
        .select('skill_exp_gains')
        .eq('extension_id', extensionId);

      if (error) {
        console.error('Failed to fetch user skills:', error);
        return {};
      }

      // 聚合所有技能经验值
      const skills: Record<string, { exp: number; level: number }> = {};
      
      if (data) {
        for (const row of data) {
          const gains = row.skill_exp_gains as Record<string, number> || {};
          for (const [skillId, expGain] of Object.entries(gains)) {
            if (!skills[skillId]) {
              skills[skillId] = { exp: 0, level: 0 };
            }
            skills[skillId].exp += expGain;
            skills[skillId].level = Math.floor(skills[skillId].exp / 100);
          }
        }
      }

      return skills;
    } catch (err) {
      console.error('Error fetching user skills:', err);
      return {};
    }
  }

  /**
   * 获取最近的思考事件
   */
  async getRecentEvents(
    extensionId: string,
    limit: number = 50
  ): Promise<ThinkingEvent[]> {
    if (!this.client) {
      console.error('Supabase client not initialized');
      return [];
    }

    try {
      const { data, error } = await this.client
        .from('user_thinking_events')
        .select('*')
        .eq('extension_id', extensionId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch recent events:', error);
        return [];
      }

      return (data || []) as ThinkingEvent[];
    } catch (err) {
      console.error('Error fetching recent events:', err);
      return [];
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.channel) {
      this.client?.removeChannel(this.channel);
      this.channel = null;
    }
    this.client = null;
    this.config = null;
  }
}

// 单例实例
let supabaseServiceInstance: SupabaseService | null = null;

/**
 * 获取 Supabase 服务单例
 */
export function getSupabaseService(): SupabaseService {
  if (!supabaseServiceInstance) {
    supabaseServiceInstance = new SupabaseService();
  }
  return supabaseServiceInstance;
}
