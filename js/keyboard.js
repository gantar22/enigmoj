import { state } from './state.js';
import { saveProgress } from './storage.js';
import { updateProgressBar, savePencilState } from './game.js';
import { moveFocus, jumpToNextClue, jumpToPreviousClue, moveCursorForward } from './navigation.js';

const ALT_MAP = {
    'a': ['a', 'à', 'á', 'â', 'ä'],
    'c': ['c', 'ĉ', 'ç'],
    'e': ['e', 'é', 'è', 'ê', 'ë'],
    'g': ['g', 'ĝ'],
    'h': ['h', 'ĥ'],
    'i': ['i', 'ì', 'í', 'î', 'ï'],
    'j': ['j', 'ĵ'],
    'n': ['n', 'ñ'],
    'o': ['o', 'ò', 'ó', 'ô', 'ö'],
    's': ['s', 'ŝ'],
    'u': ['u', 'ŭ', 'ù', 'ú', 'û', 'ü']
};

export function renderKeyboard() {
    const kb = document.getElementById('virtual-keyboard');
    if (!kb) return;
    kb.innerHTML = '';
    
    const rows = state.keyboardMode === 'default' ? [
        ['ŝ','ĝ','e','r','t','ŭ','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l'],
        ['z','ĉ','c','v','b','n','m']
    ] : [
        ['1','2','3','4','5','6','7','8','9','0'],
        ['q','w','y','ĵ','ĥ']
    ];
    
    rows.forEach((rowChars, i) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'kb-row';
        
        if (state.keyboardMode === 'default' && i === 2) {
            rowDiv.appendChild(createKey('pli', null, 'kb-key wide', false, () => {
                state.keyboardMode = 'pli';
                renderKeyboard();
                if (state.virtualKeyboardEnabled) updateKeyboardState();
            }));
        }

        rowChars.forEach(char => {
            const alts = (state.keyboardMode === 'default') ? ALT_MAP[char] : null;
            rowDiv.appendChild(createKey(char, alts));
        });
        
        if (state.keyboardMode === 'default' && i === 2) {
            rowDiv.appendChild(createKey('⌫', null, 'kb-key wide', false, () => handleVirtualKey('Backspace')));
        }
        kb.appendChild(rowDiv);
    });

    if (state.keyboardMode === 'pli') {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'kb-row';
        
        rowDiv.appendChild(createKey('abc', null, 'kb-key wide', false, () => {
            state.keyboardMode = 'default';
            renderKeyboard();
            if (state.virtualKeyboardEnabled) updateKeyboardState();
        }));
        
        const hintDiv = document.createElement('div');
        hintDiv.style.flex = '4';
        hintDiv.style.display = 'flex';
        hintDiv.style.alignItems = 'center';
        hintDiv.style.justifyContent = 'center';
        hintDiv.style.fontSize = '0.8em';
        hintDiv.style.color = 'var(--text-secondary)';
        hintDiv.style.textAlign = 'center';
        hintDiv.innerHTML = '<span>ankaŭ provu <i>long-premon</i> por pli da opcioj</span>';
        rowDiv.appendChild(hintDiv);

        rowDiv.appendChild(createKey('⌫', null, 'kb-key wide', false, () => handleVirtualKey('Backspace')));
        kb.appendChild(rowDiv);
    }
}

function createKey(label, alts, className = 'kb-key', isAlt = false, customAction = null) {
    const key = document.createElement('div');
    key.className = className;
    key.textContent = label;
    
    let timer = null;
    let popup = null;

    const start = (e) => {
        if (e.cancelable && e.type === 'touchstart') e.preventDefault();
        
        if (alts && alts.length > 0) {
            timer = setTimeout(() => {
                showPopup();
                if (navigator.vibrate) navigator.vibrate(50);
            }, 400);
        }
        
        document.addEventListener('mouseup', end);
        document.addEventListener('touchend', end);
        document.addEventListener('mousemove', move);
        document.addEventListener('touchmove', move, { passive: false });
    };

    const showPopup = () => {
        popup = document.createElement('div');
        popup.className = 'kb-popup';
        alts.forEach(char => {
            const pKey = document.createElement('div');
            pKey.className = 'kb-popup-key';
            pKey.textContent = char;
            pKey.dataset.char = char;
            if (char === label) pKey.classList.add('selected');
            popup.appendChild(pKey);
        });
        key.appendChild(popup);
    };

    const move = (e) => {
        if (popup) {
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const target = document.elementFromPoint(clientX, clientY);
            const keys = popup.querySelectorAll('.kb-popup-key');
            keys.forEach(k => k.classList.remove('selected'));
            
            if (target && target.classList.contains('kb-popup-key') && popup.contains(target)) {
                target.classList.add('selected');
            }
        }
    };

    const end = (e) => {
        if (timer) clearTimeout(timer);
        
        if (popup) {
            const selected = popup.querySelector('.kb-popup-key.selected');
            if (selected) {
                handleVirtualKey(selected.dataset.char);
            }
            popup.remove();
            popup = null;
        } else {
            if (customAction) customAction();
            else handleVirtualKey(label);
        }
        
        document.removeEventListener('mouseup', end);
        document.removeEventListener('touchend', end);
        document.removeEventListener('mousemove', move);
        document.removeEventListener('touchmove', move);
    };

    key.ontouchstart = start;
    key.onmousedown = start;
    
    return key;
}

export function toggleKeyboard() {
    state.virtualKeyboardEnabled = !state.virtualKeyboardEnabled;
    localStorage.setItem('cw_virtual_keyboard', state.virtualKeyboardEnabled);
    updateKeyboardState();
}

export function updateKeyboardState() {
    const kb = document.getElementById('virtual-keyboard');
    const body = document.body;
    
    if (state.virtualKeyboardEnabled) {
        kb.classList.add('active');
        body.classList.add('kb-active');
        document.querySelectorAll('.cell input').forEach(el => el.setAttribute('inputmode', 'none'));
        
        const height = kb.offsetHeight;
        document.documentElement.style.setProperty('--kb-height', height + 'px');
    } else {
        kb.classList.remove('active');
        body.classList.remove('kb-active');
        document.querySelectorAll('.cell input').forEach(el => el.removeAttribute('inputmode'));
        document.documentElement.style.removeProperty('--kb-height');
    }
}

export function handleVirtualKey(key) {
    if (!state.lastActiveCell) return;
    
    if (key === 'Backspace') {
        const r = parseInt(state.lastActiveCell.dataset.row);
        const c = parseInt(state.lastActiveCell.dataset.col);
        if (state.lastActiveCell.value === '') {
            if (state.currentDirection === 'across') moveFocus(r, c - 1) || jumpToPreviousClue(r, c, 'across');
            else moveFocus(r - 1, c) || jumpToPreviousClue(r, c, 'down');
        } else {
            state.lastActiveCell.value = '';
            state.lastActiveCell.classList.remove('pencil');
            saveProgress();
            savePencilState();
            updateProgressBar(true);
        }
    } else {
        state.lastActiveCell.value = key;
        state.lastActiveCell.classList.remove('correct', 'incorrect');
        
        if (state.isPencilMode) {
            state.lastActiveCell.classList.add('pencil');
        } else {
            state.lastActiveCell.classList.remove('pencil');
        }

        saveProgress();
        savePencilState();
        updateProgressBar(true);
        
        const r = parseInt(state.lastActiveCell.dataset.row);
        const c = parseInt(state.lastActiveCell.dataset.col);
        moveCursorForward(r, c, state.currentDirection);
    }
}