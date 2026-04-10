// ============================================
// CrosswordGame — Interfaz del Juego
// Requires: crossword-engine.js (CrosswordGenerator)
// ============================================

let activeGame = null;

class CrosswordGame {
    constructor(containerId, wordsData, title, options = {}) {
        this.el = document.getElementById(containerId);
        this.gen = new CrosswordGenerator(wordsData);
        this.title = title;
        this.showReveal = options.showReveal || false;
        this.userGrid = Array.from({ length: this.gen.rows }, () => Array(this.gen.cols).fill(''));
        this.selR = -1;
        this.selC = -1;
        this.selDir = 'across';
        this.hintsLeft = 5;
        this.render();
    }

    render() {
        const nums = {};
        for (const w of this.gen.placed) {
            const k = `${w.row},${w.col}`;
            if (!(k in nums)) nums[k] = w.num;
        }

        let h = `<h3 class="puzzle-title">${this.title}</h3><div class="cw-layout">`;
        h += `<div class="cw-grid-wrap"><div class="cw-grid" style="grid-template-columns:repeat(${this.gen.cols},var(--cell-size));grid-template-rows:repeat(${this.gen.rows},var(--cell-size));">`;

        for (let r = 0; r < this.gen.rows; r++) {
            for (let c = 0; c < this.gen.cols; c++) {
                if (this.gen.grid[r][c]) {
                    const nm = nums[`${r},${c}`] ? `<span class="cw-num">${nums[`${r},${c}`]}</span>` : '';
                    h += `<div class="cw-cell" data-r="${r}" data-c="${c}">${nm}<span class="cw-letter"></span></div>`;
                } else {
                    h += `<div class="cw-cell cw-blocked"></div>`;
                }
            }
        }
        h += '</div></div>';

        // Clues panel
        const across = this.gen.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num);
        const down = this.gen.placed.filter(w => w.dir === 'down').sort((a, b) => a.num - b.num);
        h += '<div class="cw-clues">';
        if (across.length) {
            h += '<h4>Horizontales</h4><ul>';
            for (const w of across)
                h += `<li data-dir="across" data-r="${w.row}" data-c="${w.col}"><b>${w.num}.</b> ${w.clue} <span class="word-len">(${w.word.length} letras)</span></li>`;
            h += '</ul>';
        }
        if (down.length) {
            h += '<h4>Verticales</h4><ul>';
            for (const w of down)
                h += `<li data-dir="down" data-r="${w.row}" data-c="${w.col}"><b>${w.num}.</b> ${w.clue} <span class="word-len">(${w.word.length} letras)</span></li>`;
            h += '</ul>';
        }
        h += '</div></div>';

        // Action buttons
        h += `<div class="cw-actions">
            <button class="btn-check" onclick="activeGame.check()">Verificar Respuestas</button>
            <button class="btn-hint" onclick="activeGame.hint()">Dame una Pista (${this.hintsLeft} restantes)</button>`;
        if (this.showReveal) {
            h += `<button class="btn-reveal" onclick="activeGame.reveal()">Mostrar Respuestas</button>`;
        }
        h += `<button class="btn-clear" onclick="activeGame.clear()">Borrar Todo</button>
        </div>`;

        this.el.innerHTML = h;

        // Cell click handlers
        this.el.querySelectorAll('.cw-cell:not(.cw-blocked)').forEach(cell => {
            cell.addEventListener('click', () => {
                const r = +cell.dataset.r, c = +cell.dataset.c;
                if (this.selR === r && this.selC === c)
                    this.selDir = this.selDir === 'across' ? 'down' : 'across';
                this.selR = r;
                this.selC = c;
                this.highlight();
                const mi = document.getElementById('mobile-input');
                if (mi) { mi.value = ''; mi.focus(); }
            });
        });

        // Clue click handlers
        this.el.querySelectorAll('.cw-clues li').forEach(li => {
            li.addEventListener('click', () => {
                this.selDir = li.dataset.dir;
                this.selR = +li.dataset.r;
                this.selC = +li.dataset.c;
                this.highlight();
            });
        });
    }

    getCell(r, c) {
        return this.el.querySelector(`.cw-cell[data-r="${r}"][data-c="${c}"]`);
    }

    currentWord() {
        for (const dir of [this.selDir, this.selDir === 'across' ? 'down' : 'across']) {
            for (const w of this.gen.placed) {
                if (w.dir !== dir) continue;
                if (w.dir === 'across' && this.selR === w.row && this.selC >= w.col && this.selC < w.col + w.word.length) return w;
                if (w.dir === 'down' && this.selC === w.col && this.selR >= w.row && this.selR < w.row + w.word.length) return w;
            }
        }
        return null;
    }

    highlight() {
        this.el.querySelectorAll('.cw-cell').forEach(c => c.classList.remove('cw-sel', 'cw-hl'));
        this.el.querySelectorAll('.cw-clues li').forEach(li => li.classList.remove('cw-clue-hl'));
        const word = this.currentWord();
        if (word) {
            this.selDir = word.dir;
            for (let i = 0; i < word.word.length; i++) {
                const r = word.dir === 'across' ? word.row : word.row + i;
                const c = word.dir === 'across' ? word.col + i : word.col;
                const cell = this.getCell(r, c);
                if (cell) cell.classList.add('cw-hl');
            }
            const clue = this.el.querySelector(`.cw-clues li[data-dir="${word.dir}"][data-r="${word.row}"][data-c="${word.col}"]`);
            if (clue) { clue.classList.add('cw-clue-hl'); clue.scrollIntoView({ block: 'nearest' }); }
        }
        const sel = this.getCell(this.selR, this.selC);
        if (sel) sel.classList.add('cw-sel');
    }

    handleKey(e) {
        if (this.selR < 0) return;
        const key = e.key;
        if (key.length === 1 && /[a-z]/i.test(key)) { e.preventDefault(); this.type(key.toUpperCase()); }
        else if (key === 'Backspace') { e.preventDefault(); this.backspace(); }
        else if (key === 'ArrowRight') { e.preventDefault(); this.move(0, 1); }
        else if (key === 'ArrowLeft') { e.preventDefault(); this.move(0, -1); }
        else if (key === 'ArrowDown') { e.preventDefault(); this.move(1, 0); }
        else if (key === 'ArrowUp') { e.preventDefault(); this.move(-1, 0); }
        else if (key === 'Tab') { e.preventDefault(); this.selDir = this.selDir === 'across' ? 'down' : 'across'; this.highlight(); }
    }

    type(letter) {
        this.userGrid[this.selR][this.selC] = letter;
        const cell = this.getCell(this.selR, this.selC);
        if (cell) {
            cell.querySelector('.cw-letter').textContent = letter;
            cell.classList.remove('cw-ok', 'cw-err');
        }
        const word = this.currentWord();
        const dir = word ? word.dir : this.selDir;
        if (dir === 'across') this.move(0, 1); else this.move(1, 0);
    }

    backspace() {
        if (this.userGrid[this.selR][this.selC]) {
            this.userGrid[this.selR][this.selC] = '';
            const cell = this.getCell(this.selR, this.selC);
            if (cell) { cell.querySelector('.cw-letter').textContent = ''; cell.classList.remove('cw-ok', 'cw-err'); }
        } else {
            const word = this.currentWord();
            if (word) {
                if (word.dir === 'across') this.move(0, -1); else this.move(-1, 0);
            }
            this.userGrid[this.selR][this.selC] = '';
            const cell = this.getCell(this.selR, this.selC);
            if (cell) { cell.querySelector('.cw-letter').textContent = ''; cell.classList.remove('cw-ok', 'cw-err'); }
        }
    }

    move(dr, dc) {
        const nr = this.selR + dr, nc = this.selC + dc;
        if (nr >= 0 && nr < this.gen.rows && nc >= 0 && nc < this.gen.cols && this.gen.grid[nr][nc]) {
            this.selR = nr;
            this.selC = nc;
            this.highlight();
        }
    }

    check() {
        let correct = 0, total = 0;
        for (let r = 0; r < this.gen.rows; r++) {
            for (let c = 0; c < this.gen.cols; c++) {
                if (!this.gen.grid[r][c]) continue;
                total++;
                const cell = this.getCell(r, c);
                const u = this.userGrid[r][c];
                if (!u) { cell.classList.remove('cw-ok', 'cw-err'); continue; }
                if (u === this.gen.grid[r][c]) { cell.classList.add('cw-ok'); cell.classList.remove('cw-err'); correct++; }
                else { cell.classList.add('cw-err'); cell.classList.remove('cw-ok'); }
            }
        }
        if (correct === total) {
            const t = this.el.querySelector('.puzzle-title');
            if (t && !t.classList.contains('completed')) {
                t.classList.add('completed');
                t.textContent += ' — Completado!';
            }
        }
    }

    hint() {
        if (this.hintsLeft <= 0) return;
        const cands = [];
        for (let r = 0; r < this.gen.rows; r++)
            for (let c = 0; c < this.gen.cols; c++)
                if (this.gen.grid[r][c] && this.userGrid[r][c] !== this.gen.grid[r][c])
                    cands.push({ r, c });
        if (!cands.length) return;
        const p = cands[Math.floor(Math.random() * cands.length)];
        this.userGrid[p.r][p.c] = this.gen.grid[p.r][p.c];
        const cell = this.getCell(p.r, p.c);
        cell.querySelector('.cw-letter').textContent = this.gen.grid[p.r][p.c];
        cell.classList.add('cw-ok');
        cell.classList.remove('cw-err');
        this.hintsLeft--;
        this.updateHintBtn();
    }

    reveal() {
        for (let r = 0; r < this.gen.rows; r++) {
            for (let c = 0; c < this.gen.cols; c++) {
                if (!this.gen.grid[r][c]) continue;
                this.userGrid[r][c] = this.gen.grid[r][c];
                const cell = this.getCell(r, c);
                cell.querySelector('.cw-letter').textContent = this.gen.grid[r][c];
                cell.classList.add('cw-ok');
                cell.classList.remove('cw-err');
            }
        }
        const t = this.el.querySelector('.puzzle-title');
        if (t && !t.classList.contains('completed')) {
            t.classList.add('completed');
            t.textContent += ' — Completado!';
        }
    }

    updateHintBtn() {
        const btn = this.el.querySelector('.btn-hint');
        if (!btn) return;
        if (this.hintsLeft <= 0) {
            btn.textContent = 'Sin pistas disponibles';
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.textContent = `Dame una Pista (${this.hintsLeft} restantes)`;
        }
    }

    clear() {
        for (let r = 0; r < this.gen.rows; r++)
            for (let c = 0; c < this.gen.cols; c++) {
                this.userGrid[r][c] = '';
                if (!this.gen.grid[r][c]) continue;
                const cell = this.getCell(r, c);
                cell.querySelector('.cw-letter').textContent = '';
                cell.classList.remove('cw-ok', 'cw-err');
            }
        const t = this.el.querySelector('.puzzle-title');
        if (t) { t.textContent = this.title; t.classList.remove('completed'); }
    }

    activate() {
        activeGame = this;
        if (this.selR < 0 && this.gen.placed.length) {
            this.selR = this.gen.placed[0].row;
            this.selC = this.gen.placed[0].col;
            this.selDir = this.gen.placed[0].dir;
        }
        this.highlight();
    }
}

// ============================================
// Global keyboard & mobile input handlers
// ============================================
document.addEventListener('keydown', (e) => {
    if (activeGame) activeGame.handleKey(e);
});

document.addEventListener('DOMContentLoaded', () => {
    const mobileInput = document.getElementById('mobile-input');
    if (!mobileInput) return;

    mobileInput.addEventListener('input', (e) => {
        if (!activeGame || activeGame.selR < 0) return;
        const val = e.target.value;
        if (val.length > 0) {
            const ch = val.slice(-1);
            if (/[a-záéíóúñü]/i.test(ch)) activeGame.type(ch.toUpperCase());
        }
        mobileInput.value = '';
    });

    mobileInput.addEventListener('keydown', (e) => {
        if (!activeGame) return;
        if (e.key === 'Backspace') { e.preventDefault(); activeGame.backspace(); }
    });
});
