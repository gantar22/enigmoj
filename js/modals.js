import { state } from './state.js';
import { formatTime } from './utils.js';
import { startTimer, stopTimer } from './timer.js';
import { puzzleStore } from './data.js';
import { handleClueClick } from './navigation.js';

let currentConfirmAction = null;

export function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-dont-show').checked = false;
    currentConfirmAction = onConfirm;
    document.getElementById('confirm-modal').style.display = 'flex';
}

export function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
    currentConfirmAction = null;
}

export function executeConfirm() {
    if (currentConfirmAction) currentConfirmAction();
    closeConfirmModal();
}

export function openSubmitModal() {
    stopTimer();
    const puzzleRecord = puzzleStore[state.currentPuzzleId];
    const targetEmail = puzzleRecord.contestEmail || 'nathancarterwilliams@gmail.com';
    document.getElementById('submit-email-display').textContent = targetEmail;
    document.getElementById('submit-modal').style.display = 'flex';
}

export function closeSubmitModal() {
    document.getElementById('submit-modal').style.display = 'none';
    if (document.getElementById('game-view').classList.contains('active')) {
        startTimer();
    }
}

export function sendSubmission() {
    const name = document.getElementById('submit-name').value;
    
    if (!name) {
        alert("Bonvolu enigi vian nomon.");
        return;
    }

    const puzzleRecord = puzzleStore[state.currentPuzzleId];
    const targetEmail = puzzleRecord.contestEmail || 'nathancarterwilliams@gmail.com';
    
    let gridString = "";
    for(let r=0; r<state.currentPuzzleData.height; r++) {
        for(let c=0; c<state.currentPuzzleData.width; c++) {
            const input = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            if (input) gridString += (input.value || "_") + " ";
            else gridString += "# ";
        }
        gridString += "\n";
    }

    const subject = encodeURIComponent(`Konkursa Solvo: ${puzzleRecord.title} (${formatTime(state.puzzleSeconds)})`);
    const body = encodeURIComponent(`Nomo: ${name}\n\nSolvo:\n${gridString}`);
    
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
    closeSubmitModal();
}

export function copySubmission() {
    const name = document.getElementById('submit-name').value;
    
    if (!name) {
        alert("Bonvolu enigi vian nomon.");
        return;
    }

    const puzzleRecord = puzzleStore[state.currentPuzzleId];
    
    let gridString = "";
    for(let r=0; r<state.currentPuzzleData.height; r++) {
        for(let c=0; c<state.currentPuzzleData.width; c++) {
            const input = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            if (input) gridString += (input.value || "_") + " ";
            else gridString += "# ";
        }
        gridString += "\n";
    }

    const content = `Temo: Konkursa Solvo: ${puzzleRecord.title} (${formatTime(state.puzzleSeconds)})\n\nNomo: ${name}\n\nSolvo:\n${gridString}`;
    
    navigator.clipboard.writeText(content).then(() => {
        alert("Solvo kopiita al tondujo!");
        closeSubmitModal();
    }).catch(err => {
        alert("Malsukcesis kopii al tondujo. Bonvolu kopii permane.");
        console.error(err);
    });
}

export function openCluesModal() {
    const container = document.getElementById('clues-modal-list');
    container.innerHTML = '';
    
    ['across', 'down'].forEach(dir => {
        if (!state.currentPuzzleData.clues[dir] || state.currentPuzzleData.clues[dir].length === 0) return;
        
        const h3 = document.createElement('h3');
        h3.textContent = dir === 'across' ? 'Horizontale' : 'Vertikale';
        h3.style.borderBottom = '2px solid var(--text-main)';
        h3.style.paddingBottom = '5px';
        h3.style.marginTop = '15px';
        h3.style.color = 'var(--text-main)';
        container.appendChild(h3);
        
        state.currentPuzzleData.clues[dir].forEach(clue => {
            const div = document.createElement('div');
            div.className = 'clue-item';
            
            // Check if filled
            const mainClueEl = document.getElementById(`clue-${dir}-${clue[0]}`);
            if (mainClueEl && mainClueEl.classList.contains('clue-filled')) {
                div.classList.add('clue-filled');
            }
            
            div.innerHTML = `<span class="clue-number">${clue[0]}</span> ${clue[1]}`;
            div.style.padding = '10px 5px';
            div.style.borderBottom = '1px solid var(--clue-bar-border)';
            div.style.marginBottom = '0';
            
            div.onclick = () => {
                closeCluesModal();
                handleClueClick(clue[0], dir);
            };
            container.appendChild(div);
        });
    });
    
    document.getElementById('clues-modal').style.display = 'flex';
}

export function closeCluesModal() {
    document.getElementById('clues-modal').style.display = 'none';
}

export function closeModal() {
    document.getElementById('completion-modal').style.display = 'none';
    if (!state.isPuzzleSolved && document.getElementById('game-view').classList.contains('active')) {
        startTimer();
    }
}