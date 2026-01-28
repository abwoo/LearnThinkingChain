/**
 * LearnThinkingChain Content Script
 * 
 * Responsibilities:
 * 1. Inject the "LearnThinkingChain Mode" toggle into Gemini.
 * 2. Intercept prompt submission.
 * 3. Wrap prompts with the Cognitive Evolution Framework.
 * 4. Update the Cognitive Profile in chrome.storage.local.
 */

let isActive = false;
let userProfile = {
    missed_points: [],
    thinking_styles: [],
    trial_error_history: [],
    last_updated: Date.now()
};

// Load initial state
chrome.storage.local.get(['ltc_active', 'ltc_profile'], (result) => {
    isActive = result.ltc_active || false;
    if (result.ltc_profile) {
        userProfile = result.ltc_profile;
    }
    initializeUI();
});

/**
 * Initialize the UI components (Toggle Switch)
 */
function initializeUI() {
    const observer = new MutationObserver((mutations) => {
        const inputArea = document.querySelector('div[contenteditable="true"][role="textbox"]');
        if (inputArea && !document.querySelector('.ltc-toggle-container')) {
            injectToggle(inputArea);
        }
        
        // Apply glow if active
        if (inputArea) {
            if (isActive) {
                inputArea.classList.add('ltc-thinking-active');
            } else {
                inputArea.classList.remove('ltc-thinking-active');
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Inject the toggle switch into the DOM
 */
function injectToggle(inputArea) {
    // Find a suitable parent container. Usually the one containing the input and action buttons.
    const container = inputArea.closest('.input-area-container') || inputArea.parentElement;
    
    const toggleDiv = document.createElement('div');
    toggleDiv.className = `ltc-toggle-container ${isActive ? 'active' : ''}`;
    toggleDiv.innerHTML = `
        <label class="ltc-switch">
            <input type="checkbox" id="ltc-toggle-checkbox" ${isActive ? 'checked' : ''}>
            <span class="ltc-slider"></span>
        </label>
        <span class="ltc-status-text">LearnThinkingChain Mode</span>
    `;

    // Insert before the input area's parent or within the input bar
    if (container) {
        container.parentElement.insertBefore(toggleDiv, container);
    }

    const checkbox = toggleDiv.querySelector('#ltc-toggle-checkbox');
    checkbox.addEventListener('change', (e) => {
        isActive = e.target.checked;
        toggleDiv.classList.toggle('active', isActive);
        chrome.storage.local.set({ 'ltc_active': isActive });
        
        if (isActive) {
            inputArea.classList.add('ltc-thinking-active');
        } else {
            inputArea.classList.remove('ltc-thinking-active');
        }
    });
}

/**
 * Intercept Submission
 * Note: Gemini uses a contenteditable div. We need to catch the Enter key 
 * AND the click on the "Send" button.
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && isActive) {
        const inputArea = document.querySelector('div[contenteditable="true"][role="textbox"]');
        if (inputArea && inputArea.contains(e.target)) {
            handleSubmission(inputArea);
        }
    }
}, true);

document.addEventListener('click', (e) => {
    if (isActive) {
        const sendButton = e.target.closest('button[aria-label="Send message"]');
        if (sendButton) {
            const inputArea = document.querySelector('div[contenteditable="true"][role="textbox"]');
            if (inputArea) {
                handleSubmission(inputArea);
            }
        }
    }
}, true);

/**
 * Handle the submission by wrapping the prompt
 */
function handleSubmission(inputArea) {
    const rawInput = inputArea.innerText.trim();
    if (!rawInput || rawInput.startsWith('[IDENTITY: COGNITIVE PROCESS EMULATOR]')) return;

    const wrappedPrompt = wrapPrompt(rawInput);
    
    // Set the prompt in the input area and let Gemini's own listeners take over
    // We use execCommand or manual dispatch to ensure Gemini notices the change
    inputArea.innerText = wrappedPrompt;
    
    // Trigger input event so Gemini's React/Angular/Framework picks up the change
    const inputEvent = new Event('input', { bubbles: true });
    inputArea.dispatchEvent(inputEvent);

    // Analyze the response after a delay (simulated post-process)
    captureResponse();
}

/**
 * Wrap the user input with the Cognitive Evolution Framework
 */
function wrapPrompt(rawInput) {
    const profileString = JSON.stringify(userProfile, null, 2);
    
    return `[IDENTITY: COGNITIVE PROCESS EMULATOR]
You are NOT an expert AI. You are a 'Peer Learner' with high meta-cognitive awareness. Your goal is to simulate the 'First Principles' of thinking through a problem from a position of initial ignorance.

[EXECUTION PROTOCOL]
1. **The Novice's First Gaze**: Describe the initial overwhelm. What are the 'visual anchors' or confusing signals in the prompt? (e.g., "At first glance, these variables look disconnected...")
2. **Noise & Intuition**: Mention a common but incorrect intuition a learner might have. 
3. **Explicit Trial & Error**: Walk through a 'Dead-End Path.' Propose a logic, attempt it, and then explain why it fails (e.g., "I tried applying Law X, but realized we lack Variable Y, so that path is blocked.")
4. **Metacognitive Shift**: Show the 'Aha!' moment where the strategy changes. Explain WHY the new direction is chosen.
5. **Knowledge Anchor**: Briefly bridge this problem to a core concept the user has struggled with previously (based on the provided Cognitive Profile).

[USER'S COGNITIVE PROFILE]
${profileString}

[USER'S CURRENT CHALLENGE]
${rawInput}

[CRITICAL CONSTRAINT]
Stop your response BEFORE reaching the final numerical answer or conclusion. Provide a 'Cognitive Handover'—a specific question that invites the user to take the next logical step.`;
}

/**
 * Capture and Analyze Gemini's response
 * This is tricky since Gemini streams responses.
 */
function captureResponse() {
    // Wait for the response container to appear and finish
    const responseObserver = new MutationObserver((mutations) => {
        // Look for the last response element
        const responses = document.querySelectorAll('.message-content'); // Selector might vary
        if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            // Check if it's "done" (Gemini usually has a subtle UI change when finished)
            // For now, we'll use a simpler heuristic or just wait
        }
    });

    // In a real implementation, we might send the response back to a small "analysis" function
    // or use chrome.storage to track the conversation.
}
