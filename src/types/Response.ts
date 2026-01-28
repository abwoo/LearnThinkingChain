export interface StructuredResponse {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  first_misstep: string;
  handover_question: string;
}

export interface ResponseRecord {
  text: string;
  structured: StructuredResponse;
  mode: string;
  timestamp: number;
  topic: string;
  module: string;
  problem_type: string;
}
