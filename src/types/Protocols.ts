export interface CognitiveProtocol {
  name: string;
  identity: string;
  focus: string;
  q1_blind_spot: string;
  q2_entropy: string;
  q3_backtrack: string;
  q4_handover: string;
}

export type ProtocolMap = Record<string, CognitiveProtocol>;
