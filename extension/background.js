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

        if (request.type === "WIPE_MEMORY") {
            const emptyProfile = { missed_points: [], thinking_styles: [], trial_error_history: [], last_updated: Date.now() };
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
