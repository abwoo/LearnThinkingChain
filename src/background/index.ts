import type { MessagePayload, MessageResponse } from '../messaging/Types';
import type { ResponseRecord } from '../types/Response';
import { HistoryService } from '../core/services/HistoryService';
import { FrameworkStore } from '../core/storage/FrameworkStore';

function handleMessage(
  request: MessagePayload,
  sendResponse: (response: MessageResponse) => void
): boolean {
  try {
    if (request.type === 'GET_STATE') {
      FrameworkStore.getFrameworks()
        .then(() => {
          chrome.storage.local.get(null, (allData) => {
            sendResponse(allData as MessageResponse);
          });
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
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

    if (request.type === 'ADD_HISTORY_ENTRY' && request.historyEntry) {
      HistoryService.addEntry(request.historyEntry)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
        });
      return true;
    }

    if (request.type === 'SET_HISTORY' && request.history) {
      HistoryService.setHistory(request.history)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
        });
      return true;
    }

    if (request.type === 'DELETE_HISTORY' && typeof request.historyIndex === 'number') {
      HistoryService.deleteAt(request.historyIndex)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
        });
      return true;
    }

    if (request.type === 'DELETE_HISTORY' && typeof request.historyId === 'string') {
      HistoryService.getHistory()
        .then((history) => {
          const next = history.filter((item) => item.id !== request.historyId);
          return HistoryService.setHistory(next);
        })
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
        });
      return true;
    }

    if (request.type === 'CLEAR_HISTORY') {
      HistoryService.clear()
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
        });
      return true;
    }

    if (request.type === 'SAVE_FRAMEWORK' && request.framework) {
      FrameworkStore.saveFramework(request.framework)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
        });
      return true;
    }

    if (request.type === 'DELETE_FRAMEWORK' && request.frameworkId) {
      FrameworkStore.deleteFramework(request.frameworkId)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
        });
      return true;
    }

    if (request.type === 'SET_ACTIVE_FRAMEWORK' && request.frameworkId) {
      FrameworkStore.setActiveFramework(request.frameworkId)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          sendResponse({ error: message });
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

chrome.runtime.onMessage.addListener((request: MessagePayload, _sender, sendResponse: (response: MessageResponse) => void) => {
  return handleMessage(request, sendResponse);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  const payload: {
    ltc_active?: boolean;
    ltc_mode?: string;
    ltc_latest_response?: ResponseRecord;
    ltc_last_thinking_steps?: Array<{ title: string; desc: string }>;
    ltc_frameworks?: Array<{ id: string; name: string; description: string; systemPrompt: string; isActive: boolean }>;
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
    payload.ltc_last_thinking_steps = changes.ltc_last_thinking_steps.newValue as Array<{ title: string; desc: string }> | undefined;
  }
  if (changes.ltc_frameworks) {
    payload.ltc_frameworks = changes.ltc_frameworks.newValue as Array<{ id: string; name: string; description: string; systemPrompt: string; isActive: boolean }> | undefined;
  }
  if (Object.keys(payload).length === 0) return;

  chrome.runtime.sendMessage({ type: 'STATE_PUSH', payload });
});
