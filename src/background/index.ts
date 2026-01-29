import type { MessagePayload, MessageResponse } from '../messaging/Types';
import type { ResponseRecord } from '../types/Response';
import { HistoryService } from '../core/services/HistoryService';
import { FrameworkService } from '../core/services/FrameworkService';

function handleMessage(
  request: MessagePayload,
  sendResponse: (response: MessageResponse) => void
): boolean {
  try {
    if (request.type === 'GET_STATE') {
      chrome.storage.local.get(null, (allData) => {
        sendResponse(allData as MessageResponse);
      });
      return true;
    }

    if (request.type === 'SAVE_PROFILE' && request.profile) {
      chrome.storage.local.set({ ltc_profile: request.profile }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'SAVE_MODE' && request.mode) {
      chrome.storage.local.set({ ltc_mode: request.mode }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'SAVE_PROTOCOLS' && request.protocols) {
      chrome.storage.local.set({ ltc_protocols: request.protocols }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'SAVE_SETTINGS' && request.settings) {
      chrome.storage.local.set({ ltc_settings: request.settings }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'HISTORY_APPEND' && request.historyEntry) {
      HistoryService.appendEntry(request.historyEntry).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'HISTORY_DELETE' && request.historyId) {
      HistoryService.deleteEntry(request.historyId).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'HISTORY_SET' && request.history) {
      HistoryService.setHistory(request.history).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'HISTORY_CLEAR') {
      HistoryService.clearHistory().then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'FRAMEWORK_ADD' && request.frameworkName) {
      FrameworkService.add(request.frameworkName).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'FRAMEWORK_DELETE' && request.frameworkId) {
      FrameworkService.remove(request.frameworkId).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'FRAMEWORK_SET' && request.frameworks) {
      FrameworkService.setAll(request.frameworks).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.type === 'WIPE_MEMORY') {
      chrome.storage.local.set(
        {
          ltc_profile: {
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
          }
        },
        () => {
          sendResponse({ success: true });
        }
      );
      return true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendResponse({ error: message });
  }
  return true;
}

chrome.runtime.onMessageExternal.addListener(
  (request: MessagePayload, _sender, sendResponse: (response: MessageResponse) => void) => {
    return handleMessage(request, sendResponse);
  }
);

chrome.runtime.onMessage.addListener(
  (request: MessagePayload, _sender, sendResponse: (response: MessageResponse) => void) => {
    return handleMessage(request, sendResponse);
  }
);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  const payload: {
    ltc_active?: boolean;
    ltc_mode?: string;
    ltc_latest_response?: ResponseRecord;
    ltc_last_thinking_steps?: Array<{ title: string; desc: string }>;
    ltc_frameworks?: Array<{ id: string; name: string; created_at: number }>;
  } = {};
  if (changes.ltc_active) payload.ltc_active = Boolean(changes.ltc_active.newValue);
  if (changes.ltc_mode) {
    const mode = changes.ltc_mode.newValue;
    payload.ltc_mode = typeof mode === 'string' ? mode : undefined;
  }
  if (changes.ltc_latest_response) {
    payload.ltc_latest_response = changes.ltc_latest_response.newValue as ResponseRecord | undefined;
  }
  if (changes.ltc_last_thinking_steps) {
    payload.ltc_last_thinking_steps = Array.isArray(changes.ltc_last_thinking_steps.newValue)
      ? changes.ltc_last_thinking_steps.newValue
      : [];
  }
  if (changes.ltc_frameworks) {
    payload.ltc_frameworks = Array.isArray(changes.ltc_frameworks.newValue)
      ? changes.ltc_frameworks.newValue
      : [];
  }
  if (Object.keys(payload).length === 0) return;

  chrome.runtime.sendMessage({ type: 'STATE_PUSH', payload });
});
