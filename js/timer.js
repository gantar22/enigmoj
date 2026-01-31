import { state } from './state.js';
import { formatTime } from './utils.js';
import { saveProgress } from './storage.js';

export function startTimer() {
    if (state.timerInterval) return;
    if (state.isPuzzleSolved) return;
    state.timerInterval = setInterval(() => {
        state.puzzleSeconds++;
        document.getElementById('timer-display').textContent = formatTime(state.puzzleSeconds);
        if (state.puzzleSeconds % 10 === 0) saveProgress();
    }, 1000);
}

export function stopTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
}