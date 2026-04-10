/* ============================================
   Quiz Engine — Motor de Preguntas Biblicas
   Clase autocontenida para quizzes de
   seleccion multiple.
   ============================================ */

class QuizEngine {
    /**
     * @param {string} containerId  - ID del elemento contenedor
     * @param {object} data         - Objeto JSON del quiz
     * @param {object} [options]    - Opciones adicionales
     * @param {string} [options.prevUrl]  - URL del capitulo anterior
     * @param {string} [options.nextUrl]  - URL del capitulo siguiente
     * @param {string} [options.prevLabel] - Texto del boton anterior
     * @param {string} [options.nextLabel] - Texto del boton siguiente
     */
    constructor(containerId, data, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`QuizEngine: No se encontro el contenedor #${containerId}`);
            return;
        }

        this.data = data;
        this.options = options;
        this.questions = data.questions || [];
        this.totalQuestions = this.questions.length;
        this.answered = 0;
        this.correctCount = 0;
        this.answeredSet = new Set();
        this.isAdmin = typeof window.isAdmin === 'function' && window.isAdmin();

        this._render();
        this._bindEvents();
        this._updateProgress();

        if (this.isAdmin) {
            this._highlightCorrectAnswers();
        }
    }

    /* ------------------------------------------------
       Rendering
       ------------------------------------------------ */

    _render() {
        const html = [];

        // Progress tracker
        html.push(this._renderProgress());

        // Quiz title
        html.push(`<div class="quiz-title">${this._esc(this.data.title)} — ${this._esc(this.data.book)} ${this.data.chapter}</div>`);

        // Questions
        this.questions.forEach((q, idx) => {
            html.push(this._renderQuestion(q, idx));
        });

        // Summary (hidden initially)
        html.push(this._renderSummary());

        // Chapter navigation
        html.push(this._renderNavigation());

        this.container.innerHTML = html.join('');

        // Cache DOM references
        this.progressTextEl = this.container.querySelector('.quiz-progress-text');
        this.progressBarEl = this.container.querySelector('.quiz-progress-bar');
        this.scoreBadgeEl = this.container.querySelector('.quiz-score-badge');
        this.summaryEl = this.container.querySelector('.quiz-summary');
    }

    _renderProgress() {
        return `
        <div class="quiz-progress">
            <span class="quiz-progress-text">Pregunta 0 de ${this.totalQuestions}</span>
            <div class="quiz-progress-bar-wrap">
                <div class="quiz-progress-bar" style="width: 0%"></div>
            </div>
            <span class="quiz-score-badge">0 / ${this.totalQuestions}</span>
        </div>`;
    }

    _renderQuestion(q, idx) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const optionsHtml = q.options.map((opt, oi) => `
            <button class="quiz-option"
                    data-question="${idx}"
                    data-option="${oi}"
                    type="button"
                    aria-label="Opcion ${letters[oi]}: ${this._esc(opt)}">
                <span class="quiz-option-letter">${letters[oi]}</span>
                <span class="quiz-option-text">${this._esc(opt)}</span>
                <span class="quiz-option-icon" aria-hidden="true"></span>
            </button>`
        ).join('');

        return `
        <div class="quiz-question-block" data-question-block="${idx}" id="quiz-q-${idx}">
            <div class="quiz-question-number">Pregunta ${idx + 1} de ${this.totalQuestions}</div>
            <div class="quiz-question-text">${this._esc(q.question)}</div>
            <div class="quiz-options">
                ${optionsHtml}
            </div>
            <div class="quiz-explanation" data-explanation="${idx}">
                <div class="quiz-explanation-text"></div>
                <span class="quiz-explanation-verse"></span>
            </div>
        </div>`;
    }

    _renderSummary() {
        return `
        <div class="quiz-summary">
            <div class="quiz-summary-title">Resultado del Quiz</div>
            <div class="quiz-summary-score"></div>
            <div class="quiz-summary-message"></div>
            <div class="quiz-summary-details">
                <div class="quiz-summary-stat">
                    <span class="quiz-summary-stat-value stat-correct" data-stat="correct">0</span>
                    <span class="quiz-summary-stat-label">Correctas</span>
                </div>
                <div class="quiz-summary-stat">
                    <span class="quiz-summary-stat-value stat-incorrect" data-stat="incorrect">0</span>
                    <span class="quiz-summary-stat-label">Incorrectas</span>
                </div>
            </div>
            <button class="quiz-reset-btn" type="button">Intentar de Nuevo</button>
        </div>`;
    }

    _renderNavigation() {
        const prevUrl = this.options.prevUrl || null;
        const nextUrl = this.options.nextUrl || null;
        const prevLabel = this.options.prevLabel || 'Anterior';
        const nextLabel = this.options.nextLabel || 'Siguiente';

        const prevBtn = prevUrl
            ? `<a href="${this._esc(prevUrl)}" class="quiz-nav-btn"><span class="arrow-prev"></span>${this._esc(prevLabel)}</a>`
            : `<span class="quiz-nav-btn disabled"><span class="arrow-prev"></span>${this._esc(prevLabel)}</span>`;

        const nextBtn = nextUrl
            ? `<a href="${this._esc(nextUrl)}" class="quiz-nav-btn">${this._esc(nextLabel)}<span class="arrow-next"></span></a>`
            : `<span class="quiz-nav-btn disabled">${this._esc(nextLabel)}<span class="arrow-next"></span></span>`;

        return `
        <div class="quiz-chapter-nav">
            ${prevBtn}
            ${nextBtn}
        </div>`;
    }

    /* ------------------------------------------------
       Event Handling
       ------------------------------------------------ */

    _bindEvents() {
        // Delegate click events from the container
        this.container.addEventListener('click', (e) => {
            const optionBtn = e.target.closest('.quiz-option');
            if (optionBtn && !optionBtn.classList.contains('disabled')) {
                this._handleAnswer(optionBtn);
            }

            const resetBtn = e.target.closest('.quiz-reset-btn');
            if (resetBtn) {
                this.reset();
            }
        });
    }

    _handleAnswer(optionEl) {
        const questionIdx = parseInt(optionEl.dataset.question, 10);
        const optionIdx = parseInt(optionEl.dataset.option, 10);
        const question = this.questions[questionIdx];

        // Prevent re-answering
        if (this.answeredSet.has(questionIdx)) return;
        this.answeredSet.add(questionIdx);
        this.answered++;

        const questionBlock = this.container.querySelector(`[data-question-block="${questionIdx}"]`);
        const allOptions = questionBlock.querySelectorAll('.quiz-option');
        const correctIdx = question.correctIndex;
        const isCorrect = optionIdx === correctIdx;

        if (isCorrect) {
            this.correctCount++;
        }

        // Mark all options as disabled
        allOptions.forEach((opt, oi) => {
            opt.classList.add('disabled');

            if (oi === correctIdx) {
                // Always show the correct answer
                opt.classList.add('correct');
                opt.querySelector('.quiz-option-icon').textContent = '\u2713';
            }

            if (oi === optionIdx && !isCorrect) {
                // Mark the user's wrong choice
                opt.classList.add('incorrect');
                opt.querySelector('.quiz-option-icon').textContent = '\u2717';
            }
        });

        // Update question block border
        questionBlock.classList.add(isCorrect ? 'answered-correct' : 'answered-incorrect');

        // Show explanation
        const explanationEl = this.container.querySelector(`[data-explanation="${questionIdx}"]`);
        explanationEl.querySelector('.quiz-explanation-text').textContent = question.explanation;
        explanationEl.querySelector('.quiz-explanation-verse').textContent = question.verse;
        explanationEl.classList.add('visible');
        if (!isCorrect) {
            explanationEl.classList.add('incorrect-explanation');
        }

        // Update progress
        this._updateProgress();

        // Check if quiz is complete
        if (this.answered === this.totalQuestions) {
            this._showSummary();
        }
    }

    /* ------------------------------------------------
       Progress & Summary
       ------------------------------------------------ */

    _updateProgress() {
        if (!this.progressTextEl) return;

        const pct = this.totalQuestions > 0
            ? Math.round((this.answered / this.totalQuestions) * 100)
            : 0;

        this.progressTextEl.textContent = `Pregunta ${this.answered} de ${this.totalQuestions}`;
        this.progressBarEl.style.width = `${pct}%`;
        this.scoreBadgeEl.textContent = `${this.correctCount} / ${this.totalQuestions}`;
    }

    _showSummary() {
        const incorrectCount = this.totalQuestions - this.correctCount;
        const pct = this.totalQuestions > 0
            ? Math.round((this.correctCount / this.totalQuestions) * 100)
            : 0;

        const scoreEl = this.summaryEl.querySelector('.quiz-summary-score');
        scoreEl.textContent = `${this.correctCount} / ${this.totalQuestions}`;

        if (this.correctCount === this.totalQuestions) {
            scoreEl.classList.add('perfect');
        }

        // Message based on score
        const messageEl = this.summaryEl.querySelector('.quiz-summary-message');
        messageEl.textContent = this._getSummaryMessage(pct);

        // Stats
        this.summaryEl.querySelector('[data-stat="correct"]').textContent = this.correctCount;
        this.summaryEl.querySelector('[data-stat="incorrect"]').textContent = incorrectCount;

        // Show the summary card
        this.summaryEl.classList.add('visible');

        // Scroll summary into view
        setTimeout(() => {
            this.summaryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    _getSummaryMessage(pct) {
        if (pct === 100) {
            return '\u00a1Perfecto! Has respondido todas las preguntas correctamente. \u00a1Excelente conocimiento biblico!';
        } else if (pct >= 80) {
            return '\u00a1Muy bien! Tienes un gran conocimiento de este capitulo. Sigue estudiando para alcanzar la perfeccion.';
        } else if (pct >= 60) {
            return '\u00a1Buen trabajo! Conoces bastante bien este capitulo. Repasa los versiculos que fallaste.';
        } else if (pct >= 40) {
            return 'Tienes un conocimiento basico de este capitulo. Te recomendamos releer el texto y volver a intentarlo.';
        } else {
            return 'Este capitulo necesita mas estudio. Lee el texto con atencion y vuelve a intentar el quiz.';
        }
    }

    /* ------------------------------------------------
       Admin Mode
       ------------------------------------------------ */

    _highlightCorrectAnswers() {
        this.questions.forEach((q, idx) => {
            const questionBlock = this.container.querySelector(`[data-question-block="${idx}"]`);
            if (!questionBlock) return;
            const options = questionBlock.querySelectorAll('.quiz-option');
            if (options[q.correctIndex]) {
                options[q.correctIndex].classList.add('admin-correct');
            }
        });
    }

    /* ------------------------------------------------
       Public Methods
       ------------------------------------------------ */

    /**
     * Reset the quiz to its initial state.
     */
    reset() {
        this.answered = 0;
        this.correctCount = 0;
        this.answeredSet.clear();

        // Re-render everything
        this._render();
        this._bindEvents();
        this._updateProgress();

        if (this.isAdmin) {
            this._highlightCorrectAnswers();
        }

        // Scroll to top of quiz
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Get current quiz state.
     * @returns {object}
     */
    getState() {
        return {
            answered: this.answered,
            total: this.totalQuestions,
            correct: this.correctCount,
            incorrect: this.answered - this.correctCount,
            complete: this.answered === this.totalQuestions,
            percentage: this.totalQuestions > 0
                ? Math.round((this.correctCount / this.totalQuestions) * 100)
                : 0
        };
    }

    /* ------------------------------------------------
       Utilities
       ------------------------------------------------ */

    _esc(str) {
        if (typeof str !== 'string') return str;
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Alias for backward compatibility with generated quiz pages
const MultipleChoiceQuiz = QuizEngine;
