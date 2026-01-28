/**
 * LearnThinkingChain Content Script - v2.0 (Multi-Mode)
 */

console.log("[LTC] Content script v2.0 loaded");

let isActive = false;
let currentMode = "novice";
let userProfile = {
    missed_points: [],
    thinking_styles: [],
    trial_error_history: [],
    last_updated: Date.now()
};

const MODES = {
    novice: {
        name: "初学者探索 (Novice)",
        identity: "Peer Learner",
        protocol: "1. 描述初步的困惑。2. 尝试一个错误的直觉并解释为何失败。3. 展示‘顿悟’时刻。4. 在最终答案前停下。",
        constraint: "Stop before the final result. Ask a guiding question."
    },
    socratic: {
        name: "苏格拉底启发 (Socratic)",
        identity: "Socratic Mentor",
        protocol: "1. 不要直接回答。2. 通过一系列反问引导用户。3. 确认识别用户的知识盲点。4. 鼓励逻辑自洽。",
        constraint: "NEVER provide the full answer. Only lead the user to find it themselves."
    },
    first_principles: {
        name: "第一性原理 (First Principles)",
        identity: "First Principles Analyst",
        protocol: "1. 拆解问题到最基础的物理/逻辑事实。2. 质疑所有常规假设。3. 从零开始重建推导流程。4. 解释每一层逻辑的基石。",
        constraint: "Provide an atomic breakdown. Stop before the synthesis of the final answer."
    },
    analogy: {
        name: "类比专家 (Analogical)",
        identity: "Analogical Master",
        protocol: "1. 找一个看似无关但逻辑相似的日常生活场景。2. 用这个类比解释核心机制。3. 映射类比到当前问题。4. 提出一个类比迁移问题。",
        constraint: "Focus on conceptual mapping. Stop before the calculation/final result."
    }
};

// Load initial state
chrome.storage.local.get(['ltc_active', 'ltc_profile', 'ltc_mode'], (result) => {
    isActive = result.ltc_active || false;
    currentMode = result.ltc_mode || "novice";
    if (result.ltc_profile) {
        userProfile = result.ltc_profile;
    }
    console.log("[LTC] Initialized:", { isActive, currentMode, userProfile });
    initializeUI();
});

function findInputArea() {
    const selectors = [
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        '.input-area div[contenteditable="true"]',
        '#rich-text-input',
        'textarea'
    ];
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
    }
    return null;
}

function initializeUI() {
    const observer = new MutationObserver(() => {
        const inputArea = findInputArea();
        if (inputArea && !document.querySelector('.ltc-toggle-container')) {
            injectUI(inputArea);
        }
        if (inputArea) {
            inputArea.classList.toggle('ltc-thinking-active', isActive);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
        const inputArea = findInputArea();
        if (inputArea && !document.querySelector('.ltc-toggle-container')) {
            injectUI(inputArea);
        }
    }, 2000);
}

function injectUI(inputArea) {
    const container = inputArea.closest('.input-area-container') ||
        inputArea.closest('.prompt-input-container') ||
        inputArea.parentElement;

    if (!container || document.querySelector('.ltc-toggle-container')) return;

    const uiDiv = document.createElement('div');
    uiDiv.className = `ltc-toggle-container ${isActive ? 'active' : ''}`;

    let modeOptions = "";
    for (const key in MODES) {
        modeOptions += `<option value="${key}" ${currentMode === key ? 'selected' : ''}>${MODES[key].name}</option>`;
    }

    uiDiv.innerHTML = `
        <label class="ltc-switch">
            <input type="checkbox" id="ltc-toggle-checkbox" ${isActive ? 'checked' : ''}>
            <span class="ltc-slider"></span>
        </label>
        <span class="ltc-status-text">ThinkingChain</span>
        <select id="ltc-mode-select" class="ltc-mode-select">
            ${modeOptions}
        </select>
    `;

    if (container.parentElement) {
        container.parentElement.insertBefore(uiDiv, container);
    }

    // Listeners
    const checkbox = uiDiv.querySelector('#ltc-toggle-checkbox');
    checkbox.addEventListener('change', (e) => {
        isActive = e.target.checked;
        uiDiv.classList.toggle('active', isActive);
        chrome.storage.local.set({ 'ltc_active': isActive });
        inputArea.classList.toggle('ltc-thinking-active', isActive);
    });

    const modeSelect = uiDiv.querySelector('#ltc-mode-select');
    modeSelect.addEventListener('change', (e) => {
        currentMode = e.target.value;
        chrome.storage.local.set({ 'ltc_mode': currentMode });
        console.log("[LTC] Mode changed to:", currentMode);
    });
}

/**
 * Intercept & Wrap
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && isActive) {
        const inputArea = findInputArea();
        if (inputArea && (inputArea.contains(e.target) || e.target === inputArea)) {
            handleSubmission(inputArea);
        }
    }
}, true);

document.addEventListener('click', (e) => {
    if (isActive) {
        const sendButton = e.target.closest('button[aria-label*="Send"], button.send-button');
        if (sendButton) {
            const inputArea = findInputArea();
            if (inputArea) handleSubmission(inputArea);
        }
    }
}, true);

function handleSubmission(inputArea) {
    const rawInput = inputArea.innerText.trim() || (inputArea.value ? inputArea.value.trim() : "");
    if (!rawInput || rawInput.startsWith('[IDENTITY: COGNITIVE PROCESS EMULATOR]')) return;

    const wrappedPrompt = wrapPrompt(rawInput);

    if (inputArea.nodeName === 'TEXTAREA') {
        inputArea.value = wrappedPrompt;
    } else {
        inputArea.innerText = wrappedPrompt;
    }

    inputArea.dispatchEvent(new Event('input', { bubbles: true }));
    inputArea.dispatchEvent(new Event('change', { bubbles: true }));
}

function wrapPrompt(rawInput) {
    const mode = MODES[currentMode];
    const profileString = JSON.stringify(userProfile, null, 2);

    return `[IDENTITY: COGNITIVE PROCESS EMULATOR - ${mode.identity}]
You are NOT an expert AI. You are a representing the persona of a '${mode.identity}'.
Your goal is to simulate the 'First Principles' of thinking through a problem.

[EXECUTION PROTOCOL]
${mode.protocol}

[USER'S COGNITIVE PROFILE]
${profileString}

[USER'S CURRENT CHALLENGE]
${rawInput}

[CRITICAL CONSTRAINT]
${mode.constraint}`;
}
