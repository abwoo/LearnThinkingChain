/**
 * Skills System - 技能系统
 * 
 * 定义 40 个技能，分为 4 大类别：
 * - Hunter (Perception): 感知类技能
 * - Builder (Logic): 逻辑构建类技能
 * - Sage (Metacognition): 元认知类技能
 * - Berserker (Trial & Error): 试错类技能
 */

export type SkillCategory = 'hunter' | 'builder' | 'sage' | 'berserker';

export interface Skill {
  id: string;
  name: string;
  nameZh: string;
  category: SkillCategory;
  description: string;
  descriptionZh: string;
  exp: number;
  level: number;
}

export interface SkillCategoryInfo {
  id: SkillCategory;
  name: string;
  nameZh: string;
  color: string;
  icon: string;
}

export const SKILL_CATEGORIES: Record<SkillCategory, SkillCategoryInfo> = {
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    nameZh: '猎手',
    color: '#3B82F6', // Blue
    icon: '🎯'
  },
  builder: {
    id: 'builder',
    name: 'Builder',
    nameZh: '建造者',
    color: '#10B981', // Green
    icon: '🏗️'
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    nameZh: '智者',
    color: '#8B5CF6', // Purple
    icon: '🧠'
  },
  berserker: {
    id: 'berserker',
    name: 'Berserker',
    nameZh: '狂战士',
    color: '#EF4444', // Red
    icon: '⚡'
  }
};

/**
 * 技能数据库 - 40 个技能
 */
export const SKILL_DB: Skill[] = [
  // Category A: Hunter (Perception) - 10 skills
  {
    id: 'hunter_01',
    name: 'Visual Anchor',
    nameZh: '视觉锚点',
    category: 'hunter',
    description: 'Identify visual cues and spatial relationships before diving into abstract concepts.',
    descriptionZh: '在深入抽象概念之前，识别视觉线索和空间关系。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_02',
    name: 'Noise Filter',
    nameZh: '噪声过滤',
    category: 'hunter',
    description: 'Distinguish between relevant information and distracting surface cues.',
    descriptionZh: '区分相关信息与分散注意力的表面线索。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_03',
    name: 'Hidden Constraint',
    nameZh: '隐藏约束识别',
    category: 'hunter',
    description: 'Detect implicit boundaries, assumptions, or limitations that are not explicitly stated.',
    descriptionZh: '检测未明确说明的隐含边界、假设或限制。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_04',
    name: 'Unit Scout',
    nameZh: '单位侦察',
    category: 'hunter',
    description: 'Verify dimensional consistency and unit compatibility across calculations.',
    descriptionZh: '验证计算中的维度一致性和单位兼容性。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_05',
    name: 'Pattern ID',
    nameZh: '模式识别',
    category: 'hunter',
    description: 'Recognize recurring structures, symmetries, or familiar problem templates.',
    descriptionZh: '识别重复出现的结构、对称性或熟悉的问题模板。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_06',
    name: 'Keyword Hunter',
    nameZh: '关键词猎手',
    category: 'hunter',
    description: 'Extract key terms and concepts that signal the core of the problem.',
    descriptionZh: '提取标识问题核心的关键术语和概念。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_07',
    name: 'Structure X-Ray',
    nameZh: '结构透视',
    category: 'hunter',
    description: 'See through surface complexity to identify underlying organizational patterns.',
    descriptionZh: '透过表面复杂性，识别底层的组织结构模式。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_08',
    name: 'Variable Isolation',
    nameZh: '变量隔离',
    category: 'hunter',
    description: 'Identify which variables are independent, dependent, or controlled.',
    descriptionZh: '识别哪些变量是独立的、依赖的或受控的。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_09',
    name: 'Boundary Watch',
    nameZh: '边界监视',
    category: 'hunter',
    description: 'Monitor edge cases, limits, and boundary conditions that could invalidate solutions.',
    descriptionZh: '监控可能使解决方案无效的边缘情况、限制和边界条件。',
    exp: 0,
    level: 0
  },
  {
    id: 'hunter_10',
    name: 'Trap Detection',
    nameZh: '陷阱检测',
    category: 'hunter',
    description: 'Spot common pitfalls, misleading formulations, or intentional distractors.',
    descriptionZh: '发现常见的陷阱、误导性表述或故意设置的干扰项。',
    exp: 0,
    level: 0
  },

  // Category B: Builder (Logic) - 10 skills
  {
    id: 'builder_01',
    name: 'Chain Reaction',
    nameZh: '链式反应',
    category: 'builder',
    description: 'Trace causal sequences and logical dependencies step by step.',
    descriptionZh: '逐步追踪因果序列和逻辑依赖关系。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_02',
    name: 'Reverse Engineer',
    nameZh: '逆向工程',
    category: 'builder',
    description: 'Work backwards from the desired outcome to identify necessary conditions.',
    descriptionZh: '从期望的结果反向工作，识别必要条件。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_03',
    name: 'Model Mapping',
    nameZh: '模型映射',
    category: 'builder',
    description: 'Map the problem onto a known mathematical or conceptual framework.',
    descriptionZh: '将问题映射到已知的数学或概念框架上。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_04',
    name: 'Analogy Bridge',
    nameZh: '类比桥梁',
    category: 'builder',
    description: 'Use analogies to transfer insights from familiar domains to new problems.',
    descriptionZh: '使用类比将熟悉领域的见解转移到新问题中。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_05',
    name: 'Hypothesis Craft',
    nameZh: '假设构建',
    category: 'builder',
    description: 'Formulate testable hypotheses and logical conjectures.',
    descriptionZh: '构建可测试的假设和逻辑猜想。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_06',
    name: 'Dimension Check',
    nameZh: '维度检查',
    category: 'builder',
    description: 'Verify that equations and relationships are dimensionally consistent.',
    descriptionZh: '验证方程和关系在维度上是一致的。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_07',
    name: 'Algorithm Design',
    nameZh: '算法设计',
    category: 'builder',
    description: 'Construct step-by-step procedures to solve the problem systematically.',
    descriptionZh: '构建逐步程序，系统地解决问题。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_08',
    name: 'Feedback Loop',
    nameZh: '反馈循环',
    category: 'builder',
    description: 'Identify and leverage iterative processes or self-correcting mechanisms.',
    descriptionZh: '识别并利用迭代过程或自我纠正机制。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_09',
    name: 'Simplify',
    nameZh: '简化',
    category: 'builder',
    description: 'Reduce complexity by focusing on essential elements and ignoring non-essentials.',
    descriptionZh: '通过关注基本要素并忽略非必要要素来降低复杂性。',
    exp: 0,
    level: 0
  },
  {
    id: 'builder_10',
    name: 'Visualize',
    nameZh: '可视化',
    category: 'builder',
    description: 'Create mental or physical representations to clarify relationships.',
    descriptionZh: '创建心理或物理表示以澄清关系。',
    exp: 0,
    level: 0
  },

  // Category C: Sage (Metacognition) - 10 skills
  {
    id: 'sage_01',
    name: 'Ego Check',
    nameZh: '自我检查',
    category: 'sage',
    description: 'Recognize when personal biases or overconfidence are clouding judgment.',
    descriptionZh: '识别个人偏见或过度自信何时影响判断。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_02',
    name: 'Dead-End Exit',
    nameZh: '死胡同退出',
    category: 'sage',
    description: 'Recognize unproductive paths early and pivot to alternative strategies.',
    descriptionZh: '及早识别无效路径，转向替代策略。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_03',
    name: 'Knowledge Retrieval',
    nameZh: '知识检索',
    category: 'sage',
    description: 'Actively recall relevant concepts, formulas, or techniques from memory.',
    descriptionZh: '主动从记忆中回忆相关概念、公式或技术。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_04',
    name: 'Error Analysis',
    nameZh: '错误分析',
    category: 'sage',
    description: 'Systematically identify and learn from mistakes.',
    descriptionZh: '系统地识别错误并从中学习。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_05',
    name: 'Perspective Shift',
    nameZh: '视角转换',
    category: 'sage',
    description: 'Deliberately adopt different viewpoints or frames of reference.',
    descriptionZh: '有意识地采用不同的观点或参考框架。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_06',
    name: 'Confidence Calibrate',
    nameZh: '信心校准',
    category: 'sage',
    description: 'Accurately assess the certainty of your knowledge and predictions.',
    descriptionZh: '准确评估你的知识和预测的确定性。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_07',
    name: 'Focus Flow',
    nameZh: '专注流',
    category: 'sage',
    description: 'Maintain sustained attention and avoid distractions during deep work.',
    descriptionZh: '在深度工作中保持持续注意力并避免分心。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_08',
    name: 'Strategy Pivot',
    nameZh: '策略转向',
    category: 'sage',
    description: 'Switch between different problem-solving approaches when one stalls.',
    descriptionZh: '当一种方法停滞时，在不同的问题解决方法之间切换。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_09',
    name: 'Resource Manage',
    nameZh: '资源管理',
    category: 'sage',
    description: 'Allocate time and mental energy efficiently across different tasks.',
    descriptionZh: '在不同任务之间高效分配时间和心理能量。',
    exp: 0,
    level: 0
  },
  {
    id: 'sage_10',
    name: 'Why Ask',
    nameZh: '追问为什么',
    category: 'sage',
    description: 'Persistently question assumptions and dig deeper into root causes.',
    descriptionZh: '持续质疑假设并深入挖掘根本原因。',
    exp: 0,
    level: 0
  },

  // Category D: Berserker (Trial & Error) - 10 skills
  {
    id: 'berserker_01',
    name: 'Chaos Walk',
    nameZh: '混沌漫步',
    category: 'berserker',
    description: 'Explore solution space randomly to discover unexpected connections.',
    descriptionZh: '随机探索解决方案空间，发现意外的联系。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_02',
    name: 'Extreme Test',
    nameZh: '极端测试',
    category: 'berserker',
    description: 'Push variables to their limits to reveal hidden behaviors or constraints.',
    descriptionZh: '将变量推向极限，揭示隐藏的行为或约束。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_03',
    name: 'Brute Force',
    nameZh: '暴力破解',
    category: 'berserker',
    description: 'Systematically try all possible combinations when the solution space is small.',
    descriptionZh: '当解决方案空间较小时，系统地尝试所有可能的组合。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_04',
    name: 'Intuition Leap',
    nameZh: '直觉跳跃',
    category: 'berserker',
    description: 'Make educated guesses based on pattern recognition and gut feeling.',
    descriptionZh: '基于模式识别和直觉做出有根据的猜测。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_05',
    name: 'Failure Embrace',
    nameZh: '拥抱失败',
    category: 'berserker',
    description: 'View failures as valuable data points that inform future attempts.',
    descriptionZh: '将失败视为有价值的数据点，为未来的尝试提供信息。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_06',
    name: 'Rule Break',
    nameZh: '打破规则',
    category: 'berserker',
    description: 'Question and violate conventional assumptions to find creative solutions.',
    descriptionZh: '质疑并违反传统假设，寻找创造性解决方案。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_07',
    name: 'Data Mining',
    nameZh: '数据挖掘',
    category: 'berserker',
    description: 'Extract patterns and insights from large amounts of trial data.',
    descriptionZh: '从大量试验数据中提取模式和见解。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_08',
    name: 'Pattern Smash',
    nameZh: '模式粉碎',
    category: 'berserker',
    description: 'Deliberately break expected patterns to expose underlying structures.',
    descriptionZh: '故意打破预期模式，暴露底层结构。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_09',
    name: 'Adversarial Think',
    nameZh: '对抗性思考',
    category: 'berserker',
    description: 'Actively seek out weaknesses and counterarguments to your own solutions.',
    descriptionZh: '积极寻找自己解决方案的弱点和反驳论点。',
    exp: 0,
    level: 0
  },
  {
    id: 'berserker_10',
    name: 'Panic Control',
    nameZh: '恐慌控制',
    category: 'berserker',
    description: 'Maintain composure and systematic thinking under pressure or time constraints.',
    descriptionZh: '在压力或时间限制下保持冷静和系统思考。',
    exp: 0,
    level: 0
  }
];

/**
 * 根据技能 ID 获取技能
 */
export function getSkillById(id: string): Skill | undefined {
  return SKILL_DB.find(skill => skill.id === id);
}

/**
 * 根据类别获取所有技能
 */
export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return SKILL_DB.filter(skill => skill.category === category);
}

/**
 * 计算技能等级（每 100 XP 升一级）
 */
export function calculateSkillLevel(exp: number): number {
  return Math.floor(exp / 100);
}

/**
 * 更新技能经验值并重新计算等级
 */
export function updateSkillExp(skill: Skill, expGain: number): Skill {
  const newExp = skill.exp + expGain;
  return {
    ...skill,
    exp: newExp,
    level: calculateSkillLevel(newExp)
  };
}

/**
 * 根据技能 ID 数组获取技能列表
 */
export function getSkillsByIds(ids: string[]): Skill[] {
  return ids.map(id => getSkillById(id)).filter((skill): skill is Skill => skill !== undefined);
}

/**
 * 技能识别关键词映射（用于 AI 自动识别技能）
 */
export const SKILL_KEYWORDS: Record<string, string[]> = {
  // Hunter skills
  hunter_01: ['visual', 'anchor', 'spatial', 'see', 'observe', 'visual cue', '视觉', '锚点', '空间'],
  hunter_02: ['noise', 'filter', 'distraction', 'irrelevant', '噪声', '过滤', '干扰'],
  hunter_03: ['hidden', 'constraint', 'implicit', 'assumption', 'boundary', '隐藏', '约束', '隐含'],
  hunter_04: ['unit', 'dimension', 'scout', 'verify', '单位', '维度', '验证'],
  hunter_05: ['pattern', 'recognize', 'structure', 'symmetry', '模式', '识别', '结构'],
  hunter_06: ['keyword', 'extract', 'core', 'term', '关键词', '提取', '核心'],
  hunter_07: ['structure', 'x-ray', 'underlying', 'organize', '结构', '透视', '底层'],
  hunter_08: ['variable', 'isolate', 'independent', 'dependent', '变量', '隔离', '独立'],
  hunter_09: ['boundary', 'edge case', 'limit', '边界', '边缘', '限制'],
  hunter_10: ['trap', 'pitfall', 'misleading', 'distractor', '陷阱', '误导', '干扰'],

  // Builder skills
  builder_01: ['chain', 'reaction', 'causal', 'sequence', '链式', '反应', '因果'],
  builder_02: ['reverse', 'engineer', 'backward', 'necessary', '逆向', '工程', '反向'],
  builder_03: ['model', 'map', 'framework', '模型', '映射', '框架'],
  builder_04: ['analogy', 'bridge', 'transfer', '类比', '桥梁', '转移'],
  builder_05: ['hypothesis', 'conjecture', 'testable', '假设', '猜想', '可测试'],
  builder_06: ['dimension', 'check', 'consistent', '维度', '检查', '一致'],
  builder_07: ['algorithm', 'design', 'procedure', 'step', '算法', '设计', '步骤'],
  builder_08: ['feedback', 'loop', 'iterative', '反馈', '循环', '迭代'],
  builder_09: ['simplify', 'reduce', 'essential', '简化', '减少', '基本'],
  builder_10: ['visualize', 'represent', 'diagram', '可视化', '表示', '图表'],

  // Sage skills
  sage_01: ['ego', 'bias', 'overconfidence', '自我', '偏见', '过度自信'],
  sage_02: ['dead-end', 'exit', 'pivot', 'unproductive', '死胡同', '退出', '转向'],
  sage_03: ['knowledge', 'retrieve', 'recall', 'memory', '知识', '检索', '回忆'],
  sage_04: ['error', 'analysis', 'mistake', 'learn', '错误', '分析', '学习'],
  sage_05: ['perspective', 'shift', 'viewpoint', '视角', '转换', '观点'],
  sage_06: ['confidence', 'calibrate', 'certainty', '信心', '校准', '确定性'],
  sage_07: ['focus', 'flow', 'attention', 'distraction', '专注', '流', '注意力'],
  sage_08: ['strategy', 'pivot', 'approach', 'switch', '策略', '转向', '方法'],
  sage_09: ['resource', 'manage', 'allocate', 'time', '资源', '管理', '分配'],
  sage_10: ['why', 'ask', 'question', 'assumption', '为什么', '追问', '假设'],

  // Berserker skills
  berserker_01: ['chaos', 'walk', 'random', 'explore', '混沌', '漫步', '随机'],
  berserker_02: ['extreme', 'test', 'limit', 'push', '极端', '测试', '极限'],
  berserker_03: ['brute', 'force', 'try all', 'combinations', '暴力', '破解', '尝试所有'],
  berserker_04: ['intuition', 'leap', 'guess', 'gut', '直觉', '跳跃', '猜测'],
  berserker_05: ['failure', 'embrace', 'data', 'point', '失败', '拥抱', '数据'],
  berserker_06: ['rule', 'break', 'violate', 'conventional', '规则', '打破', '违反'],
  berserker_07: ['data', 'mining', 'extract', 'pattern', '数据', '挖掘', '提取'],
  berserker_08: ['pattern', 'smash', 'break', 'expected', '模式', '粉碎', '打破'],
  berserker_09: ['adversarial', 'think', 'weakness', 'counterargument', '对抗', '思考', '弱点'],
  berserker_10: ['panic', 'control', 'composure', 'pressure', '恐慌', '控制', '冷静']
};

/**
 * 根据文本内容识别可能使用的技能
 */
export function detectSkillsFromText(text: string): string[] {
  const detectedSkills: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [skillId, keywords] of Object.entries(SKILL_KEYWORDS)) {
    const matches = keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
    if (matches.length > 0) {
      detectedSkills.push(skillId);
    }
  }

  return detectedSkills;
}
