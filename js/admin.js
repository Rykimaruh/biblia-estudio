// ============================================
// Admin Module — PIN verification & session
// ============================================

const ADMIN_HASH = 'fde3f2e7127f6810eb4160bf7bb0563240d78c9d75a9a590b6d6244748a7f4ff';

async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isAdmin() {
    return sessionStorage.getItem('adminMode') === 'true';
}

function setAdmin(value) {
    if (value) {
        sessionStorage.setItem('adminMode', 'true');
    } else {
        sessionStorage.removeItem('adminMode');
    }
}

async function verifyPin(pin) {
    const hash = await sha256(pin);
    return hash === ADMIN_HASH;
}

// Show PIN modal overlay
function showPinModal(onSuccess) {
    if (isAdmin()) { onSuccess(); return; }

    const overlay = document.createElement('div');
    overlay.id = 'admin-overlay';
    overlay.innerHTML = `
        <div class="admin-modal">
            <h2>Acceso de Administrador</h2>
            <p>Ingrese el PIN para acceder al modo administrador</p>
            <div class="admin-form">
                <input type="password" id="admin-pin" maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="PIN" autocomplete="off">
                <button id="admin-btn">Entrar</button>
            </div>
            <div id="admin-error"></div>
            <button id="admin-cancel">Cancelar</button>
        </div>
    `;
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';

    const modalStyles = `
        .admin-modal { background:#fff; border-radius:12px; padding:2.5rem; max-width:400px; width:90%; text-align:center; box-shadow:0 10px 40px rgba(0,0,0,0.3); }
        .admin-modal h2 { font-family:Georgia,serif; color:#3a2510; margin-bottom:0.5rem; }
        .admin-modal p { color:#666; margin-bottom:1.5rem; }
        .admin-form { display:flex; gap:0.5rem; justify-content:center; margin-bottom:1rem; }
        #admin-pin { font-size:2rem; width:200px; text-align:center; letter-spacing:0.5rem; font-family:monospace; padding:0.5rem; border:2px solid #ccc; border-radius:8px; }
        #admin-pin:focus { border-color:#c8a44e; outline:none; }
        #admin-btn { background:#c8a44e; color:#2d1f14; border:none; padding:0.8rem 2rem; border-radius:8px; font-size:1.1rem; font-weight:bold; cursor:pointer; }
        #admin-btn:hover { background:#b8943e; }
        #admin-error { color:#d9534f; min-height:1.5rem; font-weight:bold; }
        #admin-cancel { background:none; border:none; color:#888; cursor:pointer; font-size:1rem; margin-top:0.5rem; }
        #admin-cancel:hover { color:#333; }
    `;
    const style = document.createElement('style');
    style.textContent = modalStyles;
    overlay.appendChild(style);
    document.body.appendChild(overlay);

    const pinInput = document.getElementById('admin-pin');
    const errorEl = document.getElementById('admin-error');

    async function checkPin() {
        const pin = pinInput.value.trim();
        if (!pin) { errorEl.textContent = 'Ingrese un PIN'; return; }
        const valid = await verifyPin(pin);
        if (valid) {
            setAdmin(true);
            overlay.remove();
            onSuccess();
        } else {
            errorEl.textContent = 'PIN incorrecto';
            pinInput.value = '';
            pinInput.focus();
        }
    }

    document.getElementById('admin-btn').addEventListener('click', checkPin);
    pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPin(); });
    document.getElementById('admin-cancel').addEventListener('click', () => {
        overlay.remove();
        // Go back if possible
        if (window.history.length > 1) window.history.back();
    });
    pinInput.focus();
}

// Check URL for admin param on load
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1' && !isAdmin()) {
        showPinModal(() => {
            // Reload page to apply admin mode
            window.location.reload();
        });
    }
});

// Make available globally
window.isAdmin = isAdmin;
window.showPinModal = showPinModal;
