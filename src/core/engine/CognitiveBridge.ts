/**
 * Cognitive Bridge - 认知桥梁
 * 
 * Service that bridges user's knowledge debt with prompt generation
 */

import { CognitiveProfileService, UserCognitiveProfile } from './CognitiveProfile';

export interface BridgeContext {
  profile: UserCognitiveProfile;
  currentPrompt: string;
  detectedTopics: string[];
  sessionId: string;
}

export interface BridgeResult {
  enhancedPrompt: string;
  knowledgeDebtAddressed: string[];
  logicBridges: string[];
  zpdAdjustments: {
    complexity: 'low' | 'medium' | 'high';
    scaffolding: string[];
  };
}

export class CognitiveBridge {
  /**
   * Analyze user's knowledge debt and enhance prompt
   */
  static async bridge(context: BridgeContext): Promise<BridgeResult> {
    const { profile, currentPrompt, detectedTopics, sessionId } = context;

    // Identify knowledge debt to address
    const highDebtConcepts = CognitiveProfileService.getHighDebtConcepts(profile, 3);
    const topWeakPoints = CognitiveProfileService.getTopWeakPoints(profile, 3);
    
    // Determine ZPD adjustments
    const zpdAdjustments = this.calculateZPDAdjustments(profile, detectedTopics);
    
    // Build logic bridges
    const logicBridges = this.buildLogicBridges(
      highDebtConcepts,
      topWeakPoints.map(([topic]) => topic)
    );

    // Enhance prompt with cognitive scaffolding
    const enhancedPrompt = this.enhancePrompt(
      currentPrompt,
      {
        knowledgeDebt: highDebtConcepts,
        weakPoints: topWeakPoints.map(([topic]) => topic),
        zpd: zpdAdjustments,
        logicBridges
      }
    );

    // Record bridge usage
    await CognitiveProfileService.addSessionLog(profile, {
      logicBridgeUsed: logicBridges.join(', '),
      promptText: currentPrompt,
      responseLength: 0,
      skillsDetected: []
    });

    return {
      enhancedPrompt,
      knowledgeDebtAddressed: highDebtConcepts,
      logicBridges,
      zpdAdjustments
    };
  }

  /**
   * Calculate Zone of Proximal Development adjustments
   */
  private static calculateZPDAdjustments(
    profile: UserCognitiveProfile,
    topics: string[]
  ): BridgeResult['zpdAdjustments'] {
    // Analyze weak points for detected topics
    const topicWeakness = topics
      .map(topic => ({
        topic,
        weakness: profile.weakPoints.get(topic) || 0
      }))
      .sort((a, b) => b.weakness - a.weakness);

    const maxWeakness = topicWeakness[0]?.weakness || 0;
    
    // Determine complexity level
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    if (maxWeakness >= 5) {
      complexity = 'low'; // High weakness = lower complexity
    } else if (maxWeakness <= 1) {
      complexity = 'high'; // Low weakness = higher complexity
    }

    // Generate scaffolding strategies
    const scaffolding: string[] = [];
    
    if (maxWeakness >= 3) {
      scaffolding.push('Start with visual analogies');
      scaffolding.push('Break into smaller steps');
      scaffolding.push('Provide concrete examples first');
    }
    
    if (profile.preferredHeuristics === 'visual') {
      scaffolding.push('Use visual representations');
      scaffolding.push('Draw diagrams when explaining');
    } else if (profile.preferredHeuristics === 'analogical') {
      scaffolding.push('Use analogies from familiar domains');
      scaffolding.push('Map concepts to known patterns');
    } else {
      scaffolding.push('Build logical chains step-by-step');
      scaffolding.push('Verify each step before proceeding');
    }

    return { complexity, scaffolding };
  }

  /**
   * Build logic bridges to connect user's knowledge gaps
   */
  private static buildLogicBridges(
    highDebtConcepts: string[],
    weakTopics: string[]
  ): string[] {
    const bridges: string[] = [];

    if (highDebtConcepts.length > 0) {
      bridges.push(
        `Address knowledge debt: ${highDebtConcepts.slice(0, 3).join(', ')}`
      );
    }

    if (weakTopics.length > 0) {
      bridges.push(
        `Strengthen weak areas: ${weakTopics.slice(0, 2).join(', ')}`
      );
    }

    // Add heuristic-specific bridges
    bridges.push('Connect to first principles');
    bridges.push('Identify hidden constraints');

    return bridges;
  }

  /**
   * Enhance prompt with cognitive scaffolding
   */
  private static enhancePrompt(
    originalPrompt: string,
    context: {
      knowledgeDebt: string[];
      weakPoints: string[];
      zpd: BridgeResult['zpdAdjustments'];
      logicBridges: string[];
    }
  ): string {
    const { knowledgeDebt, weakPoints, zpd, logicBridges } = context;

    let enhanced = originalPrompt;

    // Add ZPD scaffolding instructions
    if (zpd.scaffolding.length > 0) {
      enhanced = `[ZPD SCAFFOLDING: ${zpd.complexity.toUpperCase()} COMPLEXITY]\n` +
        `- ${zpd.scaffolding.join('\n- ')}\n\n` +
        enhanced;
    }

    // Add knowledge debt context
    if (knowledgeDebt.length > 0) {
      enhanced = `[KNOWLEDGE DEBT TO ADDRESS]\n` +
        `The user has recurring difficulties with: ${knowledgeDebt.join(', ')}\n` +
        `Explicitly address these concepts in your response.\n\n` +
        enhanced;
    }

    // Add weak points context
    if (weakPoints.length > 0) {
      enhanced = `[WEAK POINTS TO STRENGTHEN]\n` +
        `Focus on reinforcing understanding of: ${weakPoints.join(', ')}\n\n` +
        enhanced;
    }

    // Add logic bridges
    if (logicBridges.length > 0) {
      enhanced = `[LOGIC BRIDGES]\n` +
        `- ${logicBridges.join('\n- ')}\n\n` +
        enhanced;
    }

    return enhanced;
  }

  /**
   * Detect topics from prompt text
   */
  static detectTopics(promptText: string): string[] {
    // Simple keyword-based topic detection
    // Can be enhanced with NLP in the future
    const topicKeywords: Record<string, string[]> = {
      'mathematics': ['math', 'calculate', 'equation', 'formula', 'number', '数学', '计算', '方程'],
      'physics': ['force', 'energy', 'velocity', 'acceleration', '力', '能量', '速度'],
      'programming': ['code', 'function', 'algorithm', 'variable', '代码', '函数', '算法'],
      'logic': ['if', 'then', 'therefore', 'premise', '结论', '前提', '逻辑'],
      'analysis': ['analyze', 'examine', 'evaluate', '分析', '评估', '检查']
    };

    const detected: string[] = [];
    const lowerText = promptText.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detected.push(topic);
      }
    }

    return detected.length > 0 ? detected : ['general'];
  }
}
