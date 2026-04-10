// ============================================
// Layout — Shared header, nav, and footer
// ============================================

function getBasePath() {
    // Determine how deep we are from root
    const path = window.location.pathname;
    const depth = (path.match(/\//g) || []).length - 1;
    if (depth <= 0) return './';
    return '../'.repeat(depth);
}

function renderHeader(currentBook) {
    const base = getBasePath();
    const header = document.getElementById('site-header');
    if (!header) return;

    const adminLink = window.isAdmin && window.isAdmin()
        ? `<a href="${base}admin.html" class="admin-link" style="font-size:0.85rem;opacity:0.7;">Admin</a>`
        : '';

    header.innerHTML = `
        <h1><a href="${base}">Biblia Estudio Interactivo</a></h1>
        <p class="subtitle">Santa Biblia de las Americas (LBLA)</p>
        <nav id="main-nav">
            <a href="${base}" class="${!currentBook ? 'active' : ''}">Inicio</a>
            <a href="${base}genesis/" class="${currentBook === 'genesis' ? 'active' : ''}">Genesis</a>
            <a href="${base}exodo/" class="${currentBook === 'exodo' ? 'active' : ''}">Exodo</a>
            ${adminLink}
        </nav>
    `;
}

function renderFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    footer.innerHTML = 'Biblia Estudio Interactivo — Santa Biblia de las Americas (LBLA)';
}

function renderBreadcrumb(items) {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    const base = getBasePath();
    const html = items.map((item, i) => {
        if (i === items.length - 1) {
            return `<span>${item.label}</span>`;
        }
        return `<a href="${item.href || base}">${item.label}</a><span class="sep">/</span>`;
    }).join(' ');
    bc.innerHTML = html;
}

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const bookMeta = document.querySelector('meta[name="book"]');
    const currentBook = bookMeta ? bookMeta.content : null;
    renderHeader(currentBook);
    renderFooter();
});
