import type { StructuredResponse } from '../types/Response';

export function parseStructuredResponse(text: string): StructuredResponse {
  const result: StructuredResponse = {
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    first_misstep: '',
    handover_question: ''
  };
  if (!text) return result;
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (/^Q1[:：]?/i.test(line)) result.q1 = line.replace(/^Q1[:：]?\s*/i, '').trim();
    if (/^Q2[:：]?/i.test(line)) result.q2 = line.replace(/^Q2[:：]?\s*/i, '').trim();
    if (/^Q3[:：]?/i.test(line)) result.q3 = line.replace(/^Q3[:：]?\s*/i, '').trim();
    if (/^Q4[:：]?/i.test(line)) result.q4 = line.replace(/^Q4[:：]?\s*/i, '').trim();
    if (line.startsWith('我最初以为')) result.first_misstep = line;
  }
  const lastQuestion = lines.slice().reverse().find((line) => line.endsWith('？') || line.endsWith('?'));
  result.handover_question = lastQuestion ?? '';
  return result;
}
