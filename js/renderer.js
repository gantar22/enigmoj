import { state } from './state.js';
import { handleClueClick } from './navigation.js';
import { formatTitle } from './utils.js';

export function renderPlaceholder(btn, key) {
    btn.style.opacity = '0.7';
    btn.innerHTML = `
        <div class="puzzle-title" style="min-height: 3.5em; display: flex; align-items: center; justify-content: center;"><span>${formatTitle(key)}</span></div>
        <div class="puzzle-preview" style="aspect-ratio: 1; background-color: rgba(128,128,128,0.1); width: 100%; border-radius: 4px;"></div>
        <div class="puzzle-status">Loading...</div>
    `;
}

export function renderCardContent(btn, key, p) {
    btn.style.opacity = '1';
    
    // Check progress
    const savedJson = localStorage.getItem('cw_progress_' + key);
    const savedTime = localStorage.getItem('cw_time_' + key);
    const savedPencilJson = localStorage.getItem('cw_pencil_' + key);
    let pencilState = {};
    if (savedPencilJson) {
        try {
            pencilState = JSON.parse(savedPencilJson);
        } catch (e) { }
    }
    let savedState = null;
    let status = 'Nekomencita';

    if (savedJson) {
        savedState = JSON.parse(savedJson);
        const filledCount = Object.keys(savedState).length;
        
        let totalCells = 0;
        let correctCount = 0;
        if (p.puzzle) {
            p.puzzle.forEach(row => {
                row.forEach(cell => {
                    let isBlock = cell === '#' || cell === '.';
                    if (typeof cell === 'object' && cell !== null && cell.style && cell.style.shapebg === 'circle') {
                        isBlock = false; 
                    }
                    if (!isBlock) {
                        totalCells++;
                    }
                });
            });
            
            // Re-iterate to check correctness using coordinates
            p.puzzle.forEach((row, r) => {
                row.forEach((cell, c) => {
                    let isBlock = cell === '#' || cell === '.';
                    if (typeof cell === 'object' && cell !== null && cell.style && cell.style.shapebg === 'circle') isBlock = false;
                    if (!isBlock) {
                        const val = savedState[`${r},${c}`];
                        if (val && p.solution && p.solution[r][c] && val.toUpperCase() === String(p.solution[r][c]).toUpperCase()) {
                            correctCount++;
                        }
                    }
                });
            });
        }

        if (totalCells > 0 && filledCount >= totalCells) {
            if (correctCount === totalCells) status = 'Solvita';
            else if (!p.solution) status = 'Plenumita';
            else status = 'Plenumita (kun eraroj)';
        } else {
            if (savedTime) {
                const m = Math.floor(parseInt(savedTime, 10) / 60).toString().padStart(2, '0');
                const s = (parseInt(savedTime, 10) % 60).toString().padStart(2, '0');
                status = `${m}:${s}`;
            } else {
                status = 'In Progress';
            }
        }
    }

    const statusClass = status === 'Solved!' ? 'puzzle-status solved' : 'puzzle-status';

    let previewHtml = '';
    if (p.puzzle && p.puzzle.length) {
        let w = (p.dimensions && p.dimensions.width) ? parseInt(p.dimensions.width) : 0;
        if (!w && p.puzzle[0]) w = p.puzzle[0].length;
        const h = p.puzzle.length;

        previewHtml = `<div class="puzzle-preview" style="display: grid; grid-template-columns: repeat(${w}, 1fr); font-size: calc(280px / ${w} * 0.65); aspect-ratio: ${w}/${h};">`;
        p.puzzle.forEach((row, r) => {
            row.forEach((cell, c) => {
                let isBlock = cell === '#' || cell === '.';
                let isCircle = false;
                if (typeof cell === 'object' && cell !== null && cell.style && cell.style.shapebg === 'circle') {
                    isBlock = false;
                    isCircle = true;
                }
                
                let letter = '';
                if (!isBlock && savedState) {
                    if (!pencilState[`${r},${c}`]) {
                        letter = savedState[`${r},${c}`] || '';
                    }
                }
                previewHtml += `<div class="preview-cell ${isBlock ? 'block' : ''} ${isCircle ? 'circle' : ''}" style="aspect-ratio: 1; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; text-transform: uppercase;">${letter}</div>`;
            });
        });
        previewHtml += '</div>';
    } else if (p.dimensions) {
        const w = p.dimensions.width;
        const h = p.dimensions.height;
        previewHtml = `<div class="puzzle-preview" style="display: grid; grid-template-columns: repeat(${w}, 1fr); font-size: calc(280px / ${w} * 0.65); aspect-ratio: ${w}/${h};">`;
        for (let i = 0; i < w * h; i++) {
            previewHtml += `<div class="preview-cell" style="aspect-ratio: 1; width: 100%;"></div>`;
        }
        previewHtml += '</div>';
    }

    let titleHtml = formatTitle(p.title);
    if (p.contestMode) {
        titleHtml += ' <span class="contest-icon" title="Konkurso">🏆</span>';
    }

    btn.innerHTML = `
        <div class="puzzle-title" style="min-height: 3.5em; display: flex; align-items: center; justify-content: center;"><span>${titleHtml}</span></div>
        ${previewHtml}
        <div class="${statusClass}">${status}</div>
    `;
}

export function renderPuzzle(data) {
    const gridContainer = document.getElementById('grid-container');
    const acrossContainer = document.getElementById('across-clues');
    const downContainer = document.getElementById('down-clues');

    gridContainer.innerHTML = '';
    const gridEl = document.createElement('div');
    gridEl.className = 'crossword-grid';
    gridEl.style.setProperty('--grid-cols', data.width);
    gridEl.style.setProperty('--grid-rows', data.height);

    data.grid.forEach((row, rIndex) => {
        row.forEach((cellData, cIndex) => {
            const cell = document.createElement('div');
            let isBlock = cellData === '#' || cellData === '.';
            if (typeof cellData === 'object' && cellData !== null && cellData.style && cellData.style.shapebg === 'circle') {
                isBlock = false; 
            }
            
            if (isBlock) {
                cell.className = 'cell block';
            } else {
                cell.className = 'cell';
                if (typeof cellData === 'object' && cellData !== null && cellData.style && cellData.style.shapebg === 'circle') {
                    cell.classList.add('circle');
                }

                let num = (typeof cellData === 'object') ? cellData.cell : cellData;
                if (num && num !== 0) {
                    const numSpan = document.createElement('span');
                    numSpan.className = 'cell-number';
                    numSpan.textContent = num;
                    cell.appendChild(numSpan);
                }
                const input = document.createElement('input');
                input.dataset.row = rIndex;
                input.dataset.col = cIndex;
                if (state.virtualKeyboardEnabled) input.setAttribute('inputmode', 'none');
                cell.appendChild(input);
            }
            gridEl.appendChild(cell);
        });
    });
    gridContainer.appendChild(gridEl);

    const renderClueList = (arr, container, direction) => {
        container.innerHTML = '';
        if (!arr) return;
        arr.forEach(clue => {
            const div = document.createElement('div');
            div.id = `clue-${direction}-${clue[0]}`;
            div.className = 'clue-item';
            div.innerHTML = `<span class="clue-number">${clue[0]}</span> ${clue[1]}`;
            div.onclick = () => handleClueClick(clue[0], direction);
            container.appendChild(div);
        });
    };

    renderClueList(data.clues.across, acrossContainer, 'across');
    renderClueList(data.clues.down, downContainer, 'down');
}

export function adjustClueDisplayHeight() {
    if (!state.currentPuzzleData) return;
    const display = document.getElementById('current-clue-display');
    const clueBar = document.getElementById('clue-bar');
    const originalText = display.innerHTML;
    const originalDisplay = display.style.display;
    
    display.style.height = ''; 
    display.style.display = 'block';
    display.innerHTML = '';
    
    ['across', 'down'].forEach(dir => {
        const clues = state.currentPuzzleData.clues[dir];
        if (clues) {
            clues.forEach(clue => {
                const div = document.createElement('div');
                div.innerHTML = `${clue[0]}${dir.charAt(0).toUpperCase()}: ${clue[1]}`;
                display.appendChild(div);
            });
        }
    });
    
    let maxH = 0;
    Array.from(display.children).forEach(child => {
        maxH = Math.max(maxH, child.offsetHeight);
    });
    
    display.innerHTML = originalText;
    display.style.display = originalDisplay;
    display.style.height = maxH + 'px';

    if (clueBar) {
        const fullHeight = clueBar.offsetHeight;
        document.documentElement.style.setProperty('--clue-height', fullHeight + 'px');
    }
}