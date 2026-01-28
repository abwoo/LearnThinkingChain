/**
 * LearnThinkingChain - Background Bridge
 * Connects the Cloud Hub to the Extension's Storage.
 */

const EXTENSION_ID = chrome.runtime.id;
console.log("[LTC Background] Running with ID:", EXTENSION_ID);

// Listen for messages from the Cloud Hub (github.io)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log("[LTC Background] Message from external:", sender.url, request);

    try {
        if (request.type === "GET_STATE") {
            chrome.storage.local.get(null, (allData) => {
                sendResponse(allData);
            });
            return true; // Keep channel open for async response
        }

        if (request.type === "SAVE_PROFILE") {
            chrome.storage.local.set({ 'ltc_profile': request.profile }, () => {
                sendResponse({ success: true });
            });
            return true;
        }

        if (request.type === "SAVE_MODE") {
            chrome.storage.local.set({ 'ltc_mode': request.mode }, () => {
                sendResponse({ success: true });
            });
            return true;
        }

        if (request.type === "SAVE_PROTOCOLS") {
            chrome.storage.local.set({ 'ltc_protocols': request.protocols }, () => {
                sendResponse({ success: true });
            });
            return true;
        }

        if (request.type === "SAVE_SETTINGS") {
            chrome.storage.local.set({ 'ltc_settings': request.settings }, () => {
                sendResponse({ success: true });
            });
            return true;
        }

        if (request.type === "WIPE_MEMORY") {
            const emptyProfile = {
                missed_points: [],
                thinking_styles: [],
                trial_error_history: [],
                knowledge_gaps: [],
                thinking_trend: "",
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
                last_session_id: "",
                last_updated: Date.now()
            };
            chrome.storage.local.set({ 'ltc_profile': emptyProfile }, () => {
                sendResponse({ success: true, profile: emptyProfile });
            });
            return true;
        }
    } catch (e) {
        console.error("[LTC Background] Internal error:", e);
        sendResponse({ error: e.message });
    }
});
