// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();

    // Refresh every few seconds to feel "live"
    setInterval(loadProfile, 5000);
});

function loadProfile() {
    chrome.storage.local.get(['ltc_profile', 'ltc_mode', 'ltc_active'], (result) => {
        const modeDisplay = document.getElementById('current-mode-display');
        const gapsList = document.getElementById('gaps-list');
        const lastSync = document.getElementById('last-sync');

        // Update Mode
        const modeMap = {
            'novice': '初学者探索模式',
            'socratic': '苏格拉底启发模式',
            'first_principles': '第一性原理分析模式',
            'analogy': '类比专家映射模式'
        };

        if (result.ltc_active) {
            modeDisplay.innerText = `当前正在激活：${modeMap[result.ltc_mode] || '未知模式'}`;
            modeDisplay.style.color = '#4285f4';
        } else {
            modeDisplay.innerText = '插件当前处于静默状态';
            modeDisplay.style.color = '#9aa0a6';
        }

        // Update Gaps
        if (result.ltc_profile && result.ltc_profile.missed_points.length > 0) {
            gapsList.innerHTML = '';
            result.ltc_profile.missed_points.forEach(gap => {
                const li = document.createElement('li');
                li.className = 'tag';
                li.innerText = gap;
                gapsList.appendChild(li);
            });
        }

        lastSync.innerText = `最后同步: ${new Date().toLocaleTimeString()}`;
    });
}
