import type { CognitiveProfile } from '../types/CognitiveProfile';
import type { ExtensionSettings } from '../types/Settings';
import type { SessionState } from '../types/Session';
import { classifyInput } from './Taxonomy';

export interface LearningDebtUpdate {
  profile: CognitiveProfile;
  session: SessionState;
}

export function updateLearningDebt(
  input: string,
  profile: CognitiveProfile,
  session: SessionState,
  settings: ExtensionSettings,
  now: number
): LearningDebtUpdate {
  const classification = classifyInput(input, settings);
  const nextSession = ensureSession(session, profile, classification, settings, now);
  const hitHidden = detectHiddenConstraint(input);

  profile.hidden_constraint_failures += hitHidden ? 1 : 0;
  profile.learning_debt.hidden_constraint = profile.hidden_constraint_failures;

  incrementBucket(profile.learning_debt.by_topic, classification.topic, hitHidden);
  incrementBucket(profile.learning_debt.by_module, classification.module, hitHidden);
  incrementBucket(profile.learning_debt.by_type, classification.problemType, hitHidden);
  incrementSession(profile, nextSession.id, hitHidden, now);

  return { profile, session: nextSession };
}

function ensureSession(
  session: SessionState,
  profile: CognitiveProfile,
  classification: { topic: string; module: string; problemType: string },
  settings: ExtensionSettings,
  now: number
): SessionState {
  const gapMs = Math.max(5, settings.session_gap_minutes) * 60 * 1000;
  const isNew =
    !session.id ||
    !session.last_event_at ||
    now - session.last_event_at > gapMs ||
    session.topic !== classification.topic;

  if (!isNew) {
    return { ...session, last_event_at: now };
  }

  const id = `S${now.toString(36)}`;
  const nextSession: SessionState = {
    id,
    topic: classification.topic,
    module: classification.module,
    problem_type: classification.problemType,
    started_at: now,
    last_event_at: now
  };

  profile.last_session_id = id;
  profile.learning_debt.sessions.unshift({
    id,
    topic: classification.topic,
    module: classification.module,
    problem_type: classification.problemType,
    started_at: now,
    last_event_at: now,
    total_prompts: 0,
    hidden_constraint_failures: 0
  });
  if (profile.learning_debt.sessions.length > 20) {
    profile.learning_debt.sessions = profile.learning_debt.sessions.slice(0, 20);
  }

  return nextSession;
}

function incrementBucket(
  buckets: Record<string, { total_prompts: number; hidden_constraint_failures: number }>,
  key: string,
  hitHidden: boolean
): void {
  if (!buckets[key]) {
    buckets[key] = { total_prompts: 0, hidden_constraint_failures: 0 };
  }
  buckets[key].total_prompts += 1;
  if (hitHidden) buckets[key].hidden_constraint_failures += 1;
}

function incrementSession(profile: CognitiveProfile, sessionId: string, hitHidden: boolean, now: number): void {
  const session = profile.learning_debt.sessions.find((item) => item.id === sessionId);
  if (!session) return;
  session.total_prompts += 1;
  session.last_event_at = now;
  if (hitHidden) session.hidden_constraint_failures += 1;
}

function detectHiddenConstraint(input: string): boolean {
  const patterns = [
    /隐藏条件/i,
    /约束/i,
    /边界条件/i,
    /条件不够/i,
    /哪里错/i,
    /不成立/i,
    /矛盾/i,
    /算不出/i,
    /不收敛/i,
    /失败/i
  ];
  return patterns.some((pattern) => pattern.test(input));
}
