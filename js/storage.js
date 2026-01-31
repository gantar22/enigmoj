import { state } from './state.js';

export function saveProgress() {
    if (!state.currentPuzzleId) return;
    const saveState = {};
    document.querySelectorAll('.cell input').forEach(input => {
        if (input.value) saveState[`${input.dataset.row},${input.dataset.col}`] = input.value;
    });
    localStorage.setItem('cw_progress_' + state.currentPuzzleId, JSON.stringify(saveState));
    localStorage.setItem('cw_time_' + state.currentPuzzleId, state.puzzleSeconds);
}

export function loadProgress() {
    if (!state.currentPuzzleId) return;
    const saved = localStorage.getItem('cw_progress_' + state.currentPuzzleId);
    if (saved) {
        const saveState = JSON.parse(saved);
        Object.entries(saveState).forEach(([key, val]) => {
            const [r, c] = key.split(',');
            const input = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            if (input) input.value = val;
        });
    }
}