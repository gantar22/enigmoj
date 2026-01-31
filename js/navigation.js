import { state } from './state.js';

export function moveFocus(r, c) {
    const nextInput = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
    if (nextInput) {
        nextInput.focus({ preventScroll: true });
        return true;
    }
    return false;
}

export function findClueNumber(r, c, dir) {
    if (!state.currentPuzzleData) return null;
    let currR = r, currC = c;
    while (true) {
        if (currR < 0 || currC < 0) break;
        const cellData = state.currentPuzzleData.grid[currR][currC];
        const isBlock = cellData === '#' || cellData === null;
        if (isBlock) break;
        let num = (typeof cellData === 'object') ? cellData.cell : cellData;
        if (num && num !== 0) {
            const prevR = dir === 'across' ? currR : currR - 1;
            const prevC = dir === 'across' ? currC - 1 : currC;
            let isStart = false;
            if (prevR < 0 || prevC < 0) isStart = true;
            else {
                const prevCell = state.currentPuzzleData.grid[prevR][prevC];
                if (prevCell === '#' || prevCell === null) isStart = true;
            }
            if (isStart) return num;
        }
        if (dir === 'across') currC--; else currR--;
    }
    return null;
}

export function highlightWord(r, c, dir) {
    let currR = r, currC = c;
    while (true) {
        let prevR = dir === 'across' ? currR : currR - 1;
        let prevC = dir === 'across' ? currC - 1 : currC;
        if (!document.querySelector(`input[data-row="${prevR}"][data-col="${prevC}"]`)) break;
        currR = prevR; currC = prevC;
    }
    while (true) {
        const input = document.querySelector(`input[data-row="${currR}"][data-col="${currC}"]`);
        if (!input) break;
        input.parentElement.classList.add('active-word');
        if (dir === 'across') currC++; else currR++;
    }
}

function highlightWordByNum(num, dir, className) {
    if (!state.currentPuzzleData) return;
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

    let currR = startR;
    let currC = startC;
    while(true) {
        if (currR >= state.currentPuzzleData.height || currC >= state.currentPuzzleData.width) break;
        const cellData = state.currentPuzzleData.grid[currR][currC];
        const isBlock = cellData === '#' || cellData === null;
        if (isBlock) break;
        const input = document.querySelector(`input[data-row="${currR}"][data-col="${currC}"]`);
        if (input) input.parentElement.classList.add(className);
        if (dir === 'across') currC++; else currR++;
    }
}

function highlightRelatedClues(currentNum, currentDir, currentText) {
    if (!state.currentPuzzleData) return;
    const related = [];

    // Helper to parse references from text manually
    const parseRefs = (text) => {
        const found = [];
        if (!text) return found;
        const str = text.toLowerCase();
        const len = str.length;
        let i = 0;
        
        while (i < len) {
            if (str[i] >= '0' && str[i] <= '9') {
                let j = i;
                while (j < len && str[j] >= '0' && str[j] <= '9') j++;
                const num = parseInt(str.substring(i, j), 10);
                
                let k = j;
                while (k < len && (str[k] === ' ' || str[k] === '-')) k++;
                
                const remainder = str.substring(k);
                if (remainder.startsWith('horizontale')) {
                    found.push({ num, dir: 'across' });
                    i = k + 11;
                } else if (remainder.startsWith('vertikale')) {
                    found.push({ num, dir: 'down' });
                    i = k + 9;
                } else {
                    i = j;
                }
            } else {
                i++;
            }
        }
        return found;
    };

    // 1. Find references in the current clue text
    const forwardRefs = parseRefs(currentText);
    forwardRefs.forEach(ref => related.push(ref));

    // 2. Find other clues that reference the current clue
    ['across', 'down'].forEach(d => {
        if (!state.currentPuzzleData.clues[d]) return;
        state.currentPuzzleData.clues[d].forEach(clue => {
            if (d === currentDir && clue[0] == currentNum) return;
            
            const refs = parseRefs(clue[1]);
            if (refs.some(r => r.num == currentNum && r.dir == currentDir)) {
                related.push({ num: clue[0], dir: d });
            }
        });
    });

    // 3. Link all clues starting with * if the current clue starts with *
    if (currentText && currentText.trim().startsWith('*')) {
        ['across', 'down'].forEach(d => {
            if (!state.currentPuzzleData.clues[d]) return;
            state.currentPuzzleData.clues[d].forEach(clue => {
                if (d === currentDir && clue[0] == currentNum) return;
                
                if (clue[1] && clue[1].trim().startsWith('*')) {
                    related.push({ num: clue[0], dir: d });
                }
            });
        });
    }
    
    related.forEach(rel => {
        highlightWordByNum(rel.num, rel.dir, 'related-word');
        const clueEl = document.getElementById(`clue-${rel.dir}-${rel.num}`);
        if (clueEl) clueEl.classList.add('related-clue');
    });
}

export function updateHighlights(input) {
    document.querySelectorAll('.active-clue').forEach(el => el.classList.remove('active-clue'));
    document.querySelectorAll('.crossing-clue').forEach(el => el.classList.remove('crossing-clue'));
    document.querySelectorAll('.cell.active-word').forEach(el => el.classList.remove('active-word'));
    document.querySelectorAll('.cell.related-word').forEach(el => el.classList.remove('related-word'));
    document.querySelectorAll('.related-clue').forEach(el => el.classList.remove('related-clue'));
    const r = parseInt(input.dataset.row);
    const c = parseInt(input.dataset.col);
    const clueNum = findClueNumber(r, c, state.currentDirection);
    highlightWord(r, c, state.currentDirection);
    
    const display = document.getElementById('current-clue-display');
    const navButtons = document.querySelectorAll('.clue-nav');
    
    if (clueNum) {
        const clueEl = document.getElementById(`clue-${state.currentDirection}-${clueNum}`);
        if (clueEl) {
            clueEl.classList.add('active-clue');
            if (clueEl.offsetParent !== null) {
                clueEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        
        const clueData = state.currentPuzzleData.clues[state.currentDirection].find(x => x[0] == clueNum);
        if (clueData) {
            display.innerHTML = `<span>${clueNum}${state.currentDirection.charAt(0).toUpperCase()}: ${clueData[1]}</span>`;
            if (window.matchMedia("(max-width: 768px)").matches) {
                display.onclick = () => { if (window.openCluesModal) window.openCluesModal(); };
                display.style.cursor = 'pointer';
            } else {
                display.onclick = null;
                display.style.cursor = 'default';
            }
            highlightRelatedClues(clueNum, state.currentDirection, clueData[1]);
        }
        navButtons.forEach(btn => btn.style.visibility = 'visible');
    } else {
        display.textContent = '';
        display.onclick = null;
        display.style.cursor = 'default';
        navButtons.forEach(btn => btn.style.visibility = 'hidden');
    }

    // Highlight crossing clue
    const crossingDir = state.currentDirection === 'across' ? 'down' : 'across';
    const crossingClueNum = findClueNumber(r, c, crossingDir);
    if (crossingClueNum) {
        const crossingClueEl = document.getElementById(`clue-${crossingDir}-${crossingClueNum}`);
        if (crossingClueEl) {
            crossingClueEl.classList.add('crossing-clue');
            if (crossingClueEl.offsetParent !== null) {
                crossingClueEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }
}

function isClueFilled(num, dir) {
    let startR = -1, startC = -1;
    for(let r=0; r<state.currentPuzzleData.height; r++) {
        for(let c=0; c<state.currentPuzzleData.width; c++) {
            const cell = state.currentPuzzleData.grid[r][c];
            let cellNum = (typeof cell === 'object' && cell !== null) ? cell.cell : cell;
            if (cellNum == num) {
                startR = r;
                startC = c;
                break;
            }
        }
        if (startR !== -1) break;
    }
    if (startR === -1) return false;

    let currR = startR;
    let currC = startC;
    
    while(true) {
        if (currR >= state.currentPuzzleData.height || currC >= state.currentPuzzleData.width) break;
        const cellData = state.currentPuzzleData.grid[currR][currC];
        const isBlock = cellData === '#' || cellData === null;
        if (isBlock) break;
        
        const input = document.querySelector(`input[data-row="${currR}"][data-col="${currC}"]`);
        if (!input || input.value === '') return false;
        
        if (dir === 'across') currC++;
        else currR++;
    }
    return true;
}

export function jumpToNextClue(r, c, dir) {
    const currentNum = findClueNumber(r, c, dir);
    if (!currentNum) return false;
    const clueList = state.currentPuzzleData.clues[dir];
    const currentIndex = clueList.findIndex(item => item[0] == currentNum);
    if (currentIndex === -1) return false;
    
    let nextIndex = (currentIndex + 1) % clueList.length;
    
    for (let i = 0; i < clueList.length; i++) {
        const checkIndex = (currentIndex + 1 + i) % clueList.length;
        const checkNum = clueList[checkIndex][0];
        if (!isClueFilled(checkNum, dir)) {
            nextIndex = checkIndex;
            break;
        }
    }
    const nextNum = clueList[nextIndex][0];
    
    for(let y=0; y<state.currentPuzzleData.height; y++) {
        for(let x=0; x<state.currentPuzzleData.width; x++) {
            const cell = state.currentPuzzleData.grid[y][x];
            let cellNum = (typeof cell === 'object' && cell !== null) ? cell.cell : cell;
            if (cellNum == nextNum) return moveFocus(y, x);
        }
    }
    return false;
}

export function jumpToPreviousClue(r, c, dir) {
    const currentNum = findClueNumber(r, c, dir);
    if (!currentNum) return false;

    const clueList = state.currentPuzzleData.clues[dir];
    const currentIndex = clueList.findIndex(item => item[0] == currentNum);
    
    if (currentIndex === -1) return false;

    const prevIndex = (currentIndex - 1 + clueList.length) % clueList.length;
    const prevClue = clueList[prevIndex];
    const prevNum = prevClue[0];

    // Find coordinates of the start of the previous clue
    for(let startY=0; startY<state.currentPuzzleData.height; startY++) {
        for(let startX=0; startX<state.currentPuzzleData.width; startX++) {
            const cell = state.currentPuzzleData.grid[startY][startX];
            let cellNum = (typeof cell === 'object' && cell !== null) ? cell.cell : cell;
            
            if (cellNum == prevNum) {
                // Found the start of the previous word. Now find its end to focus on.
                let endR = startY, endC = startX;
                while(true) {
                    const nextR = dir === 'across' ? endR : endR + 1;
                    const nextC = dir === 'across' ? endC + 1 : endC;
                    if (nextR >= state.currentPuzzleData.height || nextC >= state.currentPuzzleData.width || state.currentPuzzleData.grid[nextR][nextC] === '#' || state.currentPuzzleData.grid[nextR][nextC] === null) break;
                    endR = nextR; endC = nextC;
                }
                return moveFocus(endR, endC);
            }
        }
    }
    return false;
}

export function navigateClue(direction) {
    if (!state.lastActiveCell) return;
    const r = parseInt(state.lastActiveCell.dataset.row);
    const c = parseInt(state.lastActiveCell.dataset.col);
    
    if (direction === 1) {
        jumpToNextClue(r, c, state.currentDirection);
    } else {
        jumpToPreviousClue(r, c, state.currentDirection);
    }
}

export function handleClueClick(number, direction) {
    if (!state.currentPuzzleData) return;
    
    for(let r=0; r<state.currentPuzzleData.height; r++) {
        for(let c=0; c<state.currentPuzzleData.width; c++) {
            const cell = state.currentPuzzleData.grid[r][c];
            let cellNum = (typeof cell === 'object' && cell !== null) ? cell.cell : cell;
            
            if (cellNum == number) {
                state.currentDirection = direction;
                const input = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
                if (input) input.focus();
                return;
            }
        }
    }
}