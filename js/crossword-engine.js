// ============================================
// CrosswordGenerator — Motor de Crucigrama
// ============================================

const FIXED_GRID = 14;

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
        this._place(first, Math.floor(this.size / 2), Math.floor((this.size - w.length) / 2), 'across');
        for (let i = 1; i < words.length; i++) this._tryPlace(words[i]);
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
                        if (score > bestScore) { bestScore = score; best = { row, col, dir }; }
                    }
                }
            }
        }
        if (best) { this._place(data, best.row, best.col, best.dir); return true; }
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
        let r1 = this.size, r2 = 0, c1 = this.size, c2 = 0;
        for (let r = 0; r < this.size; r++)
            for (let c = 0; c < this.size; c++)
                if (this.grid[r][c]) {
                    r1 = Math.min(r1, r); r2 = Math.max(r2, r);
                    c1 = Math.min(c1, c); c2 = Math.max(c2, c);
                }
        const trimmed = [];
        for (let r = r1; r <= r2; r++) {
            const row = [];
            for (let c = c1; c <= c2; c++) row.push(this.grid[r][c]);
            trimmed.push(row);
        }
        for (const w of this.placed) { w.row -= r1; w.col -= c1; }
        const tR = trimmed.length, tC = trimmed[0]?.length || 0;
        const fR = Math.max(FIXED_GRID, tR), fC = Math.max(FIXED_GRID, tC);
        const pT = Math.floor((fR - tR) / 2), pL = Math.floor((fC - tC) / 2);
        const fg = Array.from({ length: fR }, () => Array(fC).fill(null));
        for (let r = 0; r < tR; r++)
            for (let c = 0; c < tC; c++)
                fg[r + pT][c + pL] = trimmed[r][c];
        for (const w of this.placed) { w.row += pT; w.col += pL; }
        this.grid = fg;
        this.rows = fR;
        this.cols = fC;
    }
}
