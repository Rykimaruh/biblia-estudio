// ============================================
// Layout — Shared header, nav, footer, mega-dropdown
// ============================================

// ---- Theme (Dark Mode) ----

function initTheme() {
    const saved = localStorage.getItem('biblia-theme');
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}
// Apply theme immediately to prevent flash of wrong theme
initTheme();

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('biblia-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('biblia-theme', 'dark');
    }
    updateThemeIcons();
}

function updateThemeIcons() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.theme-toggle-icon').forEach(el => {
        el.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
    });
    document.querySelectorAll('.drawer-theme-label').forEach(el => {
        el.textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';
    });
}

function getBasePath() {
    const path = window.location.pathname;
    const depth = (path.match(/\//g) || []).length - 1;
    if (depth <= 0) return './';
    return '../'.repeat(depth);
}

// ---- Header ----

function renderHeader(currentBook) {
    const base = getBasePath();
    const header = document.getElementById('site-header');
    if (!header) return;

    const adminLink = window.isAdmin && window.isAdmin()
        ? `<a href="${base}admin.html" class="nav-link admin-link">Admin</a>`
        : '';

    header.innerHTML = `
        <div class="header-inner">
            <div class="header-brand">
                <h1><a href="${base}">Biblia Estudio Interactivo</a></h1>
                <p class="subtitle">Santa Biblia de las Americas (LBLA)</p>
            </div>
            <nav id="main-nav">
                <a href="${base}" class="nav-link ${!currentBook ? 'active' : ''}">Inicio</a>
                <button class="nav-link" id="books-toggle" aria-expanded="false" aria-controls="mega-dropdown">
                    Libros <span class="books-arrow">&#9662;</span>
                </button>
                <a href="${base}historia-cultura/" class="nav-link">Historia</a>
                ${adminLink}
                <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode" title="Modo Oscuro">
                    <span class="theme-toggle-icon">\uD83C\uDF19</span>
                </button>
            </nav>
            <button class="nav-hamburger" id="hamburger" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
        </div>
        <div class="mega-dropdown" id="mega-dropdown"></div>
    `;

    // Load books data and build mega-dropdown + mobile drawer
    fetch(base + 'data/books.json')
        .then(r => r.json())
        .then(books => {
            buildMegaDropdown(books, base, currentBook);
            buildMobileDrawer(books, base, currentBook);
        })
        .catch(() => {});

    // Toggle mega-dropdown
    document.getElementById('books-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        const dd = document.getElementById('mega-dropdown');
        const btn = document.getElementById('books-toggle');
        const isOpen = dd.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen);
        btn.classList.toggle('open', isOpen);
    });

    // Hamburger toggle
    document.getElementById('hamburger').addEventListener('click', () => {
        const drawer = document.getElementById('mobile-drawer');
        const overlay = document.getElementById('drawer-overlay');
        if (drawer) {
            drawer.classList.toggle('open');
            overlay.classList.toggle('open');
        }
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    updateThemeIcons();

    // Close mega-dropdown on outside click
    document.addEventListener('click', (e) => {
        const dd = document.getElementById('mega-dropdown');
        const btn = document.getElementById('books-toggle');
        if (dd && dd.classList.contains('open') && !dd.contains(e.target) && e.target !== btn) {
            dd.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
            btn.classList.remove('open');
        }
    });
}

function buildMegaDropdown(books, base, currentBook) {
    const dd = document.getElementById('mega-dropdown');
    if (!dd) return;

    const antiguo = books.filter(b => b.testament === 'antiguo');
    const nuevo = books.filter(b => b.testament === 'nuevo');

    dd.innerHTML = `
        <div class="mega-testament">
            <h3 class="mega-testament-title">Antiguo Testamento</h3>
            <div class="mega-groups">${renderGroups(antiguo, base, currentBook)}</div>
        </div>
        <div class="mega-testament">
            <h3 class="mega-testament-title">Nuevo Testamento</h3>
            <div class="mega-groups">${renderGroups(nuevo, base, currentBook)}</div>
        </div>
    `;

    // Stop click propagation inside dropdown
    dd.addEventListener('click', e => e.stopPropagation());
}

function renderGroups(books, base, currentBook) {
    const groups = {};
    for (const b of books) {
        if (!groups[b.group]) groups[b.group] = [];
        groups[b.group].push(b);
    }
    let html = '';
    for (const [groupName, groupBooks] of Object.entries(groups)) {
        html += `<div class="mega-group">`;
        html += `<h4 class="mega-group-title">${groupName}</h4>`;
        html += '<ul class="mega-book-list">';
        for (const b of groupBooks) {
            const isActive = b.status === 'active';
            const isCurrent = b.slug === currentBook;
            const cls = isCurrent ? 'mega-book current' : (isActive ? 'mega-book' : 'mega-book disabled');
            if (isActive) {
                html += `<li><a href="${base}${b.slug}/" class="${cls}">${b.name}</a></li>`;
            } else {
                html += `<li><span class="${cls}">${b.name}</span></li>`;
            }
        }
        html += '</ul></div>';
    }
    return html;
}

function buildMobileDrawer(books, base, currentBook) {
    // Remove existing drawer if any
    const existing = document.getElementById('mobile-drawer');
    if (existing) existing.remove();
    const existingOverlay = document.getElementById('drawer-overlay');
    if (existingOverlay) existingOverlay.remove();

    const antiguo = books.filter(b => b.testament === 'antiguo');
    const nuevo = books.filter(b => b.testament === 'nuevo');

    const drawer = document.createElement('div');
    drawer.id = 'mobile-drawer';
    drawer.className = 'mobile-drawer';

    const adminLink = window.isAdmin && window.isAdmin()
        ? `<a href="${base}admin.html" class="drawer-link">Admin</a>`
        : '';

    drawer.innerHTML = `
        <div class="drawer-header">
            <span class="drawer-title">Menu</span>
            <button class="drawer-close" id="drawer-close">&times;</button>
        </div>
        <a href="${base}" class="drawer-link ${!currentBook ? 'active' : ''}">Inicio</a>
        <a href="${base}historia-cultura/" class="drawer-link">Historia y Cultura</a>
        ${adminLink}
        <button class="drawer-theme-toggle" id="drawer-theme-toggle">
            <span class="drawer-theme-label">Modo Oscuro</span>
            <span class="drawer-theme-icon theme-toggle-icon">\uD83C\uDF19</span>
        </button>
        <div class="drawer-divider"></div>
        <div class="drawer-testament">
            <button class="drawer-testament-toggle open" data-target="drawer-at">
                Antiguo Testamento <span class="drawer-arrow">&#9662;</span>
            </button>
            <div class="drawer-testament-body open" id="drawer-at">
                ${renderDrawerGroups(antiguo, base, currentBook)}
            </div>
        </div>
        <div class="drawer-testament">
            <button class="drawer-testament-toggle" data-target="drawer-nt">
                Nuevo Testamento <span class="drawer-arrow">&#9662;</span>
            </button>
            <div class="drawer-testament-body" id="drawer-nt">
                ${renderDrawerGroups(nuevo, base, currentBook)}
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.id = 'drawer-overlay';
    overlay.className = 'drawer-overlay';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // Close drawer
    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Drawer theme toggle
    document.getElementById('drawer-theme-toggle').addEventListener('click', toggleTheme);

    // Testament accordion toggles
    drawer.querySelectorAll('.drawer-testament-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const body = document.getElementById(btn.dataset.target);
            btn.classList.toggle('open');
            body.classList.toggle('open');
        });
    });
}

function renderDrawerGroups(books, base, currentBook) {
    const groups = {};
    for (const b of books) {
        if (!groups[b.group]) groups[b.group] = [];
        groups[b.group].push(b);
    }
    let html = '';
    for (const [groupName, groupBooks] of Object.entries(groups)) {
        html += `<div class="drawer-group-label">${groupName}</div>`;
        for (const b of groupBooks) {
            const isActive = b.status === 'active';
            const isCurrent = b.slug === currentBook;
            if (isActive) {
                const cls = isCurrent ? 'drawer-book active' : 'drawer-book';
                html += `<a href="${base}${b.slug}/" class="${cls}">${b.name}</a>`;
            } else {
                html += `<span class="drawer-book disabled">${b.name}</span>`;
            }
        }
    }
    return html;
}

function closeDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// ---- Footer ----

function renderFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const base = getBasePath();

    footer.innerHTML = `
        <div class="footer-inner">
            <div class="footer-col footer-brand-col">
                <div class="footer-logo">Biblia Estudio Interactivo</div>
                <p>Herramientas de estudio biblico basadas en la Santa Biblia de las Americas (LBLA).</p>
                <p class="footer-copy">&copy; ${new Date().getFullYear()} Biblia Estudio Interactivo</p>
            </div>
            <div class="footer-col">
                <h4>Contenido</h4>
                <ul>
                    <li><a href="${base}">Inicio</a></li>
                    <li><a href="${base}genesis/">Genesis</a></li>
                    <li><a href="${base}exodo/">Exodo</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Actividades</h4>
                <ul>
                    <li>Resumenes por capitulo</li>
                    <li>Mapas interactivos</li>
                    <li>Crucigramas tematicos</li>
                    <li>Cuestionarios</li>
                </ul>
            </div>
        </div>
    `;
}

// ---- Breadcrumb ----

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

// ---- Auto-init ----

document.addEventListener('DOMContentLoaded', () => {
    const bookMeta = document.querySelector('meta[name="book"]');
    const currentBook = bookMeta ? bookMeta.content : null;
    renderHeader(currentBook);
    renderFooter();
});
