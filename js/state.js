export const state = {
    currentPuzzleData: null,
    currentPuzzleId: null,
    currentDirection: 'across',
    justFocused: false,
    lastActiveCell: null,
    lastFilledCount: 0,
    isContestMode: false,
    keyboardMode: 'default',
    puzzleSeconds: 0,
    timerInterval: null,
    isPuzzleSolved: false,
    virtualKeyboardEnabled: false
};

// Initialize virtual keyboard state
if (localStorage.getItem('cw_virtual_keyboard') !== null) {
    state.virtualKeyboardEnabled = localStorage.getItem('cw_virtual_keyboard') === 'true';
} else {
    state.virtualKeyboardEnabled = window.matchMedia("(max-width: 768px)").matches;
}