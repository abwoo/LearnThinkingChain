/**
 * Cognitive Profile - 认知档案
 * 
 * Domain Model for user's cognitive state and learning patterns
 */

export type PreferredHeuristic = 'visual' | 'analytical' | 'analogical';

export interface SessionLog {
  timestamp: number;
  logicBridgeUsed: string;
  promptText: string;
  responseLength: number;
  skillsDetected: string[];
}

export interface UserCognitiveProfile {
  weakPoints: Map<string, number>; // Topic -> Frequency of failure
  preferredHeuristics: PreferredHeuristic;
  sessionLogs: SessionLog[];
  knowledgeDebt: Map<string, number>; // Concept -> Debt score
  lastUpdated: number;
  totalSessions: number;
  averageResponseTime: number;
}

export class CognitiveProfileService {
  private static readonly STORAGE_KEY = 'ltc_cognitive_profile';

  /**
   * Load cognitive profile from storage
   */
  static async load(): Promise<UserCognitiveProfile> {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEY);
      if (data[this.STORAGE_KEY]) {
        return this.deserialize(data[this.STORAGE_KEY]);
      }
    } catch (error) {
      console.error('Failed to load cognitive profile:', error);
    }
    return this.createDefault();
  }

  /**
   * Save cognitive profile to storage
   */
  static async save(profile: UserCognitiveProfile): Promise<void> {
    try {
      profile.lastUpdated = Date.now();
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: this.serialize(profile)
      });
    } catch (error) {
      console.error('Failed to save cognitive profile:', error);
      throw error;
    }
  }

  /**
   * Update weak points based on failure
   */
  static recordFailure(
    profile: UserCognitiveProfile,
    topic: string,
    severity: number = 1
  ): UserCognitiveProfile {
    const current = profile.weakPoints.get(topic) || 0;
    profile.weakPoints.set(topic, current + severity);
    return profile;
  }

  /**
   * Add session log
   */
  static addSessionLog(
    profile: UserCognitiveProfile,
    log: Omit<SessionLog, 'timestamp'>
  ): UserCognitiveProfile {
    profile.sessionLogs.push({
      ...log,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 logs
    if (profile.sessionLogs.length > 1000) {
      profile.sessionLogs = profile.sessionLogs.slice(-1000);
    }
    
    profile.totalSessions++;
    return profile;
  }

  /**
   * Update knowledge debt
   */
  static updateKnowledgeDebt(
    profile: UserCognitiveProfile,
    concept: string,
    debtDelta: number
  ): UserCognitiveProfile {
    const current = profile.knowledgeDebt.get(concept) || 0;
    profile.knowledgeDebt.set(concept, Math.max(0, current + debtDelta));
    return profile;
  }

  /**
   * Get top weak points (sorted by frequency)
   */
  static getTopWeakPoints(
    profile: UserCognitiveProfile,
    limit: number = 5
  ): Array<[string, number]> {
    return Array.from(profile.weakPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  /**
   * Get high debt concepts
   */
  static getHighDebtConcepts(
    profile: UserCognitiveProfile,
    threshold: number = 3
  ): string[] {
    return Array.from(profile.knowledgeDebt.entries())
      .filter(([_, debt]) => debt >= threshold)
      .map(([concept]) => concept);
  }

  private static createDefault(): UserCognitiveProfile {
    return {
      weakPoints: new Map(),
      preferredHeuristics: 'analytical',
      sessionLogs: [],
      knowledgeDebt: new Map(),
      lastUpdated: Date.now(),
      totalSessions: 0,
      averageResponseTime: 0
    };
  }

  private static serialize(profile: UserCognitiveProfile): any {
    return {
      weakPoints: Array.from(profile.weakPoints.entries()),
      preferredHeuristics: profile.preferredHeuristics,
      sessionLogs: profile.sessionLogs,
      knowledgeDebt: Array.from(profile.knowledgeDebt.entries()),
      lastUpdated: profile.lastUpdated,
      totalSessions: profile.totalSessions,
      averageResponseTime: profile.averageResponseTime
    };
  }

  private static deserialize(data: any): UserCognitiveProfile {
    return {
      weakPoints: new Map(data.weakPoints || []),
      preferredHeuristics: data.preferredHeuristics || 'analytical',
      sessionLogs: data.sessionLogs || [],
      knowledgeDebt: new Map(data.knowledgeDebt || []),
      lastUpdated: data.lastUpdated || Date.now(),
      totalSessions: data.totalSessions || 0,
      averageResponseTime: data.averageResponseTime || 0
    };
  }
}
