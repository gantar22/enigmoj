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
window.showUpload = showUpload;

// DOM Elements
const listView = document.getElementById('list-view');
const gameView = document.getElementById('game-view');
const gridContainer = document.getElementById('grid-container');
let aboutView = null;
let uploadView = null;

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
                    if (!data.solution) {
                        data.contestMode = true;
                    }
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
    if (aboutView) {
        aboutView.classList.remove('active');
        aboutView.style.display = 'none';
    }
    if (uploadView) {
        uploadView.classList.remove('active');
        uploadView.style.display = 'none';
    }
    listView.classList.add('active');
    
    initList(); // Refresh statuses
    if (updateUrl) {
        history.pushState({view: 'list'}, '', '?list');
    }
}
window.showList = showList;

function showAbout(updateUrl = true) {
    saveProgress();
    stopTimer();
    
    gameView.classList.remove('active');
    listView.classList.remove('active');
    if (uploadView) {
        uploadView.classList.remove('active');
        uploadView.style.display = 'none';
    }
    
    if (!aboutView) initAbout();
    if (aboutView) {
        aboutView.classList.add('active');
        aboutView.style.display = 'block';
    }
    
    if (updateUrl) {
        history.pushState({view: 'about'}, '', '?about');
    }
}
window.showAbout = showAbout;

function showUpload(updateUrl = true) {
    saveProgress();
    stopTimer();
    
    gameView.classList.remove('active');
    listView.classList.remove('active');
    if (aboutView) {
        aboutView.classList.remove('active');
        aboutView.style.display = 'none';
    }
    
    if (!uploadView) initUpload();
    if (uploadView) {
        uploadView.classList.add('active');
        uploadView.style.display = 'block';
    }
    
    if (updateUrl) {
        history.pushState({view: 'upload'}, '', '?upload');
    }
}

function initUpload() {
    if (uploadView) return;
    
    uploadView = document.createElement('div');
    uploadView.id = 'upload-view';
    uploadView.className = listView.className;
    uploadView.classList.remove('active');
    uploadView.style.display = 'none';
    
    const header = document.createElement('div');
    header.style.padding = '15px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.borderBottom = '1px solid var(--border-color)';
    header.innerHTML = `<button class="icon-btn" onclick="showList()" style="margin-right: 15px; font-size: 1.2em;">←</button><h2 style="margin:0">Alŝuti Enigmon</h2>`;
    uploadView.appendChild(header);
    
    const content = document.createElement('div');
    content.style.padding = '20px';
    content.style.maxWidth = '800px';
    content.style.margin = '0 auto';
    content.style.textAlign = 'center';
    
    content.innerHTML = `
        <p>Elektu .ipuz dosieron de via aparato por ludi ĝin kaj krei ligilon por dividi.</p>
        <input type="file" id="puzzle-upload-input" accept=".ipuz,.json" style="display: none;">
        <button class="puzzle-card" style="margin: 20px auto; padding: 20px; width: auto; cursor: pointer;" onclick="document.getElementById('puzzle-upload-input').click()">
            Elekti Dosieron
        </button>
    `;
    
    uploadView.appendChild(content);
    document.body.appendChild(uploadView);

    const input = content.querySelector('#puzzle-upload-input');
    input.addEventListener('change', handleFileUpload);
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonStr = e.target.result;
            const data = JSON.parse(jsonStr);
            
            if (!data.title) data.title = file.name.replace(/\.(ipuz|json)$/i, "");

            if (!data.solution) {
                data.contestMode = true;
            }

            const id = simpleHash(jsonStr);
            puzzleStore[id] = data;
            
            const encoded = encodeURIComponent(jsonStr);
            window.location.hash = `enigmo=${encoded}`;
            
            loadGame(id, false);
            
        } catch (err) {
            console.error(err);
            alert("Eraro dum legado de dosiero: " + err.message);
        }
    };
    reader.readAsText(file);
}

function loadGame(id, updateUrl = true) {
    const record = puzzleStore[id];
    if (!record) {
        alert("Puzzle data not found!");
        return;
    }

    state.currentPuzzleId = id;
    state.currentPuzzleData = parseIpuz(record);
    let titleHtml = formatTitle(record.title);
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
    if (aboutView) {
        aboutView.classList.remove('active');
        aboutView.style.display = 'none';
    }
    if (uploadView) {
        uploadView.classList.remove('active');
        uploadView.style.display = 'none';
    }
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
    if (!e.target.matches('.hamburger-btn') && !e.target.matches('#home-menu-btn')) {
        const menu = document.getElementById('game-menu');
        if (menu && menu.style.display === 'block') {
            menu.style.display = 'none';
        }
        const homeMenu = document.getElementById('home-menu');
        if (homeMenu && homeMenu.style.display === 'block') {
            homeMenu.style.display = 'none';
        }
    }
});

// Handle Browser Navigation
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.id) {
        loadGame(e.state.id, false);
    } else if (e.state && e.state.view === 'about') {
        showAbout(false);
    } else if (e.state && e.state.view === 'upload') {
        showUpload(false);
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

function initAbout() {
    if (aboutView) return;
    
    aboutView = document.createElement('div');
    aboutView.id = 'about-view';
    aboutView.className = listView.className;
    aboutView.classList.remove('active');
    aboutView.style.display = 'none';
    
    const header = document.createElement('div');
    header.style.padding = '15px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.borderBottom = '1px solid var(--border-color)';
    header.innerHTML = `<button class="icon-btn" onclick="showList()" style="margin-right: 15px; font-size: 1.2em;">←</button><h2 style="margin:0">Pri ĉio ĉi</h2>`;
    aboutView.appendChild(header);
    
    const content = document.createElement('div');
    content.style.padding = '20px';
    content.style.maxWidth = '800px';
    content.style.margin = '0 auto';
    content.style.lineHeight = '1.6';
    
    const aboutContent = document.getElementById('about-content');
    if (aboutContent) {
        while (aboutContent.firstChild) {
            content.appendChild(aboutContent.firstChild);
        }
    }
    aboutView.appendChild(content);
    document.body.appendChild(aboutView);
}

function initHomeMenu() {
    let btn = document.getElementById('home-menu-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'home-menu-btn';
        btn.className = 'icon-btn hamburger-btn';
        btn.innerHTML = '☰';
        btn.style.position = 'absolute';
        btn.style.top = '10px';
        btn.style.right = '10px';
        btn.style.zIndex = '100';
        btn.onclick = toggleHomeMenu;
        
        listView.style.position = 'relative';
        listView.appendChild(btn);
    }
    
    let menu = document.getElementById('home-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'home-menu';
        menu.className = 'game-menu';
        menu.style.display = 'none';
        menu.style.position = 'absolute';
        menu.style.zIndex = '101';
        menu.style.top = '50px';
        menu.style.right = '10px';
        listView.appendChild(menu);
    }

    menu.innerHTML = `
        <button style="display:block; width:100%; text-align:left; padding:10px; background:none; border:none; color:inherit; cursor:pointer; border-bottom:1px solid var(--border-color);" onclick="toggleTheme(); toggleHomeMenu()">Ŝanĝi Helreĝimon</button>
        <button style="display:block; width:100%; text-align:left; padding:10px; background:none; border:none; color:inherit; cursor:pointer;" onclick="showAbout(); toggleHomeMenu()">Pri ĉio ĉi</button>
        <button style="display:block; width:100%; text-align:left; padding:10px; background:none; border:none; color:inherit; cursor:pointer; border-bottom:1px solid var(--border-color);" onclick="showUpload(); toggleHomeMenu()">Alŝuti Enigmon</button>
    `;
}

function toggleHomeMenu(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const menu = document.getElementById('home-menu');
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}
window.toggleHomeMenu = toggleHomeMenu;

initAbout();
initHomeMenu();

// Mobile layout optimizations
const mobileStyle = document.createElement('style');
mobileStyle.textContent = `
@media (max-width: 768px) {
    #game-title {
        font-size: 1.2em !important;
        margin: 4px 0 !important;
        min-height: auto !important;
    }
    .progress-container {
        height: 8px !important;
        margin-bottom: 8px !important;
    }
    #progress-bar {
        height: 100% !important;
    }
}
`;
document.head.appendChild(mobileStyle);

const pBar = document.getElementById('progress-bar');
if (pBar && pBar.parentElement) {
    pBar.parentElement.classList.add('progress-container');
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'custom_' + Math.abs(hash).toString(16);
}

// Check initial URL
const searchParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.slice(1));

const getParam = (key) => searchParams.get(key) || hashParams.get(key);
const hasParam = (key) => searchParams.has(key) || hashParams.has(key);

if (hasParam('enigmo')) {
    try {
        const jsonStr = getParam('enigmo');
        const data = JSON.parse(jsonStr);
        if (!data.title) data.title = "Propra Enigmo";
        const id = simpleHash(jsonStr);
        puzzleStore[id] = data;
        history.replaceState({id: id}, '', window.location.href);
        loadGame(id, false);
    } catch (e) {
        console.error("Error parsing custom puzzle:", e);
        alert("Eraro dum ŝargado de la enigmo. Kontrolu la ligilon.");
        showList(false);
    }
} else if (hasParam('id')) loadGame(getParam('id'), false);
else if (hasParam('about')) showAbout(false);
else showList(false);
