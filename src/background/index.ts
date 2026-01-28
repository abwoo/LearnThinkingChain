import type { MessagePayload, MessageResponse } from '../messaging/Types';

chrome.runtime.onMessageExternal.addListener(
  (request: MessagePayload, _sender, sendResponse: (response: MessageResponse) => void) => {
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
);
