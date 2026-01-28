/**
 * SkillTree Component
 * 
 * 仪表板的六边形技能树可视化组件（使用 Framer Motion 动画）
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Skill, SkillCategory } from '@shared/types/skills';
import { SKILL_CATEGORIES, SKILL_DB } from '@shared/types/skills';

interface SkillTreeProps {
  skills: Record<string, Skill>;
  onSkillClick?: (skill: Skill) => void;
}

interface HexagonNode {
  skill: Skill;
  x: number;
  y: number;
  level: number;
}

export const SkillTree: React.FC<SkillTreeProps> = ({ skills, onSkillClick }) => {
  const [nodes, setNodes] = useState<HexagonNode[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);

  // 计算六边形节点位置
  useEffect(() => {
    const categoryPositions: Record<SkillCategory, { centerX: number; centerY: number }> = {
      hunter: { centerX: 200, centerY: 200 },
      builder: { centerX: 400, centerY: 200 },
      sage: { centerX: 300, centerY: 350 },
      berserker: { centerX: 300, centerY: 50 }
    };

    const hexRadius = 30;
    const hexSpacing = 80;

    const newNodes: HexagonNode[] = [];

    for (const category of Object.keys(SKILL_CATEGORIES) as SkillCategory[]) {
      const categorySkills = SKILL_DB.filter(s => s.category === category);
      const center = categoryPositions[category];
      const categoryInfo = SKILL_CATEGORIES[category];

      // 为每个技能创建六边形节点
      categorySkills.forEach((skill, index) => {
        const skillData = skills[skill.id] || skill;
        const angle = (index / categorySkills.length) * Math.PI * 2;
        const radius = hexSpacing * (1 + skillData.level * 0.3);

        newNodes.push({
          skill: skillData,
          x: center.centerX + Math.cos(angle) * radius,
          y: center.centerY + Math.sin(angle) * radius,
          level: skillData.level
        });
      });
    }

    setNodes(newNodes);
  }, [skills]);

  const filteredNodes = selectedCategory
    ? nodes.filter(node => node.skill.category === selectedCategory)
    : nodes;

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative', background: '#0a0a0a' }}>
      {/* 类别筛选器 */}
      <div style={{ display: 'flex', gap: '10px', padding: '20px', justifyContent: 'center' }}>
        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            padding: '8px 16px',
            background: selectedCategory === null ? '#3B82F6' : '#1f1f1f',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          全部
        </button>
        {Object.values(SKILL_CATEGORIES).map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              padding: '8px 16px',
              background: selectedCategory === category.id ? category.color : '#1f1f1f',
              color: '#fff',
              border: `1px solid ${category.color}`,
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {category.icon} {category.nameZh}
          </button>
        ))}
      </div>

      {/* SVG 画布 */}
      <svg width="100%" height="calc(100% - 80px)" style={{ position: 'absolute', top: '80px' }}>
        {/* 连接线 */}
        <AnimatePresence>
          {filteredNodes.map((node, index) => {
            const categoryCenter = {
              hunter: { x: 200, y: 200 },
              builder: { x: 400, y: 200 },
              sage: { x: 300, y: 350 },
              berserker: { x: 300, y: 50 }
            }[node.skill.category];

            return (
              <motion.line
                key={`line-${node.skill.id}`}
                x1={categoryCenter.x}
                y1={categoryCenter.y}
                x2={node.x}
                y2={node.y}
                stroke={SKILL_CATEGORIES[node.skill.category].color}
                strokeWidth={1}
                opacity={node.level > 0 ? 0.6 : 0.2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: index * 0.02 }}
              />
            );
          })}
        </AnimatePresence>
      </svg>

      {/* 六边形节点 */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <AnimatePresence>
          {filteredNodes.map(node => {
            const categoryInfo = SKILL_CATEGORIES[node.skill.category];
            const isActive = node.level > 0;
            const scale = 1 + node.level * 0.1;

            return (
              <motion.div
                key={node.skill.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isActive ? scale : 1,
                  opacity: isActive ? 1 : 0.5,
                  x: node.x,
                  y: node.y
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer'
                }}
                onClick={() => onSkillClick?.(node.skill)}
                onHoverStart={() => {
                  // 悬停时脉冲动画
                }}
              >
                {/* 六边形 */}
                <svg
                  width="50"
                  height="50"
                  viewBox="0 0 50 50"
                  style={{
                    filter: isActive ? `drop-shadow(0 0 10px ${categoryInfo.color})` : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <polygon
                    points="25,5 40,15 40,35 25,45 10,35 10,15"
                    fill={isActive ? categoryInfo.color : '#2a2a2a'}
                    stroke={categoryInfo.color}
                    strokeWidth={isActive ? 2 : 1}
                    opacity={isActive ? 1 : 0.5}
                  />
                  <text
                    x="25"
                    y="30"
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {node.level}
                  </text>
                </svg>
                {/* 技能名称提示 */}
                {node.level > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '60px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.9)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none'
                    }}
                  >
                    {node.skill.nameZh}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 类别中心节点 */}
      {Object.values(SKILL_CATEGORIES).map(category => {
        const centerPositions = {
          hunter: { x: 200, y: 200 },
          builder: { x: 400, y: 200 },
          sage: { x: 300, y: 350 },
          berserker: { x: 300, y: 50 }
        };
        const pos = centerPositions[category.id];

        return (
          <motion.div
            key={category.id}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${category.color}40, ${category.color})`,
              border: `2px solid ${category.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: `0 0 20px ${category.color}80`
            }}
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            {category.icon}
          </motion.div>
        );
      })}
    </div>
  );
};
