export function formatTitle(key) {
    if (!key) return '';
    const text = String(key).replace(/_/g, ' ').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export function parseIpuz(json) {
    return {
        width: json.dimensions.width,
        height: json.dimensions.height,
        grid: json.puzzle,
        solution: json.solution,
        clues: {
            across: json.clues.Across || json.clues.across,
            down: json.clues.Down || json.clues.down
        }
    };
}