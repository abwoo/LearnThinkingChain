// popup.js

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['ltc_active', 'ltc_profile'], (result) => {
        const statusVal = document.getElementById('status-val');
        const gapsVal = document.getElementById('gaps-val');
        const stylesVal = document.getElementById('styles-val');

        if (statusVal) {
            if (result.ltc_active) {
                statusVal.innerText = 'Active (Novice Mode)';
                statusVal.style.color = '#1a73e8';
            } else {
                statusVal.innerText = 'Inactive';
                statusVal.style.color = '#5f6368';
            }
        }

        if (result.ltc_profile) {
            const profile = result.ltc_profile;
            if (gapsVal) {
                gapsVal.innerText = profile.missed_points.length > 0
                    ? profile.missed_points.join(', ')
                    : 'Initial phase...';
            }

            if (stylesVal) {
                stylesVal.innerText = profile.thinking_styles.length > 0
                    ? profile.thinking_styles.join(', ')
                    : 'Generic';
            }
        }
    });

    document.getElementById('open-dashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://abwoo.github.io/LearnThinkingChain/?force=refresh' });
    });
});
