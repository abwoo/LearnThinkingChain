/**
 * 仪表板集成示例
 * 
 * 展示如何在仪表板中集成技能系统和 Supabase 实时订阅
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SkillTree } from './components/SkillTree';
import { getSyncEngine } from '@shared/sync/SyncEngine';
import type { Skill } from '@shared/types/skills';

export function DashboardApp() {
  const [extensionId, setExtensionId] = useState<string>('');
  const [skills, setSkills] = useState<Record<string, Skill>>({});
  const [isConnected, setIsConnected] = useState(false);

  // 初始化同步引擎
  useEffect(() => {
    if (!extensionId) return;

    const syncEngine = getSyncEngine();
    
    syncEngine.initialize({
      extensionId,
      sessionId: 'dashboard_session', // 仪表板使用固定会话 ID
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    }).then((initialized) => {
      setIsConnected(initialized);
      
      if (initialized) {
        // 订阅技能更新
        syncEngine.onSkillUpdate((updatedSkills) => {
          setSkills(updatedSkills);
        });
      }
    });

    return () => {
      syncEngine.dispose();
    };
  }, [extensionId]);

  // 使用 TanStack Query 获取最近的思考事件
  const { data: recentEvents } = useQuery({
    queryKey: ['thinking-events', extensionId],
    queryFn: async () => {
      if (!extensionId) return [];
      const syncEngine = getSyncEngine();
      const supabase = (syncEngine as any).supabase; // 访问内部 supabase 实例
      return await supabase.getRecentEvents(extensionId, 50);
    },
    enabled: isConnected && !!extensionId,
    refetchInterval: 5000 // 每 5 秒刷新
  });

  return (
    <div className="dashboard-container">
      {/* 扩展 ID 输入 */}
      <div className="connection-panel">
        <input
          type="text"
          placeholder="输入扩展 ID"
          value={extensionId}
          onChange={(e) => setExtensionId(e.target.value)}
        />
        <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '已连接' : '未连接'}
        </div>
      </div>

      {/* 技能树可视化 */}
      <div className="skill-tree-panel">
        <h2>技能树</h2>
        <SkillTree
          skills={skills}
          onSkillClick={(skill) => {
            console.log('Skill clicked:', skill);
            // 显示技能详情
          }}
        />
      </div>

      {/* 最近的思考事件 */}
      <div className="events-panel">
        <h2>最近的思考事件</h2>
        <div className="events-list">
          {recentEvents?.map((event) => (
            <div key={event.id} className="event-item">
              <div className="event-prompt">{event.prompt_text}</div>
              <div className="event-skills">
                {event.detected_skills.map((skillId) => (
                  <span key={skillId} className="skill-badge">
                    {skillId}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
