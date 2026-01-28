// dashboard.js - v2 (Reactive Hub)

document.addEventListener('DOMContentLoaded', () => {
    init();

    // Listen for storage changes to update live
    chrome.storage.onChanged.addListener((changes) => {
        console.log("[LTC] Storage sync detected", changes);
        updateUI();
    });
});

function init() {
    updateUI();

    document.getElementById('reset-profile').addEventListener('click', () => {
        if (confirm("确定要清空所有认知记忆吗？这将重置您的学习画像。")) {
            chrome.storage.local.set({
                'ltc_profile': { missed_points: [], thinking_styles: [], trial_error_history: [], last_updated: Date.now() }
            }, () => {
                updateUI();
            });
        }
    });
}

function updateUI() {
    chrome.storage.local.get(['ltc_profile', 'ltc_mode', 'ltc_active', 'ltc_last_thinking_steps'], (data) => {
        // 1. Update Mode
        const modeEl = document.getElementById('active-mode');
        const modeNames = {
            'novice': '初学者探索模式',
            'socratic': '苏格拉底启发模式',
            'first_principles': '第一性原理模式',
            'analogy': '类比专家映射模式'
        };
        modeEl.innerText = modeNames[data.ltc_mode] || '未知模式';

        // 2. Update Protocol Code Box
        const codeBox = document.getElementById('current-protocol-code');
        const protocols = {
            'novice': '[IDENTITY: Peer Learner]\n1. Start with confusion\n2. Attempt & Fail\n3. Metacognitive Shift\n4. Guiding Question',
            'socratic': '[IDENTITY: Socratic Mentor]\n1. No answers\n2. Guiding counter-questions\n3. Scaffolding logic\n4. Self-discovery',
            'first_principles': '[IDENTITY: Analytical First-Principles]\n1. Deconstruct to physics/logic\n2. Question assumptions\n3. Rebuild from scratch\n4. Base facts explanation',
            'analogy': '[IDENTITY: Analogy Artist]\n1. Map to daily life\n2. Explain mechanic via metaphor\n3. Bridge back to problem\n4. Transfer question'
        };
        codeBox.innerText = protocols[data.ltc_mode] || 'Standard Protocol active.';

        // 3. Update Thinking Chain (Live Data)
        const chainContainer = document.getElementById('live-chain');
        if (data.ltc_last_thinking_steps && data.ltc_last_thinking_steps.length > 0) {
            chainContainer.innerHTML = '';
            data.ltc_last_thinking_steps.forEach((step, index) => {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'chain-step';
                stepDiv.innerHTML = `
                    <div class="step-icon">${index + 1}</div>
                    <div class="step-content">
                        <h4>${step.title}</h4>
                        <p>${step.desc}</p>
                    </div>
                `;
                chainContainer.appendChild(stepDiv);

                if (index < data.ltc_last_thinking_steps.length - 1) {
                    const conn = document.createElement('div');
                    conn.className = 'chain-connector';
                    chainContainer.appendChild(conn);
                }
            });
        }

        // 4. Radar Animation (Mock update)
        const radar = document.querySelector('.radar-fill');
        if (radar) {
            // Add a small jitter to make it look alive
            const jitter = 5 + Math.random() * 5;
            radar.style.transform = `scale(${0.98 + (Math.random() * 0.04)})`;
        }
    });
}
