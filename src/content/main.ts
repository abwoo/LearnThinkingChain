import type { CognitiveProfile } from '../types/CognitiveProfile';
import type { ProtocolMap } from '../types/Protocols';
import type { ExtensionSettings } from '../types/Settings';
import type { SessionState } from '../types/Session';
import type { ResponseRecord } from '../types/Response';
import { InputInterceptor } from './InputInterceptor';
import { buildPrompt, updateLearningDebt, parseStructuredResponse } from '../core/Index';
import { defaultLogger } from '../utils/logger';

const logger = defaultLogger;

const DEFAULT_PROTOCOLS: ProtocolMap = {
  novice: {
    name: 'Novice Backtracker',
    identity: 'Peer Learner',
    focus: 'Explain like a peer who is still learning, never like a final authority.',
    q1_blind_spot: "Simulate a beginner's perspective. Point out the most tempting surface cue and why it can mislead a novice.",
    q2_entropy: 'Follow the naive intuition for 2-3 steps, then show exactly where the logic hits a wall.',
    q3_backtrack: 'Backtrack to the first overlooked foundation (definition, constraint, or boundary condition).',
    q4_handover: 'Offer a directional hint and ask a concrete, open-ended question that hands control back to the user.'
  },
  socratic: {
    name: 'Socratic Guide',
    identity: 'Socratic Mentor',
    focus: 'Use probing questions to help the learner discover the flaw themselves.',
    q1_blind_spot: "Identify the most likely misconception and restate it as a question.",
    q2_entropy: 'Let the misconception unfold with a guided question, then surface the inconsistency.',
    q3_backtrack: 'Expose the flaw with a counter-example or edge case, then return to the core principle.',
    q4_handover: 'Ask for reconstruction: request the user to rebuild the argument step-by-step.'
  },
  first_principles: {
    name: 'First Principles',
    identity: 'First Principles Analyst',
    focus: 'Reduce the problem to atomic truths and rebuild the chain without shortcuts.',
    q1_blind_spot: 'Strip away analogies and identify the missing constraint or hidden variable.',
    q2_entropy: 'Attempt a shallow solution and show why it fails against the constraints.',
    q3_backtrack: 'Decompose into axioms, definitions, and boundary conditions, then isolate the pivot.',
    q4_handover: 'Provide the reconstruction path but stop before the final computation.'
  },
  analogy: {
    name: 'Analogy Weaver',
    identity: 'Analogical Master',
    focus: 'Use analogies to reveal structure, then map back to the original problem.',
    q1_blind_spot: 'Ignore equations and describe the system behavior a beginner would observe.',
    q2_entropy: 'Offer a weak analogy, then show why it breaks.',
    q3_backtrack: 'Replace it with a stronger isomorphic analogy and clarify the mapping.',
    q4_handover: 'Ask the user to map one element of the analogy back to the real variables.'
  }
};

const DEFAULT_SETTINGS: ExtensionSettings = {
  session_gap_minutes: 30,
  taxonomy: {
    topics: [],
    modules: [],
    types: []
  }
};

const DEFAULT_PROFILE: CognitiveProfile = {
  missed_points: [],
  thinking_styles: [],
  trial_error_history: [],
  knowledge_gaps: [],
  thinking_trend: '',
  meta_cognitive_level: 1,
  hidden_constraint_failures: 0,
  thinking_trend_counts: {},
  learning_debt: {
    hidden_constraint: 0,
    by_topic: {},
    by_module: {},
    by_type: {},
    sessions: []
  },
  last_session_id: '',
  last_updated: Date.now()
};

const DEFAULT_SESSION: SessionState = {
  id: '',
  topic: 'general',
  module: 'general',
  problem_type: 'general',
  started_at: 0,
  last_event_at: 0
};

let isActive = false;
let currentMode = 'novice';
let profile: CognitiveProfile = { ...DEFAULT_PROFILE };
let settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
let protocols: ProtocolMap = { ...DEFAULT_PROTOCOLS };
let session: SessionState = { ...DEFAULT_SESSION };
let lastWrappedInput = '';
let lastWrappedAt = 0;

const interceptor = new InputInterceptor({
  selectors: [
    'div[contenteditable="true"][data-lexical-editor="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
    '.input-area div[contenteditable="true"]',
    '#rich-text-input',
    'textarea[aria-label*="message"]',
    'textarea[aria-label*="消息"]',
    'textarea'
  ],
  onSubmit: (value, el) => {
    if (!isActive) return;
    if (value.startsWith('<<<LTC_START>>>')) return;
    const now = Date.now();
    if (value === lastWrappedInput && now - lastWrappedAt < 1200) return;
    const update = updateLearningDebt(value, profile, session, settings, now);
    profile = update.profile;
    session = update.session;
    profile.last_updated = now;
    chrome.storage.local.set({ ltc_profile: profile, ltc_session: session });

    const mode = protocols[currentMode] ?? protocols.novice;
    const wrapped = buildPrompt(value, mode, profile);
    interceptor.setValue(wrapped);
    lastWrappedInput = value;
    lastWrappedAt = now;

    chrome.storage.local.set({
      ltc_last_thinking_steps: [
        { title: 'Q1: 盲区扫描', desc: `模拟 ${mode.identity} 视角过滤噪声` },
        { title: 'Q2: 试错模拟', desc: '执行直觉偏差测试 (Entropy Path)' },
        { title: 'Q3: 深度回溯', desc: '触发第一性原理 (First Principle) 纠偏' },
        { title: 'Q4: 认知交接', desc: '生成开放式引导追问' }
      ]
    });
  }
});

function normalizeProtocols(input: ProtocolMap | undefined): ProtocolMap {
  if (!input) return { ...DEFAULT_PROTOCOLS };
  return { ...DEFAULT_PROTOCOLS, ...input };
}

function normalizeSettings(input?: ExtensionSettings): ExtensionSettings {
  return {
    session_gap_minutes: input?.session_gap_minutes ?? DEFAULT_SETTINGS.session_gap_minutes,
    taxonomy: input?.taxonomy ?? DEFAULT_SETTINGS.taxonomy
  };
}

function normalizeProfile(input?: CognitiveProfile): CognitiveProfile {
  return { ...DEFAULT_PROFILE, ...(input ?? {}) };
}

function normalizeSession(input?: SessionState): SessionState {
  return { ...DEFAULT_SESSION, ...(input ?? {}) };
}

function loadInitialState(): void {
  chrome.storage.local.get(
    ['ltc_active', 'ltc_profile', 'ltc_mode', 'ltc_protocols', 'ltc_session', 'ltc_settings'],
    (data) => {
      isActive = data.ltc_active ?? false;
      currentMode = data.ltc_mode ?? 'novice';
      profile = normalizeProfile(data.ltc_profile);
      session = normalizeSession(data.ltc_session);
      settings = normalizeSettings(data.ltc_settings);
      protocols = normalizeProtocols(data.ltc_protocols);
      if (!data.ltc_protocols) {
        chrome.storage.local.set({ ltc_protocols: DEFAULT_PROTOCOLS });
      }
      interceptor.start();
      startResponseObserver();
    }
  );
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.ltc_active) isActive = changes.ltc_active.newValue;
  if (changes.ltc_mode) currentMode = changes.ltc_mode.newValue;
  if (changes.ltc_profile) profile = normalizeProfile(changes.ltc_profile.newValue);
  if (changes.ltc_settings) settings = normalizeSettings(changes.ltc_settings.newValue);
  if (changes.ltc_protocols) protocols = normalizeProtocols(changes.ltc_protocols.newValue);
  if (changes.ltc_session) session = normalizeSession(changes.ltc_session.newValue);
});

function startResponseObserver(): void {
  const observer = new MutationObserver(() => {
    if (!isActive) return;
    scheduleCapture();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleCapture();
}

let captureTimer: number | null = null;

function scheduleCapture(): void {
  if (captureTimer) window.clearTimeout(captureTimer);
  captureTimer = window.setTimeout(() => captureLatestResponse(), 600);
}

function captureLatestResponse(): void {
  const text = findLatestResponseText();
  if (!text || text.length < 10) return;
  const now = Date.now();
  const structured = parseStructuredResponse(text);
  const record: ResponseRecord = {
    text,
    structured,
    mode: currentMode,
    timestamp: now,
    topic: session.topic,
    module: session.module,
    problem_type: session.problem_type
  };
  chrome.storage.local.get(['ltc_response_history'], (result) => {
    const history = Array.isArray(result.ltc_response_history) ? result.ltc_response_history : [];
    const next = [record, ...history].slice(0, 12);
    chrome.storage.local.set({ ltc_latest_response: record, ltc_response_history: next });
  });
}

function findLatestResponseText(): string {
  const selectors = [
    'div.markdown',
    '.markdown',
    '[data-testid="model-response"]',
    '[data-response]',
    '.model-response',
    '.response',
    'article',
    'main div[role="article"]'
  ];
  const candidates: Element[] = [];
  selectors.forEach((selector) => candidates.push(...Array.from(document.querySelectorAll(selector))));
  const texts = candidates
    .map((el) => (el.textContent ?? '').trim())
    .filter((item) => item.length > 0);
  return texts.at(-1) ?? '';
}

logger.info('Content script initialized');
loadInitialState();
