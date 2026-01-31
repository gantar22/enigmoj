import { puzzleList, puzzleStore } from './data.js';
import { state } from './state.js';
import { formatTitle, parseIpuz, formatTime } from './utils.js';
import { renderCardContent, renderPuzzle, adjustClueDisplayHeight, renderPlaceholder } from './renderer.js';
import { loadProgress, saveProgress } from './storage.js';
import { startTimer, stopTimer } from './timer.js';
import { updateProgressBar, checkPuzzle, clearChecks, revealWord } from './game.js';
import { initTheme, toggleTheme } from './theme.js';
import { renderKeyboard, updateKeyboardState, toggleKeyboard } from './keyboard.js';
import { handleClueClick, navigateClue, updateHighlights, moveFocus, jumpToNextClue, jumpToPreviousClue } from './navigation.js';
import { openSubmitModal, openCluesModal, closeSubmitModal, closeCluesModal, closeModal, closeConfirmModal, executeConfirm, sendSubmission, copySubmission } from './modals.js';

// Expose functions to global scope for HTML onclick handlers
window.toggleTheme = toggleTheme;
window.toggleKeyboard = toggleKeyboard;
window.checkPuzzle = checkPuzzle;
window.clearChecks = clearChecks;
window.revealWord = revealWord;
window.openSubmitModal = openSubmitModal;
window.openCluesModal = openCluesModal;
window.navigateClue = navigateClue;
window.closeModal = closeModal;
window.closeConfirmModal = closeConfirmModal;
window.executeConfirm = executeConfirm;
window.closeSubmitModal = closeSubmitModal;
window.sendSubmission = sendSubmission;
window.copySubmission = copySubmission;
window.closeCluesModal = closeCluesModal;

// DOM Elements
const listView = document.getElementById('list-view');
const gameView = document.getElementById('game-view');
const gridContainer = document.getElementById('grid-container');

function initList() {
    const container = document.getElementById('list-all');
    if (!container) return;
    container.innerHTML = '';
    
    puzzleList.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'puzzle-card';
        renderPlaceholder(btn, key);
        btn.onclick = () => {
            if (puzzleStore[key]) loadGame(key);
        };
        container.appendChild(btn);

        if (puzzleStore[key]) {
            renderCardContent(btn, key, puzzleStore[key]);
            
            // Check for deep link
            const params = new URLSearchParams(window.location.search);
            if (params.get('id') === key && !state.currentPuzzleId) {
                loadGame(key, false);
            }
        } else {
            // Fetch
            fetch(`resources/enigmoj/${key}.ipuz`)
                .then(response => response.json())
                .then(data => {
                    puzzleStore[key] = data;
                    renderCardContent(btn, key, data);
                    
                    // Check for deep link
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('id') === key && !state.currentPuzzleId) {
                        loadGame(key, false);
                    }
                })
                .catch(err => {
                    console.error("Failed to load puzzle " + key, err);
                    btn.innerHTML += `<div style="color:red">Error</div>`;
                });
        }
    });
}

function showList(updateUrl = true) {
    saveProgress();
    stopTimer();
    
    gameView.classList.remove('active');
    listView.classList.add('active');
    
    initList(); // Refresh statuses
    if (updateUrl) {
        history.pushState({view: 'list'}, '', '?list');
    }
}
window.showList = showList;

function loadGame(id, updateUrl = true) {
    const record = puzzleStore[id];
    if (!record) {
        alert("Puzzle data not found!");
        return;
    }

    state.currentPuzzleId = id;
    state.currentPuzzleData = parseIpuz(record);
    let titleHtml = record.title;
    if (record.contestMode) {
        titleHtml += ' <span class="contest-icon" title="Konkurso">🏆</span>';
    }
    document.getElementById('game-title').innerHTML = titleHtml;
    state.isContestMode = !!record.contestMode;
    updateContestModeUI();
    state.lastFilledCount = 0;
    state.lastActiveCell = null;
    document.getElementById('current-clue-display').textContent = '';
    document.querySelectorAll('.clue-nav').forEach(btn => btn.style.visibility = 'hidden');
    
    // Reset and load timer
    stopTimer();
    state.isPuzzleSolved = false;
    const savedTime = localStorage.getItem('cw_time_' + id);
    state.puzzleSeconds = savedTime ? parseInt(savedTime, 10) : 0;
    document.getElementById('timer-display').textContent = formatTime(state.puzzleSeconds);

    renderPuzzle(state.currentPuzzleData);
    loadProgress();
    updateProgressBar();
    
    // Check if puzzle is already solved
    if (state.currentPuzzleData.solution) {
        let isSolved = true;
        const inputs = document.querySelectorAll('.cell input');
        if (inputs.length === 0) isSolved = false;
        else {
            for (const input of inputs) {
                const r = parseInt(input.dataset.row);
                const c = parseInt(input.dataset.col);
                const val = input.value.toUpperCase();
                const sol = String(state.currentPuzzleData.solution[r][c]).toUpperCase();
                if (val !== sol) { isSolved = false; break; }
            }
        }
        if (isSolved) state.isPuzzleSolved = true;
    }
    
    listView.classList.remove('active');
    gameView.classList.add('active');

    // Calculate max height for clues to prevent layout shifts
    adjustClueDisplayHeight();

    // Recalculate keyboard height now that the view is visible
    if (state.virtualKeyboardEnabled) {
        updateKeyboardState();
    }
    
    if (updateUrl) {
        history.pushState({id: id}, '', '?id=' + id);
    }

    // Start timer if not blocked by modal
    if (document.getElementById('completion-modal').style.display !== 'flex') {
        startTimer();
    }
}

function updateContestModeUI() {
    document.querySelector('.menu-reveal').style.display = state.isContestMode ? 'none' : 'block';
    document.querySelector('.menu-check').style.display = state.isContestMode ? 'none' : 'block';
    document.querySelector('.menu-clear').style.display = state.isContestMode ? 'none' : 'block';
}

function toggleMenu() {
    const menu = document.getElementById('game-menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}
window.toggleMenu = toggleMenu;

// Event Listeners
gridContainer.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT') {
        state.justFocused = true;
        state.lastActiveCell = e.target;
        updateHighlights(e.target);
        setTimeout(() => state.justFocused = false, 200);
    }
});

gridContainer.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT') {
        if (!state.justFocused && document.activeElement === e.target) {
            state.currentDirection = state.currentDirection === 'across' ? 'down' : 'across';
            updateHighlights(e.target);
        }
    }
});

gridContainer.addEventListener('keydown', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    let moved = false;

    switch (e.key) {
        case 'ArrowUp':
            if (state.currentDirection === 'across') state.currentDirection = 'down';
            else moved = moveFocus(r - 1, c) || jumpToPreviousClue(r, c, 'down');
            break;
        case 'ArrowDown':
            if (state.currentDirection === 'across') state.currentDirection = 'down';
            else moved = moveFocus(r + 1, c) || jumpToNextClue(r, c, 'down');
            break;
        case 'ArrowLeft':
            if (state.currentDirection === 'down') state.currentDirection = 'across';
            else moved = moveFocus(r, c - 1) || jumpToPreviousClue(r, c, 'across');
            break;
        case 'ArrowRight':
            if (state.currentDirection === 'down') state.currentDirection = 'across';
            else moved = moveFocus(r, c + 1) || jumpToNextClue(r, c, 'across');
            break;
        case 'Backspace':
            if (e.target.value === '') {
                if (state.currentDirection === 'across') {
                    moved = moveFocus(r, c - 1) || jumpToPreviousClue(r, c, 'across');
                } else {
                    moved = moveFocus(r - 1, c) || jumpToPreviousClue(r, c, 'down');
                }
            } else {
                e.target.value = '';
                saveProgress();
                updateProgressBar(true);
            }
            break;
        case ' ':
            e.preventDefault();
            state.currentDirection = state.currentDirection === 'across' ? 'down' : 'across';
            break;
    }
    if (!moved) updateHighlights(e.target);
});

gridContainer.addEventListener('input', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    
    if (e.data) {
        e.target.value = e.data.slice(-1);
    } else if (e.target.value.length > 1) {
        e.target.value = e.target.value.slice(-1);
    }
    
    e.target.classList.remove('correct', 'incorrect');
    saveProgress();
    updateProgressBar(true);
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    if (e.target.value.length > 0) {
        if (state.currentDirection === 'across') moveFocus(r, c + 1) || jumpToNextClue(r, c, 'across');
        else moveFocus(r + 1, c) || jumpToNextClue(r, c, 'down');
    }
});

// Close menu when clicking outside
window.addEventListener('click', (e) => {
    if (!e.target.matches('.hamburger-btn')) {
        const menu = document.getElementById('game-menu');
        if (menu && menu.style.display === 'block') {
            menu.style.display = 'none';
        }
    }
});

// Handle Browser Navigation
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.id) {
        loadGame(e.state.id, false);
    } else {
        showList(false);
    }
});

// Handle resize
window.addEventListener('resize', () => {
    if (gameView.classList.contains('active')) {
        adjustClueDisplayHeight();
        if (state.virtualKeyboardEnabled) updateKeyboardState();
    }
});

// Pause timer when page loses focus/visibility
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopTimer();
        saveProgress();
    } else if (gameView.classList.contains('active') && document.getElementById('completion-modal').style.display !== 'flex' && document.getElementById('submit-modal').style.display !== 'flex') {
        startTimer();
    }
});

window.addEventListener('blur', () => {
    stopTimer();
    saveProgress();
});

window.addEventListener('focus', () => {
    if (gameView.classList.contains('active') && document.getElementById('completion-modal').style.display !== 'flex' && document.getElementById('submit-modal').style.display !== 'flex') {
        startTimer();
    }
});

// Initialize
initTheme();
initList();
renderKeyboard();
updateKeyboardState();

// Check initial URL
const params = new URLSearchParams(window.location.search);
if (params.has('id')) loadGame(params.get('id'), false);
else showList(false);
