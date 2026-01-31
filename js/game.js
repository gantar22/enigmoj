import { state } from './state.js';
import { saveProgress } from './storage.js';
import { formatTime } from './utils.js';
import { stopTimer, startTimer } from './timer.js';
import { showConfirmModal, closeModal, openSubmitModal } from './modals.js';

export function savePencilState() {
    if (!state.currentPuzzleId) return;
    const pencilState = {};
    document.querySelectorAll('.cell input.pencil').forEach(input => {
        pencilState[`${input.dataset.row},${input.dataset.col}`] = true;
    });
    localStorage.setItem('cw_pencil_' + state.currentPuzzleId, JSON.stringify(pencilState));
}

export function loadPencilState(id) {
    const json = localStorage.getItem('cw_pencil_' + id);
    if (!json) return;
    try {
        const pencilState = JSON.parse(json);
        document.querySelectorAll('.cell input').forEach(input => {
            if (pencilState[`${input.dataset.row},${input.dataset.col}`]) {
                input.classList.add('pencil');
            } else {
                input.classList.remove('pencil');
            }
        });
    } catch (e) { console.error(e); }
}

export function updateClearChecksVisibility() {
    const clearBtn = document.querySelector('.menu-clear');
    if (!clearBtn) return;

    if (state.isContestMode) {
        clearBtn.style.display = 'none';
        return;
    }

    const hasChecks = document.querySelectorAll('.cell input.correct, .cell input.incorrect').length > 0;
    clearBtn.style.display = hasChecks ? 'block' : 'none';
}

export function updateProgressBar(fromUser = false) {
    const inputs = document.querySelectorAll('.cell input');
    const total = inputs.length;
    if (total === 0) return;
    
    let filled = 0;
    inputs.forEach(input => {
        if (input.value && !input.classList.contains('pencil')) filled++;
    });
    
    const pct = (filled / total) * 100;
    const bar = document.getElementById('progress-bar');
    if (bar) {
        bar.style.width = `${pct}%`;
        // Lerp from Yellow (Hue 50) to Green (Hue 120)
        const hue = 50 + (pct * 0.7);
        bar.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
    }
    
    updateClueCompletion();

    // Show/Hide Submit button in menu based on fullness in contest mode
    const submitBtn = document.getElementById('menu-submit-btn');
    if (submitBtn) {
        if (state.isContestMode && filled === total) {
            submitBtn.style.display = 'block';
        } else {
            submitBtn.style.display = 'none';
        }
    }

    if (fromUser && filled === total && state.lastFilledCount < total) {
        checkAndShowModal();
    }
    state.lastFilledCount = filled;
}

export function updateClueCompletion() {
    if (!state.currentPuzzleData) return;

    ['across', 'down'].forEach(dir => {
        if (!state.currentPuzzleData.clues[dir]) return;
        
        state.currentPuzzleData.clues[dir].forEach(clue => {
            const num = clue[0];
            const clueEl = document.getElementById(`clue-${dir}-${num}`);
            if (!clueEl) return;

            // Find start coordinates for this clue number
            let startR = -1, startC = -1;
            
            for(let r=0; r<state.currentPuzzleData.height; r++) {
                for(let c=0; c<state.currentPuzzleData.width; c++) {
                    const cell = state.currentPuzzleData.grid[r][c];
                    const cellNum = (typeof cell === 'object' && cell !== null) ? cell.cell : cell;
                    if (cellNum == num) {
                        startR = r;
                        startC = c;
                        break;
                    }
                }
                if (startR !== -1) break;
            }

            if (startR === -1) return;

            // Check if all cells in this word are filled
            let isFilled = true;
            let currR = startR;
            let currC = startC;

            while(true) {
                if (currR >= state.currentPuzzleData.height || currC >= state.currentPuzzleData.width) break;
                
                const cellData = state.currentPuzzleData.grid[currR][currC];
                const isBlock = cellData === '#' || cellData === null;
                if (isBlock) break;

                const input = document.querySelector(`input[data-row="${currR}"][data-col="${currC}"]`);
                if (!input || !input.value || input.classList.contains('pencil')) {
                    isFilled = false;
                    break;
                }

                if (dir === 'across') currC++;
                else currR++;
            }

            if (isFilled) clueEl.classList.add('clue-filled');
            else clueEl.classList.remove('clue-filled');
        });
    });
}

export function checkPuzzle() {
    if (!state.currentPuzzleData || !state.currentPuzzleData.solution) return;
    if (state.isContestMode) return;

    if (localStorage.getItem('cw_suppress_check_confirm')) {
        doCheckPuzzle();
        return;
    }
    
    showConfirmModal(
        "Ĉu kontroli enigmon?",
        "Ĉu vi certas? Tio kontrolos viajn nunajn respondojn kontraŭ la solvo. Malĝustaj literoj estos markitaj ruĝe.",
        () => {
            if (document.getElementById('confirm-dont-show').checked) {
                localStorage.setItem('cw_suppress_check_confirm', 'true');
            }
            doCheckPuzzle();
        }
    );
}

export function doCheckPuzzle() {
    document.querySelectorAll('.cell input').forEach(input => {
        const r = parseInt(input.dataset.row);
        const c = parseInt(input.dataset.col);
        const val = input.value.toUpperCase();
        const sol = state.currentPuzzleData.solution[r][c];
        
        input.classList.remove('correct', 'incorrect');
        
        if (val && !input.classList.contains('pencil')) {
            if (val === String(sol).toUpperCase()) input.classList.add('correct');
            else input.classList.add('incorrect');
        }
    });
    updateClearChecksVisibility();
}

export function clearChecks() {
    document.querySelectorAll('.cell input').forEach(input => {
        input.classList.remove('correct', 'incorrect');
    });
    updateClearChecksVisibility();
}

export function revealWord() {
    if (!state.currentPuzzleData || !state.currentPuzzleData.solution || !state.lastActiveCell) return;
    if (state.isContestMode) return;

    if (localStorage.getItem('cw_suppress_reveal_confirm')) {
        doRevealWord();
        return;
    }

    showConfirmModal(
        "Ĉu malkaŝi vorton?",
        "Ĉu vi certas? Tio plenigos la nune elektitan vorton per la ĝusta respondo. Tio ne estas malfarebla.",
        () => {
            if (document.getElementById('confirm-dont-show').checked) {
                localStorage.setItem('cw_suppress_reveal_confirm', 'true');
            }
            doRevealWord();
        }
    );
}

export function doRevealWord() {
    const r = parseInt(state.lastActiveCell.dataset.row);
    const c = parseInt(state.lastActiveCell.dataset.col);
    const dir = state.currentDirection;

    // Find start of the word by walking backwards
    let currR = r;
    let currC = c;
    
    while (true) {
        let prevR = dir === 'across' ? currR : currR - 1;
        let prevC = dir === 'across' ? currC - 1 : currC;
        
        if (!document.querySelector(`input[data-row="${prevR}"][data-col="${prevC}"]`)) break;
        
        currR = prevR;
        currC = prevC;
    }

    // Walk forwards and fill
    while (true) {
        const input = document.querySelector(`input[data-row="${currR}"][data-col="${currC}"]`);
        if (!input) break;

        if (state.currentPuzzleData.solution[currR] && state.currentPuzzleData.solution[currR][currC]) {
            input.value = state.currentPuzzleData.solution[currR][currC];
            input.classList.remove('correct', 'incorrect', 'pencil');
        }

        if (dir === 'across') currC++;
        else currR++;
    }
    
    saveProgress();
    updateProgressBar(true);
    updateClearChecksVisibility();
}

export function checkAndShowModal() {
    if (!state.currentPuzzleData) return;
    if (!state.isContestMode && !state.currentPuzzleData.solution) return;
    
    stopTimer();

    const modal = document.getElementById('completion-modal');
    const title = document.getElementById('modal-title');
    const msg = document.getElementById('modal-message');
    const btn = document.getElementById('modal-btn');

    if (state.isContestMode) {
        title.textContent = "Enigmo Plenigita";
        msg.innerHTML = `Vi plenigis la kradon. Ĉu vi volas sendi vian solvon?<br>Tempo: ${formatTime(state.puzzleSeconds)}`;
        btn.textContent = "Submeti Solvon";
        btn.className = "modal-btn success";
        btn.onclick = () => { closeModal(); openSubmitModal(); };
        modal.style.display = 'flex';
        return;
    }

    let isCorrect = true;
    document.querySelectorAll('.cell input').forEach(input => {
        const r = parseInt(input.dataset.row);
        const c = parseInt(input.dataset.col);
        const val = input.value.toUpperCase();
        const sol = state.currentPuzzleData.solution[r][c];
        if (val !== String(sol).toUpperCase()) {
            isCorrect = false;
        }
    });

    modal.style.display = 'flex';
    if (isCorrect) {
        state.isPuzzleSolved = true;
        saveProgress();
        title.textContent = "Gratulon!";
        msg.innerHTML = `Vi sukcese solvis la enigmon!<br>Tempo: ${formatTime(state.puzzleSeconds)}`;
        btn.className = "modal-btn success";
    } else {
        title.textContent = "Preskaŭ...";
        msg.textContent = "La krado estas plena, sed estas kelkaj eraroj.";
        btn.className = "modal-btn warning";
        btn.textContent = "Fermi";
        btn.onclick = closeModal;
    }
}