/**
 * Cognitive Feedback Loop - 认知反馈循环
 * 
 * Analyzes Gemini's response DOM to verify if it followed the "Novice Perspective"
 * and updates the local CognitiveProfile accordingly
 */

import { CognitiveProfileService, UserCognitiveProfile } from './CognitiveProfile';
import { defaultLogger, Logger } from '../../utils/logger';
import { parseStructuredResponse } from '../../core/ResponseParser';

export interface ResponseAnalysis {
  followsNovicePerspective: boolean;
  containsBacktracking: boolean;
  containsMisstep: boolean;
  containsHandover: boolean;
  q1Present: boolean;
  q2Present: boolean;
  q3Present: boolean;
  q4Present: boolean;
  complexityLevel: 'low' | 'medium' | 'high';
  jargonCount: number;
  visualAnchors: number;
  firstPrinciplesMentions: number;
}

export interface FeedbackResult {
  analysis: ResponseAnalysis;
  profileUpdates: {
    knowledgeDebtAdjustments: Map<string, number>;
    weakPointUpdates: Map<string, number>;
    heuristicPreference?: 'visual' | 'analytical' | 'analogical';
  };
}

export class CognitiveFeedbackLoop {
  private readonly logger: Logger;
  private readonly responseSelectors: string[];

  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
    this.responseSelectors = [
      '[data-message-author-role="model"]',
      '[data-message-author-role="assistant"]',
      '.model-response',
      '.assistant-message',
      '[role="article"]',
      '.response-content',
      'div[data-testid*="message"]',
      'div[data-testid*="response"]'
    ];
  }

  /**
   * Analyze Gemini response DOM and provide feedback
   */
  async analyzeResponse(
    profile: UserCognitiveProfile,
    promptText: string
  ): Promise<FeedbackResult | null> {
    try {
      // Find the latest response element
      const responseElement = this.findLatestResponse();
      if (!responseElement) {
        this.logger.warn('CognitiveFeedbackLoop: No response element found');
        return null;
      }

      // Extract response text
      const responseText = this.extractResponseText(responseElement);
      if (!responseText || responseText.length < 50) {
        this.logger.warn('CognitiveFeedbackLoop: Response text too short');
        return null;
      }

      // Analyze response
      const analysis = this.analyzeResponseContent(responseText, promptText);

      // Generate profile updates
      const profileUpdates = this.generateProfileUpdates(profile, analysis, responseText);

      this.logger.info('CognitiveFeedbackLoop: Analysis complete', {
        followsNovicePerspective: analysis.followsNovicePerspective,
        containsBacktracking: analysis.containsBacktracking
      });

      return {
        analysis,
        profileUpdates
      };
    } catch (error) {
      this.logger.error('CognitiveFeedbackLoop: Error analyzing response', error);
      return null;
    }
  }

  /**
   * Find the latest response element in DOM
   */
  private findLatestResponse(): HTMLElement | null {
    for (const selector of this.responseSelectors) {
      try {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        if (elements.length > 0) {
          // Return the last (most recent) element
          return elements[elements.length - 1];
        }
      } catch (error) {
        this.logger.debug(`CognitiveFeedbackLoop: Selector failed: ${selector}`, error);
        continue;
      }
    }

    // Fallback: search for any element containing response-like content
    const allDivs = document.querySelectorAll('div');
    for (let i = allDivs.length - 1; i >= 0; i--) {
      const div = allDivs[i];
      const text = div.textContent || '';
      if (text.length > 200 && this.looksLikeResponse(text)) {
        return div as HTMLElement;
      }
    }

    return null;
  }

  /**
   * Check if text looks like a response
   */
  private looksLikeResponse(text: string): boolean {
    const responseIndicators = [
      /我最初以为/i,
      /让我们/i,
      /首先/i,
      /然后/i,
      /因此/i,
      /但是/i,
      /然而/i,
      /Q1/i,
      /Q2/i,
      /Q3/i,
      /Q4/i
    ];

    return responseIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Extract text content from response element
   */
  private extractResponseText(element: HTMLElement): string {
    // Try to get clean text, excluding UI elements
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove buttons, inputs, and other UI elements
    const uiSelectors = ['button', 'input', 'select', 'textarea', '.button', '[role="button"]'];
    uiSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    return clone.textContent || clone.innerText || '';
  }

  /**
   * Analyze response content for cognitive patterns
   */
  private analyzeResponseContent(
    responseText: string,
    promptText: string
  ): ResponseAnalysis {
    const lowerText = responseText.toLowerCase();
    const lowerPrompt = promptText.toLowerCase();

    // Parse structured response
    const structured = parseStructuredResponse(responseText);

    // Check for Q1-Q4 presence
    const q1Present = structured.q1.length > 0 || /Q1|认知盲区|blind spot/i.test(responseText);
    const q2Present = structured.q2.length > 0 || /Q2|试错|entropy/i.test(responseText);
    const q3Present = structured.q3.length > 0 || /Q3|回溯|backtrack/i.test(responseText);
    const q4Present = structured.q4.length > 0 || /Q4|交接|handover/i.test(responseText);

    // Check for backtracking
    const containsBacktracking = 
      /回溯|backtrack|回到|重新考虑|重新审视/i.test(responseText) ||
      structured.q3.length > 0;

    // Check for misstep
    const containsMisstep = 
      structured.first_misstep.length > 0 ||
      /我最初以为|我一开始|mistake|error|wrong/i.test(responseText);

    // Check for handover
    const containsHandover = 
      structured.handover_question.length > 0 ||
      /你觉得|你认为|你怎么看|what do you think/i.test(responseText);

    // Check for novice perspective
    const noviceIndicators = [
      /初学者|新手|novice|beginner/i,
      /简单来说|通俗地说|in simple terms/i,
      /就像|好比|like|similar to/i,
      /想象一下|imagine/i
    ];
    const followsNovicePerspective = noviceIndicators.some(pattern => pattern.test(responseText));

    // Count jargon (advanced terms)
    const jargonPatterns = [
      /\b(algorithm|algorithmic|complexity|optimization|paradigm|heuristic)\b/gi,
      /\b(微积分|导数|积分|微分方程)\b/g,
      /\b(量子|相对论|波函数)\b/g
    ];
    let jargonCount = 0;
    jargonPatterns.forEach(pattern => {
      const matches = responseText.match(pattern);
      if (matches) jargonCount += matches.length;
    });

    // Count visual anchors
    const visualPatterns = [
      /看|看到|观察|visual|see|observe|look/i,
      /图|图表|diagram|chart|graph/i,
      /形状|形状|shape|form/i
    ];
    const visualAnchors = visualPatterns.reduce((count, pattern) => {
      const matches = responseText.match(new RegExp(pattern, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);

    // Count first principles mentions
    const firstPrinciplesPatterns = [
      /第一性原理|first principle|fundamental|axiom|definition/i,
      /基础|根本|basic|foundation|core/i
    ];
    const firstPrinciplesMentions = firstPrinciplesPatterns.reduce((count, pattern) => {
      const matches = responseText.match(new RegExp(pattern, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);

    // Determine complexity level
    let complexityLevel: 'low' | 'medium' | 'high' = 'medium';
    if (jargonCount > 5 || responseText.length > 2000) {
      complexityLevel = 'high';
    } else if (jargonCount < 2 && responseText.length < 800) {
      complexityLevel = 'low';
    }

    return {
      followsNovicePerspective,
      containsBacktracking,
      containsMisstep,
      containsHandover,
      q1Present,
      q2Present,
      q3Present,
      q4Present,
      complexityLevel,
      jargonCount,
      visualAnchors,
      firstPrinciplesMentions
    };
  }

  /**
   * Generate profile updates based on analysis
   */
  private generateProfileUpdates(
    profile: UserCognitiveProfile,
    analysis: ResponseAnalysis,
    responseText: string
  ): FeedbackResult['profileUpdates'] {
    const knowledgeDebtAdjustments = new Map<string, number>();
    const weakPointUpdates = new Map<string, number>();

    // If response follows novice perspective, reduce debt
    if (analysis.followsNovicePerspective) {
      knowledgeDebtAdjustments.set('novice_perspective', -1);
    } else {
      knowledgeDebtAdjustments.set('novice_perspective', 1);
      weakPointUpdates.set('novice_perspective', 1);
    }

    // If backtracking is present, reduce debt
    if (analysis.containsBacktracking) {
      knowledgeDebtAdjustments.set('backtracking', -1);
    } else {
      knowledgeDebtAdjustments.set('backtracking', 0.5);
    }

    // If Q1-Q4 are present, reduce debt
    const qScore = [analysis.q1Present, analysis.q2Present, analysis.q3Present, analysis.q4Present]
      .filter(Boolean).length;
    if (qScore >= 3) {
      knowledgeDebtAdjustments.set('q1_q4_framework', -2);
    } else if (qScore < 2) {
      knowledgeDebtAdjustments.set('q1_q4_framework', 1);
      weakPointUpdates.set('q1_q4_framework', 1);
    }

    // If misstep is present, good
    if (analysis.containsMisstep) {
      knowledgeDebtAdjustments.set('misstep_recognition', -1);
    }

    // If handover is present, good
    if (analysis.containsHandover) {
      knowledgeDebtAdjustments.set('handover', -1);
    }

    // Adjust based on complexity
    if (analysis.complexityLevel === 'high' && analysis.jargonCount > 5) {
      knowledgeDebtAdjustments.set('jargon_usage', 1);
      weakPointUpdates.set('jargon_usage', 1);
    }

    // Determine heuristic preference
    let heuristicPreference: 'visual' | 'analytical' | 'analogical' | undefined;
    if (analysis.visualAnchors > 3) {
      heuristicPreference = 'visual';
    } else if (analysis.firstPrinciplesMentions > 2) {
      heuristicPreference = 'analytical';
    } else if (/类比|analogy|similar|like/i.test(responseText)) {
      heuristicPreference = 'analogical';
    }

    return {
      knowledgeDebtAdjustments,
      weakPointUpdates,
      heuristicPreference
    };
  }

  /**
   * Apply feedback to profile
   */
  async applyFeedback(
    profile: UserCognitiveProfile,
    feedback: FeedbackResult
  ): Promise<UserCognitiveProfile> {
    let updatedProfile = { ...profile };

    // Apply knowledge debt adjustments
    for (const [concept, delta] of feedback.profileUpdates.knowledgeDebtAdjustments) {
      updatedProfile = CognitiveProfileService.updateKnowledgeDebt(
        updatedProfile,
        concept,
        delta
      );
    }

    // Apply weak point updates
    for (const [topic, increment] of feedback.profileUpdates.weakPointUpdates) {
      updatedProfile = CognitiveProfileService.recordFailure(
        updatedProfile,
        topic,
        increment
      );
    }

    // Update heuristic preference if detected
    if (feedback.profileUpdates.heuristicPreference) {
      updatedProfile.preferredHeuristics = feedback.profileUpdates.heuristicPreference;
    }

    // Save updated profile
    await CognitiveProfileService.save(updatedProfile);

    return updatedProfile;
  }
}
