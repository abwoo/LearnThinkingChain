export interface SessionState {
  id: string;
  topic: string;
  module: string;
  problem_type: string;
  started_at: number;
  last_event_at: number;
}
