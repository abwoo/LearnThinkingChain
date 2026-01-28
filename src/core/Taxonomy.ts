import type { ExtensionSettings, TaxonomyRule } from '../types/Settings';

export interface ClassificationResult {
  topic: string;
  module: string;
  problemType: string;
}

export function classifyInput(input: string, settings: ExtensionSettings): ClassificationResult {
  return {
    topic: matchTaxonomy(input, settings.taxonomy.topics, defaultTopics()),
    module: matchTaxonomy(input, settings.taxonomy.modules, defaultModules()),
    problemType: matchTaxonomy(input, settings.taxonomy.types, defaultTypes())
  };
}

function matchTaxonomy(input: string, custom: TaxonomyRule[], fallback: TaxonomyRule[]): string {
  for (const rule of custom ?? []) {
    if (!rule?.label || !Array.isArray(rule.keywords)) continue;
    for (const keyword of rule.keywords) {
      if (!keyword) continue;
      try {
        if (new RegExp(keyword, 'i').test(input)) return rule.label;
      } catch {
        if (input.includes(keyword)) return rule.label;
      }
    }
  }
  for (const rule of fallback) {
    for (const keyword of rule.keywords) {
      if (new RegExp(keyword, 'i').test(input)) return rule.label;
    }
  }
  return 'general';
}

function defaultTopics(): TaxonomyRule[] {
  return [
    { label: '力学', keywords: ['受力', '力学', '牛顿', '摩擦', '速度', '加速度', '动量', '功', '能量'] },
    { label: '电路', keywords: ['电路', '电阻', '电容', '电感', '电流', '电压', '欧姆'] },
    { label: '数学', keywords: ['函数', '极限', '导数', '积分', '矩阵', '向量', '概率', '统计'] },
    { label: '编程', keywords: ['算法', '复杂度', '递归', '指针', '并发', '线程', '数据库'] }
  ];
}

function defaultModules(): TaxonomyRule[] {
  return [
    { label: '物理', keywords: ['力学', '电路', '光学', '热学', '电磁', '粒子'] },
    { label: '数学', keywords: ['函数', '极限', '导数', '积分', '向量', '矩阵', '概率'] },
    { label: '计算机', keywords: ['算法', '代码', '复杂度', '编译', '数据库', '网络'] },
    { label: '化学', keywords: ['摩尔', '化学反应', '氧化', '还原', '溶液', '平衡'] }
  ];
}

function defaultTypes(): TaxonomyRule[] {
  return [
    { label: '概念理解', keywords: ['是什么', '如何理解', '概念', '定义', '原理'] },
    { label: '推导证明', keywords: ['证明', '推导', '为什么成立', '严密', '推理'] },
    { label: '计算求解', keywords: ['求解', '计算', '求值', '结果是多少', '数值'] },
    { label: '纠错', keywords: ['哪里错', '不对', '修正', '纠错', '不成立'] }
  ];
}
