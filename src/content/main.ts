import type { CognitiveProfile } from '../types/CognitiveProfile';
import type { ProtocolMap } from '../types/Protocols';
import type { ExtensionSettings } from '../types/Settings';
import type { SessionState } from '../types/Session';
import type { ResponseRecord } from '../types/Response';
import '../app/styles.css';
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
let inputElement: HTMLElement | HTMLInputElement | HTMLTextAreaElement | null = null;

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
  onReady: (el) => {
    inputElement = el;
    toggleInputGlow();
  },
  onSubmit: (value, el) => {
    if (!isActive) return;
    if (value.startsWith('<<<LTC_START>>>')) return;
    const now = Date.now();
    if (value === lastWrappedInput && now - lastWrappedAt < 1200) return;
    addToHistory(value);
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
      injectFloatingHub();
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
  if (changes.ltc_active) {
    const checkbox = document.getElementById('ltc-toggle-checkbox') as HTMLInputElement | null;
    if (checkbox) checkbox.checked = isActive;
    toggleInputGlow();
  }
  if (changes.ltc_mode) {
    rebuildModeSelect();
    updateFrameworkPreview();
  }
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

function injectFloatingHub(): void {
  if (document.getElementById('ltc-hub')) return;
  const hub = document.createElement('div');
  hub.id = 'ltc-hub';
  hub.className = 'ltc-floating-hub';
  hub.innerHTML = `
    <div class="ltc-hub-header" id="ltc-header">
      <div class="ltc-brand">
        <span style="color:var(--accent-blue); font-size:14px;">⚡</span> THINKING CHAIN
      </div>
      <div class="ltc-drag-indicator"></div>
    </div>
    <div class="ltc-controls-row">
      <div class="ltc-toggle-group">
        <label class="ltc-switch">
          <input type="checkbox" id="ltc-toggle-checkbox" ${isActive ? 'checked' : ''}>
          <span class="ltc-slider"></span>
        </label>
        <select id="ltc-mode-select" class="ltc-mode-select" style="margin-left:12px; flex:1;"></select>
      </div>
    </div>
    <button class="ltc-expand-btn" id="ltc-expand-btn">▼ Open Cognitive Panel</button>
    <div class="ltc-info-panel" id="ltc-info-panel">
      <div class="ltc-panel-content">
        <div class="ltc-panel-row-header">
          <div class="ltc-section-title">ACTIVE PROTOCOL (Q1-Q4)</div>
        </div>
        <div class="ltc-framework-box" id="ltc-framework-text">Loading...</div>
        <div class="ltc-panel-row-header">
          <div class="ltc-section-title">THINKING PATH MAP</div>
        </div>
        <div class="ltc-path-map">
          <span>Start</span><span class="ltc-path-arrow">→</span>
          <span>Wrong Turn</span><span class="ltc-path-arrow">→</span>
          <span>Insight</span><span class="ltc-path-arrow">→</span>
          <span>Target</span>
        </div>
        <div class="ltc-panel-row-header">
          <div class="ltc-section-title">SESSION HISTORY</div>
          <button id="ltc-clear-history" class="ltc-mini-btn" title="Clear History">🗑️</button>
        </div>
        <div class="ltc-history-list" id="ltc-history-list"></div>
      </div>
    </div>
  `;
  document.body.appendChild(hub);
  setupDraggable(hub, hub.querySelector('#ltc-header') as HTMLElement);
  bindControls(hub);
  rebuildModeSelect();
  updateFrameworkPreview();
  loadHistory();
}

function bindControls(hub: HTMLElement): void {
  const toggle = hub.querySelector('#ltc-toggle-checkbox') as HTMLInputElement | null;
  const modeSelect = hub.querySelector('#ltc-mode-select') as HTMLSelectElement | null;
  const expandBtn = hub.querySelector('#ltc-expand-btn') as HTMLButtonElement | null;
  const clearBtn = hub.querySelector('#ltc-clear-history') as HTMLButtonElement | null;

  toggle?.addEventListener('change', (event) => {
    const checked = (event.target as HTMLInputElement).checked;
    isActive = checked;
    chrome.storage.local.set({ ltc_active: isActive });
    toggleInputGlow();
  });

  modeSelect?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;
    currentMode = value;
    chrome.storage.local.set({ ltc_mode: currentMode });
    updateFrameworkPreview();
  });

  expandBtn?.addEventListener('click', () => {
    hub.classList.toggle('expanded');
    expandBtn.innerText = hub.classList.contains('expanded') ? '▲ Close Panel' : '▼ Open Cognitive Panel';
  });

  clearBtn?.addEventListener('click', () => {
    if (!confirm('Clear local session history?')) return;
    chrome.storage.local.set({ ltc_prompt_history: [] });
    loadHistory();
  });
}

function rebuildModeSelect(): void {
  const select = document.getElementById('ltc-mode-select') as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = '';
  Object.keys(protocols).forEach((key) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = protocols[key].name || key;
    option.selected = currentMode === key;
    select.appendChild(option);
  });
  if (!protocols[currentMode]) {
    currentMode = Object.keys(protocols)[0] ?? 'novice';
    chrome.storage.local.set({ ltc_mode: currentMode });
    select.value = currentMode;
  }
}

function updateFrameworkPreview(): void {
  const el = document.getElementById('ltc-framework-text');
  if (!el) return;
  const mode = protocols[currentMode] ?? protocols.novice;
  const compact = (text: string, max = 64) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
  };
  el.innerHTML = `
    <span style="color:#ff6b6b">Q1: ${compact(mode.q1_blind_spot)}</span><br>
    <span style="color:#feca57">Q2: ${compact(mode.q2_entropy)}</span><br>
    <span style="color:#48dbfb">Q3: ${compact(mode.q3_backtrack)}</span><br>
    <span style="color:#1dd1a1">Q4: ${compact(mode.q4_handover)}</span>
  `;
}

function loadHistory(): void {
  chrome.storage.local.get(['ltc_prompt_history'], (result) => {
    const history = Array.isArray(result.ltc_prompt_history) ? result.ltc_prompt_history : [];
    const list = document.getElementById('ltc-history-list');
    if (!list) return;
    list.innerHTML = '';
    if (history.length === 0) {
      list.innerHTML =
        '<div style="padding:10px; color:rgba(255,255,255,0.3); font-size:11px; text-align:center;">No active thoughts</div>';
      return;
    }
    history.forEach((text: string) => {
      const compact = text.replace(/\s+/g, ' ').trim();
      const shortText = compact.length > 42 ? `${compact.slice(0, 41)}…` : compact;
      const item = document.createElement('div');
      item.className = 'ltc-history-item';
      item.innerHTML = `<span class="ltc-history-text">${shortText}</span>`;
      item.title = compact;
      item.addEventListener('click', () => interceptor.setValue(text));
      list.appendChild(item);
    });
  });
}

function addToHistory(text: string): void {
  if (!text) return;
  chrome.storage.local.get(['ltc_prompt_history'], (result) => {
    let history = Array.isArray(result.ltc_prompt_history) ? result.ltc_prompt_history : [];
    if (history[0] !== text) {
      history.unshift(text);
      if (history.length > 6) history = history.slice(0, 6);
      chrome.storage.local.set({ ltc_prompt_history: history });
      loadHistory();
    }
  });
}

function toggleInputGlow(): void {
  if (!inputElement) return;
  inputElement.classList.toggle('ltc-thinking-active', isActive);
}

function setupDraggable(element: HTMLElement, handle: HTMLElement): void {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handle.addEventListener('mousedown', (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    const rect = element.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    element.style.right = 'auto';
    element.style.left = `${initialLeft}px`;
    element.style.top = `${initialTop}px`;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    element.style.left = `${initialLeft + dx}px`;
    element.style.top = `${initialTop + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    document.body.style.userSelect = '';
  });
}
