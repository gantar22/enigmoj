export function formatTitle(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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