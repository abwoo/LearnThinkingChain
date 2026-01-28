export type TrendCounts = Record<string, number>;

export interface DebtBucket {
  total_prompts: number;
  hidden_constraint_failures: number;
}

export interface SessionRecord {
  id: string;
  topic: string;
  module: string;
  problem_type: string;
  started_at: number;
  last_event_at: number;
  total_prompts: number;
  hidden_constraint_failures: number;
}

export interface LearningDebt {
  hidden_constraint: number;
  by_topic: Record<string, DebtBucket>;
  by_module: Record<string, DebtBucket>;
  by_type: Record<string, DebtBucket>;
  sessions: SessionRecord[];
}

export interface CognitiveProfile {
  missed_points: string[];
  thinking_styles: string[];
  trial_error_history: string[];
  knowledge_gaps: string[];
  thinking_trend: string;
  meta_cognitive_level: number;
  hidden_constraint_failures: number;
  thinking_trend_counts: TrendCounts;
  learning_debt: LearningDebt;
  last_session_id: string;
  last_updated: number;
}
