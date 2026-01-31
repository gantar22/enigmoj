function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const current = document.documentElement.getAttribute('data-theme');
    btn.textContent = current === 'dark' ? '☀️' : '🌙';
}

export function initTheme() {
    const savedTheme = localStorage.getItem('cw_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeIcon();
}

export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('cw_theme', newTheme);
    updateThemeIcon();
}