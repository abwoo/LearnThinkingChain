/**
 * ThinkingOrb Component
 * 
 * 扩展端的 HUD 组件，显示当前活跃类别和迷你雷达图
 */

import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { SkillCategory, Skill } from '@shared/types/skills';
import { SKILL_CATEGORIES } from '@shared/types/skills';

interface ThinkingOrbProps {
  activeCategory: SkillCategory | null;
  skills: Record<string, Skill>;
  onHover?: (category: SkillCategory | null) => void;
}

export const ThinkingOrb: React.FC<ThinkingOrbProps> = ({
  activeCategory,
  skills,
  onHover: _onHover
}) => {
  const [showRadar, setShowRadar] = useState(false);
  const [sessionStats, setSessionStats] = useState<Record<SkillCategory, number>>({
    hunter: 0,
    builder: 0,
    sage: 0,
    berserker: 0
  });

  // 计算当前会话的类别统计
  useEffect(() => {
    const stats: Record<SkillCategory, number> = {
      hunter: 0,
      builder: 0,
      sage: 0,
      berserker: 0
    };

    for (const skill of Object.values(skills)) {
      if (skill.exp > 0) {
        stats[skill.category] += skill.exp;
      }
    }

    setSessionStats(stats);
  }, [skills]);

  // 准备雷达图数据
  const radarData = [
    {
      category: '猎手',
      value: sessionStats.hunter,
      fullMark: Math.max(...Object.values(sessionStats), 100)
    },
    {
      category: '建造者',
      value: sessionStats.builder,
      fullMark: Math.max(...Object.values(sessionStats), 100)
    },
    {
      category: '智者',
      value: sessionStats.sage,
      fullMark: Math.max(...Object.values(sessionStats), 100)
    },
    {
      category: '狂战士',
      value: sessionStats.berserker,
      fullMark: Math.max(...Object.values(sessionStats), 100)
    }
  ];

  const categoryInfo = activeCategory ? SKILL_CATEGORIES[activeCategory] : null;
  const orbColor = categoryInfo?.color || '#6B7280';
  const orbIcon = categoryInfo?.icon || '💭';

  return (
    <div
      className="thinking-orb-container"
      onMouseEnter={() => setShowRadar(true)}
      onMouseLeave={() => setShowRadar(false)}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000,
        cursor: 'pointer'
      }}
    >
      {/* 主球体 */}
      <div
        className="thinking-orb"
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${orbColor}40, ${orbColor})`,
          border: `2px solid ${orbColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: `0 0 20px ${orbColor}80`,
          transition: 'all 0.3s ease',
          transform: showRadar ? 'scale(1.1)' : 'scale(1)'
        }}
      >
        {orbIcon}
      </div>

      {/* 迷你雷达图（悬停时显示） */}
      {showRadar && (
        <div
          className="thinking-orb-radar"
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            width: '200px',
            height: '200px',
            background: 'rgba(0, 0, 0, 0.9)',
            borderRadius: '8px',
            padding: '10px',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${orbColor}`,
            boxShadow: `0 0 20px ${orbColor}40`
          }}
        >
          <div style={{ color: '#fff', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>
            当前会话统计
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: '#fff', fontSize: 10 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 'dataMax']}
                tick={{ fill: '#fff', fontSize: 8 }}
              />
              <Radar
                name="经验值"
                dataKey="value"
                stroke={orbColor}
                fill={orbColor}
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
