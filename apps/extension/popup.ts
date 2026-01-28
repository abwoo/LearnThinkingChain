type ProfileSnapshot = {
  knowledge_gaps?: string[];
  missed_points?: string[];
  thinking_styles?: string[];
};

type PopupState = {
  active: boolean;
  mode: string;
  knowledgeGaps: string[];
  thinkingStyles: string[];
};

const state: PopupState = {
  active: false,
  mode: 'novice',
  knowledgeGaps: [],
  thinkingStyles: []
};

const statusEl = document.getElementById('status-val');
const gapsEl = document.getElementById('gaps-val');
const stylesEl = document.getElementById('styles-val');
const openBtn = document.getElementById('open-dashboard');

function render(): void {
  if (statusEl) {
    statusEl.textContent = state.active ? `Active (${state.mode})` : 'Inactive';
    statusEl.className = `value ${state.active ? 'status-on' : 'status-off'}`;
  }
  if (gapsEl) {
    gapsEl.textContent = state.knowledgeGaps.length ? state.knowledgeGaps.join(', ') : 'Initial phase...';
  }
  if (stylesEl) {
    stylesEl.textContent = state.thinkingStyles.length ? state.thinkingStyles.join(', ') : 'Generic';
  }
}

function load(): void {
  chrome.storage.local.get(['ltc_active', 'ltc_mode', 'ltc_profile'], (result) => {
    state.active = Boolean(result.ltc_active);
    state.mode = typeof result.ltc_mode === 'string' ? result.ltc_mode : 'novice';
    const profile = (result.ltc_profile ?? {}) as ProfileSnapshot;
    state.knowledgeGaps = Array.isArray(profile.knowledge_gaps)
      ? profile.knowledge_gaps
      : Array.isArray(profile.missed_points)
        ? profile.missed_points
        : [];
    state.thinkingStyles = Array.isArray(profile.thinking_styles) ? profile.thinking_styles : [];
    render();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.ltc_active) state.active = Boolean(changes.ltc_active.newValue);
  if (changes.ltc_mode) state.mode = typeof changes.ltc_mode.newValue === 'string' ? changes.ltc_mode.newValue : 'novice';
  if (changes.ltc_profile) {
    const profile = (changes.ltc_profile.newValue ?? {}) as ProfileSnapshot;
    state.knowledgeGaps = Array.isArray(profile.knowledge_gaps)
      ? profile.knowledge_gaps
      : Array.isArray(profile.missed_points)
        ? profile.missed_points
        : [];
    state.thinkingStyles = Array.isArray(profile.thinking_styles) ? profile.thinking_styles : [];
  }
  render();
});

openBtn?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://abwoo.github.io/LearnThinkingChain/?force=refresh' });
});

load();
