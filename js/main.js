import { puzzleList, puzzleStore } from './data.js';
import { state } from './state.js';
import { formatTitle, parseIpuz, formatTime } from './utils.js';
import { renderCardContent, renderPuzzle, adjustClueDisplayHeight, renderPlaceholder } from './renderer.js';
import { loadProgress, saveProgress } from './storage.js';
import { startTimer, stopTimer } from './timer.js';
import { updateProgressBar, checkPuzzle, clearChecks, revealWord, savePencilState, loadPencilState, updateClearChecksVisibility } from './game.js';
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

function togglePencilMode() {
    state.isPencilMode = !state.isPencilMode;
    const btn = document.getElementById('pencil-toggle-btn');
    if (btn) {
        btn.classList.toggle('active', state.isPencilMode);
    }
}
window.togglePencilMode = togglePencilMode;

function initList() {
    const container = document.getElementById('list-all');
    if (!container) return;
    container.innerHTML = '';
    
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const categories = {
        'etetaj': { title: 'Etetaj', el: null },
        'malgrandaj': { title: 'Malgrandaj', el: null },
        'mezgrandaj': { title: 'Mezgrandaj', el: null },
        'grandaj': { title: 'Grandaj', el: null }
    };

    const categoryOrder = ['etetaj', 'malgrandaj', 'mezgrandaj', 'grandaj'];

    categoryOrder.forEach(key => {
        const section = document.createElement('div');
        section.className = 'puzzle-category';
        section.style.marginBottom = '30px';
        section.style.width = '100%';
        
        const title = document.createElement('h2');
        title.textContent = categories[key].title;
        title.style.textTransform = 'capitalize';
        title.style.borderBottom = '2px solid var(--text-secondary)';
        title.style.paddingBottom = '5px';
        title.style.marginBottom = '15px';
        section.appendChild(title);
        
        const list = document.createElement('div');
        list.className = 'puzzle-list';
        list.style.display = 'flex';
        list.style.overflowX = 'auto';
        list.style.gap = '15px';
        list.style.padding = '5px 0 15px 0';
        
        section.appendChild(list);
        container.appendChild(section);
        categories[key].el = list;
    });

    puzzleList.forEach(key => {
        const addToCategory = (data, btn) => {
            const w = data.dimensions ? data.dimensions.width : 0;
            const h = data.dimensions ? data.dimensions.height : 0;
            const maxDim = Math.max(w, h);
            
            let cat = 'grandaj';
            if (maxDim < 7) cat = 'etetaj';
            else if (maxDim <= 12) cat = 'malgrandaj';
            else if (maxDim <= 16) cat = 'mezgrandaj';
            
            categories[cat].el.appendChild(btn);
        };

        if (puzzleStore[key]) {
            const btn = document.createElement('button');
            btn.className = 'puzzle-card';
            btn.style.flex = '0 0 220px';
            addToCategory(puzzleStore[key], btn);
            renderCardContent(btn, key, puzzleStore[key]);
            btn.onclick = () => {
                if (puzzleStore[key] && puzzleStore[key].puzzle) loadGame(key);
            };
            
            // Check for deep link
            const params = new URLSearchParams(window.location.search);
            if (params.get('id') === key && !state.currentPuzzleId) {
                loadGame(key, false);
            }
        } else {
            // Fetch metadata first
            const basePath = `resources/enigmoj/${key}`;
            fetch(`${basePath}/metadata.json`)
                .then(r => r.ok ? r.json() : Promise.reject('Metadata missing'))
                .then(metadata => {
                    puzzleStore[key] = { ...metadata };
                    
                    const btn = document.createElement('button');
                    btn.className = 'puzzle-card';
                    btn.style.flex = '0 0 220px';
                    btn.onclick = () => {
                        if (puzzleStore[key] && puzzleStore[key].puzzle) loadGame(key);
                    };
                    
                    addToCategory(puzzleStore[key], btn);
                    renderCardContent(btn, key, puzzleStore[key]);
                    
                    return Promise.all([
                        fetch(`${basePath}/puzzle.json`).then(r => r.ok ? r.json() : Promise.reject('Puzzle missing')),
                        fetch(`${basePath}/solution.json`).then(r => r.ok ? r.json() : {}),
                        Promise.resolve(btn)
                    ]);
                })
                .then(([puzzle, solution, btn]) => {
                    const data = { ...puzzleStore[key], ...puzzle, ...solution };
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
                });
        }
    });
}

function showList(updateUrl = true) {
    saveProgress();
    stopTimer();
    savePencilState();
    
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
    loadPencilState(id);
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
    updateClearChecksVisibility();
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
                e.target.classList.remove('pencil');
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
    savePencilState();
});

gridContainer.addEventListener('input', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    
    if (e.data) {
        e.target.value = e.data.slice(-1);
    } else if (e.target.value.length > 1) {
        e.target.value = e.target.value.slice(-1);
    }
    
    e.target.classList.remove('correct', 'incorrect');
    
    if (state.isPencilMode) {
        e.target.classList.add('pencil');
    } else {
        e.target.classList.remove('pencil');
    }
    saveProgress();
    savePencilState();
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
        savePencilState();
    } else if (gameView.classList.contains('active') && document.getElementById('completion-modal').style.display !== 'flex' && document.getElementById('submit-modal').style.display !== 'flex') {
        startTimer();
    }
});

window.addEventListener('blur', () => {
    stopTimer();
    saveProgress();
    savePencilState();
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

state.isPencilMode = false;
const timerDisplay = document.getElementById('timer-display');
let menuContainer = document.querySelector('.menu-container');
const hamburgerBtn = document.querySelector('.hamburger-btn');
const gameMenu = document.getElementById('game-menu');

const pencilBtn = document.createElement('button');
pencilBtn.id = 'pencil-toggle-btn';
pencilBtn.className = 'icon-btn';
pencilBtn.innerHTML = '✎';
pencilBtn.title = 'Krajon-reĝimo';
pencilBtn.onclick = togglePencilMode;

if (!menuContainer && hamburgerBtn && hamburgerBtn.parentNode) {
    menuContainer = document.createElement('div');
    menuContainer.className = 'menu-container';
    hamburgerBtn.parentNode.insertBefore(menuContainer, hamburgerBtn);
    menuContainer.appendChild(hamburgerBtn);
    if (gameMenu) menuContainer.appendChild(gameMenu);
}

if (timerDisplay && menuContainer && hamburgerBtn) {
    menuContainer.insertBefore(timerDisplay, hamburgerBtn);
    menuContainer.insertBefore(pencilBtn, hamburgerBtn);
} else if (timerDisplay && timerDisplay.parentNode) {
    timerDisplay.parentNode.insertBefore(pencilBtn, timerDisplay.nextSibling);
}

// Check initial URL
const params = new URLSearchParams(window.location.search);
if (params.has('id')) loadGame(params.get('id'), false);
else showList(false);
