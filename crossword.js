// ==========================================
// Motor de Crucigrama - Éxodo
// ==========================================

const FIXED_GRID = 14; // Tamaño fijo para todos los crucigramas

class CrosswordGenerator {
    constructor(wordsData, gridSize) {
        this.size = gridSize || 20;
        this.grid = [];
        this.placed = [];
        this.build(wordsData);
    }

    build(wordsData) {
        this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(null));
        const words = [...wordsData].sort((a, b) => b.word.length - a.word.length);

        const first = words[0];
        const w = first.word.toUpperCase();
        const row = Math.floor(this.size / 2);
        const col = Math.floor((this.size - w.length) / 2);
        this._place(first, row, col, 'across');

        for (let i = 1; i < words.length; i++) {
            this._tryPlace(words[i]);
        }

        this._number();
        this._trimAndPad();
    }

    _place(data, row, col, dir) {
        const word = data.word.toUpperCase();
        for (let i = 0; i < word.length; i++) {
            const r = dir === 'across' ? row : row + i;
            const c = dir === 'across' ? col + i : col;
            this.grid[r][c] = word[i];
        }
        this.placed.push({ word, clue: data.clue, row, col, dir, num: 0 });
    }

    _tryPlace(data) {
        const word = data.word.toUpperCase();
        let best = null, bestScore = -Infinity;

        for (const p of this.placed) {
            for (let i = 0; i < word.length; i++) {
                for (let j = 0; j < p.word.length; j++) {
                    if (word[i] !== p.word[j]) continue;
                    const dir = p.dir === 'across' ? 'down' : 'across';
                    const row = dir === 'down' ? p.row - i : p.row + j;
                    const col = dir === 'across' ? p.col - i : p.col + j;

                    if (this._canPlace(word, row, col, dir)) {
                        const score = this._score(word, row, col, dir);
                        if (score > bestScore) {
                            bestScore = score;
                            best = { row, col, dir };
                        }
                    }
                }
            }
        }

        if (best) {
            this._place(data, best.row, best.col, best.dir);
            return true;
        }
        return false;
    }

    _canPlace(word, row, col, dir) {
        const len = word.length;
        if (row < 0 || col < 0) return false;
        if (dir === 'across' && col + len > this.size) return false;
        if (dir === 'down' && row + len > this.size) return false;

        if (dir === 'across' && col > 0 && this.grid[row][col - 1]) return false;
        if (dir === 'down' && row > 0 && this.grid[row - 1][col]) return false;
        if (dir === 'across' && col + len < this.size && this.grid[row][col + len]) return false;
        if (dir === 'down' && row + len < this.size && this.grid[row + len][col]) return false;

        let intersections = 0;
        for (let i = 0; i < len; i++) {
            const r = dir === 'across' ? row : row + i;
            const c = dir === 'across' ? col + i : col;
            const cell = this.grid[r][c];

            if (cell) {
                if (cell !== word[i]) return false;
                intersections++;
            } else {
                if (dir === 'across') {
                    if (r > 0 && this.grid[r - 1][c]) return false;
                    if (r < this.size - 1 && this.grid[r + 1][c]) return false;
                } else {
                    if (c > 0 && this.grid[r][c - 1]) return false;
                    if (c < this.size - 1 && this.grid[r][c + 1]) return false;
                }
            }
        }
        return intersections > 0;
    }

    _score(word, row, col, dir) {
        let s = 0;
        for (let i = 0; i < word.length; i++) {
            const r = dir === 'across' ? row : row + i;
            const c = dir === 'across' ? col + i : col;
            if (this.grid[r][c] === word[i]) s += 2;
        }
        const midR = dir === 'across' ? row : row + word.length / 2;
        const midC = dir === 'across' ? col + word.length / 2 : col;
        s -= (Math.abs(midR - this.size / 2) + Math.abs(midC - this.size / 2)) * 0.1;
        return s;
    }

    _number() {
        this.placed.sort((a, b) => a.row - b.row || a.col - b.col);
        let n = 1;
        const map = {};
        for (const w of this.placed) {
            const k = `${w.row},${w.col}`;
            if (!(k in map)) map[k] = n++;
            w.num = map[k];
        }
    }

    _trimAndPad() {
        // 1. Encontrar bounding box
        let r1 = this.size, r2 = 0, c1 = this.size, c2 = 0;
        for (let r = 0; r < this.size; r++)
            for (let c = 0; c < this.size; c++)
                if (this.grid[r][c]) {
                    r1 = Math.min(r1, r); r2 = Math.max(r2, r);
                    c1 = Math.min(c1, c); c2 = Math.max(c2, c);
                }

        // 2. Recortar al bounding box
        const trimmed = [];
        for (let r = r1; r <= r2; r++) {
            const row = [];
            for (let c = c1; c <= c2; c++) row.push(this.grid[r][c]);
            trimmed.push(row);
        }
        for (const w of this.placed) { w.row -= r1; w.col -= c1; }

        const tRows = trimmed.length;
        const tCols = trimmed[0]?.length || 0;

        // 3. Rellenar hasta tamaño fijo (centrado)
        const finalRows = Math.max(FIXED_GRID, tRows);
        const finalCols = Math.max(FIXED_GRID, tCols);
        const padTop = Math.floor((finalRows - tRows) / 2);
        const padLeft = Math.floor((finalCols - tCols) / 2);

        const finalGrid = Array.from({ length: finalRows }, () => Array(finalCols).fill(null));
        for (let r = 0; r < tRows; r++)
            for (let c = 0; c < tCols; c++)
                finalGrid[r + padTop][c + padLeft] = trimmed[r][c];

        for (const w of this.placed) {
            w.row += padTop;
            w.col += padLeft;
        }

        this.grid = finalGrid;
        this.rows = finalRows;
        this.cols = finalCols;
    }
}

// ==========================================
// Interfaz del Juego
// ==========================================

let activeGame = null;

class CrosswordGame {
    constructor(containerId, wordsData, title) {
        this.el = document.getElementById(containerId);
        this.gen = new CrosswordGenerator(wordsData);
        this.title = title;
        this.userGrid = Array.from({ length: this.gen.rows }, () => Array(this.gen.cols).fill(''));
        this.selR = -1;
        this.selC = -1;
        this.selDir = 'across';
        this.render();
    }

    render() {
        const nums = {};
        for (const w of this.gen.placed) {
            const k = `${w.row},${w.col}`;
            if (!(k in nums)) nums[k] = w.num;
        }

        let h = `<h3 class="puzzle-title">${this.title}</h3><div class="cw-layout">`;

        // Grid — usa CSS variable para el tamaño de celda
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

        // Pistas
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

        // Botones
        h += `<div class="cw-actions">
            <button class="btn-check" onclick="activeGame.check()">Verificar Respuestas</button>
            <button class="btn-hint" onclick="activeGame.hint()">Dame una Pista</button>
            <button class="btn-reveal" onclick="activeGame.reveal()">Mostrar Respuestas</button>
            <button class="btn-clear" onclick="activeGame.clear()">Borrar Todo</button>
        </div>`;

        this.el.innerHTML = h;

        // Clicks en celdas
        this.el.querySelectorAll('.cw-cell:not(.cw-blocked)').forEach(cell => {
            cell.addEventListener('click', () => {
                const r = +cell.dataset.r, c = +cell.dataset.c;
                if (this.selR === r && this.selC === c) {
                    this.selDir = this.selDir === 'across' ? 'down' : 'across';
                }
                this.selR = r;
                this.selC = c;
                this.highlight();
            });
        });

        // Clicks en pistas
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
        if (key.length === 1 && /[a-z]/i.test(key)) {
            e.preventDefault();
            this.type(key.toUpperCase());
        } else if (key === 'Backspace') {
            e.preventDefault();
            this.backspace();
        } else if (key === 'ArrowRight') { e.preventDefault(); this.move(0, 1); }
        else if (key === 'ArrowLeft') { e.preventDefault(); this.move(0, -1); }
        else if (key === 'ArrowDown') { e.preventDefault(); this.move(1, 0); }
        else if (key === 'ArrowUp') { e.preventDefault(); this.move(-1, 0); }
        else if (key === 'Tab') {
            e.preventDefault();
            this.selDir = this.selDir === 'across' ? 'down' : 'across';
            this.highlight();
        }
    }

    type(letter) {
        this.userGrid[this.selR][this.selC] = letter;
        const cell = this.getCell(this.selR, this.selC);
        if (cell) {
            cell.querySelector('.cw-letter').textContent = letter;
            cell.classList.remove('cw-ok', 'cw-err');
        }
        if (this.selDir === 'across') this.move(0, 1); else this.move(1, 0);
    }

    backspace() {
        if (this.userGrid[this.selR][this.selC]) {
            this.userGrid[this.selR][this.selC] = '';
            const cell = this.getCell(this.selR, this.selC);
            if (cell) { cell.querySelector('.cw-letter').textContent = ''; cell.classList.remove('cw-ok', 'cw-err'); }
        } else {
            const word = this.currentWord();
            if (word) {
                if (word.dir === 'across') this.move(0, -1);
                else this.move(-1, 0);
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
        const candidates = [];
        for (let r = 0; r < this.gen.rows; r++) {
            for (let c = 0; c < this.gen.cols; c++) {
                if (this.gen.grid[r][c] && this.userGrid[r][c] !== this.gen.grid[r][c]) {
                    candidates.push({ r, c });
                }
            }
        }
        if (candidates.length === 0) return;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        this.userGrid[pick.r][pick.c] = this.gen.grid[pick.r][pick.c];
        const cell = this.getCell(pick.r, pick.c);
        cell.querySelector('.cw-letter').textContent = this.gen.grid[pick.r][pick.c];
        cell.classList.add('cw-ok');
        cell.classList.remove('cw-err');
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
    }

    clear() {
        for (let r = 0; r < this.gen.rows; r++) {
            for (let c = 0; c < this.gen.cols; c++) {
                this.userGrid[r][c] = '';
                if (!this.gen.grid[r][c]) continue;
                const cell = this.getCell(r, c);
                cell.querySelector('.cw-letter').textContent = '';
                cell.classList.remove('cw-ok', 'cw-err');
            }
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

document.addEventListener('keydown', (e) => {
    if (activeGame) activeGame.handleKey(e);
});
