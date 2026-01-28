/**
 * Thought Trend Visualizer - 思考趋势可视化服务
 * 
 * Prepares data for visualizing "Thinking Evolution"
 * (Knowledge Gaps vs. Critical Thinking Gains)
 */

import { CognitiveProfileService, UserCognitiveProfile, SessionLog } from './CognitiveProfile';
import { defaultLogger, Logger } from '../../utils/logger';

export interface TrendDataPoint {
  timestamp: number;
  knowledgeDebtScore: number;
  criticalThinkingScore: number;
  weakPointCount: number;
  sessionCount: number;
  averageResponseTime: number;
}

export interface TrendAnalysis {
  dataPoints: TrendDataPoint[];
  overallTrend: 'improving' | 'declining' | 'stable';
  knowledgeDebtTrend: 'decreasing' | 'increasing' | 'stable';
  criticalThinkingTrend: 'improving' | 'declining' | 'stable';
  insights: string[];
  recommendations: string[];
}

export interface KnowledgeGapAnalysis {
  gaps: Array<{
    concept: string;
    debtScore: number;
    frequency: number;
    trend: 'improving' | 'worsening' | 'stable';
  }>;
  totalGaps: number;
  averageDebt: number;
}

export interface CriticalThinkingGains {
  backtrackingUsage: number;
  firstPrinciplesUsage: number;
  misstepRecognition: number;
  handoverQuestions: number;
  overallScore: number;
}

export class ThoughtTrendVisualizer {
  private readonly logger: Logger;
  private readonly timeWindowDays: number;

  constructor(logger?: Logger, timeWindowDays: number = 30) {
    this.logger = logger ?? defaultLogger;
    this.timeWindowDays = timeWindowDays;
  }

  /**
   * Generate trend analysis from profile
   */
  async generateTrendAnalysis(
    profile: UserCognitiveProfile
  ): Promise<TrendAnalysis> {
    try {
      // Generate data points from session logs
      const dataPoints = this.generateDataPoints(profile);

      // Analyze trends
      const overallTrend = this.analyzeOverallTrend(dataPoints);
      const knowledgeDebtTrend = this.analyzeKnowledgeDebtTrend(dataPoints);
      const criticalThinkingTrend = this.analyzeCriticalThinkingTrend(dataPoints);

      // Generate insights
      const insights = this.generateInsights(profile, dataPoints);
      const recommendations = this.generateRecommendations(profile, dataPoints, overallTrend);

      return {
        dataPoints,
        overallTrend,
        knowledgeDebtTrend,
        criticalThinkingTrend,
        insights,
        recommendations
      };
    } catch (error) {
      this.logger.error('ThoughtTrendVisualizer: Error generating trend analysis', error);
      throw error;
    }
  }

  /**
   * Generate data points from session logs
   */
  private generateDataPoints(profile: UserCognitiveProfile): TrendDataPoint[] {
    const points: TrendDataPoint[] = [];
    const now = Date.now();
    const windowStart = now - (this.timeWindowDays * 24 * 60 * 60 * 1000);

    // Group logs by day
    const logsByDay = new Map<number, SessionLog[]>();
    
    profile.sessionLogs
      .filter(log => log.timestamp >= windowStart)
      .forEach(log => {
        const day = Math.floor(log.timestamp / (24 * 60 * 60 * 1000));
        if (!logsByDay.has(day)) {
          logsByDay.set(day, []);
        }
        logsByDay.get(day)!.push(log);
      });

    // Generate data point for each day
    for (const [day, logs] of logsByDay.entries()) {
      const timestamp = day * 24 * 60 * 60 * 1000;
      
      // Calculate knowledge debt score (sum of all debt)
      const knowledgeDebtScore = Array.from(profile.knowledgeDebt.values())
        .reduce((sum, debt) => sum + debt, 0);

      // Calculate critical thinking score
      const criticalThinkingScore = this.calculateCriticalThinkingScore(logs);

      // Count weak points
      const weakPointCount = profile.weakPoints.size;

      // Calculate average response time
      const responseTimes = logs
        .map(log => log.responseLength)
        .filter(time => time > 0);
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      points.push({
        timestamp,
        knowledgeDebtScore,
        criticalThinkingScore,
        weakPointCount,
        sessionCount: logs.length,
        averageResponseTime
      });
    }

    // Sort by timestamp
    points.sort((a, b) => a.timestamp - b.timestamp);

    return points;
  }

  /**
   * Calculate critical thinking score from logs
   */
  private calculateCriticalThinkingScore(logs: SessionLog[]): number {
    if (logs.length === 0) return 0;

    let score = 0;

    logs.forEach(log => {
      // Check for backtracking usage
      if (log.logicBridgeUsed.includes('backtrack') || 
          log.logicBridgeUsed.includes('回溯')) {
        score += 2;
      }

      // Check for first principles
      if (log.logicBridgeUsed.includes('first principle') ||
          log.logicBridgeUsed.includes('第一性原理')) {
        score += 3;
      }

      // Check for misstep recognition
      if (log.promptText.includes('我最初以为') ||
          log.promptText.includes('mistake')) {
        score += 1;
      }

      // Check for handover questions
      if (log.promptText.includes('？') || log.promptText.includes('?')) {
        score += 1;
      }
    });

    return Math.min(100, score); // Cap at 100
  }

  /**
   * Analyze overall trend
   */
  private analyzeOverallTrend(
    dataPoints: TrendDataPoint[]
  ): 'improving' | 'declining' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    const recent = dataPoints.slice(-7); // Last week
    const older = dataPoints.slice(0, Math.max(0, dataPoints.length - 7));

    if (older.length === 0) return 'stable';

    const recentAvg = this.averageScore(recent);
    const olderAvg = this.averageScore(older);

    const diff = recentAvg - olderAvg;
    const threshold = 5;

    if (diff > threshold) return 'improving';
    if (diff < -threshold) return 'declining';
    return 'stable';
  }

  /**
   * Analyze knowledge debt trend
   */
  private analyzeKnowledgeDebtTrend(
    dataPoints: TrendDataPoint[]
  ): 'decreasing' | 'increasing' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    const recent = dataPoints.slice(-7);
    const older = dataPoints.slice(0, Math.max(0, dataPoints.length - 7));

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, p) => sum + p.knowledgeDebtScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.knowledgeDebtScore, 0) / older.length;

    const diff = recentAvg - olderAvg;
    const threshold = 2;

    if (diff < -threshold) return 'decreasing';
    if (diff > threshold) return 'increasing';
    return 'stable';
  }

  /**
   * Analyze critical thinking trend
   */
  private analyzeCriticalThinkingTrend(
    dataPoints: TrendDataPoint[]
  ): 'improving' | 'declining' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    const recent = dataPoints.slice(-7);
    const older = dataPoints.slice(0, Math.max(0, dataPoints.length - 7));

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, p) => sum + p.criticalThinkingScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.criticalThinkingScore, 0) / older.length;

    const diff = recentAvg - olderAvg;
    const threshold = 3;

    if (diff > threshold) return 'improving';
    if (diff < -threshold) return 'declining';
    return 'stable';
  }

  /**
   * Calculate average score
   */
  private averageScore(points: TrendDataPoint[]): number {
    if (points.length === 0) return 0;
    const total = points.reduce((sum, p) => 
      sum + p.criticalThinkingScore - (p.knowledgeDebtScore * 0.1), 0
    );
    return total / points.length;
  }

  /**
   * Generate insights
   */
  private generateInsights(
    profile: UserCognitiveProfile,
    dataPoints: TrendDataPoint[]
  ): string[] {
    const insights: string[] = [];

    // Knowledge debt insights
    const highDebtConcepts = Array.from(profile.knowledgeDebt.entries())
      .filter(([_, debt]) => debt >= 5)
      .map(([concept]) => concept);

    if (highDebtConcepts.length > 0) {
      insights.push(
        `High knowledge debt detected in: ${highDebtConcepts.slice(0, 3).join(', ')}`
      );
    }

    // Weak point insights
    const topWeakPoints = Array.from(profile.weakPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    if (topWeakPoints.length > 0) {
      insights.push(
        `Most frequent weak points: ${topWeakPoints.join(', ')}`
      );
    }

    // Session frequency insights
    if (dataPoints.length > 0) {
      const recentSessions = dataPoints.slice(-7)
        .reduce((sum, p) => sum + p.sessionCount, 0);
      insights.push(
        `Recent activity: ${recentSessions} sessions in the last week`
      );
    }

    // Critical thinking insights
    if (dataPoints.length >= 2) {
      const recent = dataPoints[dataPoints.length - 1];
      const older = dataPoints[0];
      const improvement = recent.criticalThinkingScore - older.criticalThinkingScore;
      
      if (improvement > 10) {
        insights.push('Significant improvement in critical thinking skills');
      } else if (improvement < -10) {
        insights.push('Critical thinking skills need attention');
      }
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    profile: UserCognitiveProfile,
    dataPoints: TrendDataPoint[],
    overallTrend: 'improving' | 'declining' | 'stable'
  ): string[] {
    const recommendations: string[] = [];

    // Trend-based recommendations
    if (overallTrend === 'declining') {
      recommendations.push('Focus on foundational concepts to rebuild understanding');
      recommendations.push('Increase session frequency to maintain learning momentum');
    } else if (overallTrend === 'stable') {
      recommendations.push('Try exploring new problem types to challenge yourself');
      recommendations.push('Experiment with different cognitive protocols');
    }

    // Knowledge debt recommendations
    const highDebtConcepts = Array.from(profile.knowledgeDebt.entries())
      .filter(([_, debt]) => debt >= 5)
      .map(([concept]) => concept);

    if (highDebtConcepts.length > 0) {
      recommendations.push(
        `Address knowledge gaps in: ${highDebtConcepts.slice(0, 2).join(', ')}`
      );
    }

    // Heuristic recommendations
    if (profile.preferredHeuristics === 'analytical') {
      recommendations.push('Try using visual analogies to enhance understanding');
    } else if (profile.preferredHeuristics === 'visual') {
      recommendations.push('Practice breaking down problems into logical steps');
    }

    return recommendations;
  }

  /**
   * Analyze knowledge gaps
   */
  analyzeKnowledgeGaps(profile: UserCognitiveProfile): KnowledgeGapAnalysis {
    const gaps = Array.from(profile.knowledgeDebt.entries())
      .map(([concept, debtScore]) => {
        const frequency = profile.weakPoints.get(concept) || 0;
        
        // Determine trend (simplified - would need historical data for accurate trend)
        let trend: 'improving' | 'worsening' | 'stable' = 'stable';
        if (debtScore > 5) trend = 'worsening';
        else if (debtScore < 2) trend = 'improving';

        return {
          concept,
          debtScore,
          frequency,
          trend
        };
      })
      .sort((a, b) => b.debtScore - a.debtScore);

    const totalGaps = gaps.length;
    const averageDebt = gaps.length > 0
      ? gaps.reduce((sum, gap) => sum + gap.debtScore, 0) / gaps.length
      : 0;

    return {
      gaps,
      totalGaps,
      averageDebt
    };
  }

  /**
   * Calculate critical thinking gains
   */
  calculateCriticalThinkingGains(
    profile: UserCognitiveProfile
  ): CriticalThinkingGains {
    const recentLogs = profile.sessionLogs.slice(-50); // Last 50 sessions

    let backtrackingUsage = 0;
    let firstPrinciplesUsage = 0;
    let misstepRecognition = 0;
    let handoverQuestions = 0;

    recentLogs.forEach(log => {
      if (log.logicBridgeUsed.includes('backtrack') ||
          log.logicBridgeUsed.includes('回溯')) {
        backtrackingUsage++;
      }

      if (log.logicBridgeUsed.includes('first principle') ||
          log.logicBridgeUsed.includes('第一性原理')) {
        firstPrinciplesUsage++;
      }

      if (log.promptText.includes('我最初以为') ||
          log.promptText.includes('mistake')) {
        misstepRecognition++;
      }

      if (log.promptText.includes('？') || log.promptText.includes('?')) {
        handoverQuestions++;
      }
    });

    // Calculate overall score (0-100)
    const totalSessions = recentLogs.length || 1;
    const overallScore = Math.min(100, Math.round(
      (backtrackingUsage * 20 +
       firstPrinciplesUsage * 30 +
       misstepRecognition * 15 +
       handoverQuestions * 15) / totalSessions
    ));

    return {
      backtrackingUsage,
      firstPrinciplesUsage,
      misstepRecognition,
      handoverQuestions,
      overallScore
    };
  }
}
