#!/usr/bin/env node
// ============================================
// Build script — Generates quiz chapter pages
// Run: node build.js
// ============================================

const fs = require('fs');
const path = require('path');

const books = [
    { slug: 'genesis', name: 'Genesis', chapters: 50 },
    { slug: 'exodo', name: 'Exodo', chapters: 40 }
];

function quizPageTemplate(bookSlug, bookName, chapter, totalChapters) {
    const depth = '../../../';
    const prevChapter = chapter > 1 ? chapter - 1 : null;
    const nextChapter = chapter < totalChapters ? chapter + 1 : null;
    const prevLink = prevChapter ? `<a href="../${prevChapter}/" class="nav-btn">&larr; Capitulo ${prevChapter}</a>` : '<span></span>';
    const nextLink = nextChapter ? `<a href="../${nextChapter}/" class="nav-btn">Capitulo ${nextChapter} &rarr;</a>` : '<span></span>';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="book" content="${bookSlug}">
    <title>Capitulo ${chapter} — ${bookName} — Biblia Estudio</title>
    <link rel="stylesheet" href="${depth}css/main.css">
    <link rel="stylesheet" href="${depth}css/quiz.css">
</head>
<body>
    <header id="site-header"></header>

    <main>
        <div class="breadcrumb" id="breadcrumb"></div>

        <div id="quiz-container">
            <p>Cargando cuestionario...</p>
        </div>

        <div class="chapter-nav">
            ${prevLink}
            <a href="../" class="nav-btn">Todos los capitulos</a>
            ${nextLink}
        </div>
    </main>

    <footer id="site-footer"></footer>

    <script src="${depth}js/admin.js"></script>
    <script src="${depth}js/layout.js"></script>
    <script src="${depth}js/quiz-engine.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            renderBreadcrumb([
                { label: 'Inicio', href: '${depth}' },
                { label: '${bookName}', href: '${depth}${bookSlug}/' },
                { label: 'Cuestionarios', href: '../' },
                { label: 'Capitulo ${chapter}' }
            ]);

            const capNum = String(${chapter}).padStart(2, '0');
            fetch('${depth}data/${bookSlug}/quiz-cap-' + capNum + '.json')
                .then(r => {
                    if (!r.ok) throw new Error('Quiz not found');
                    return r.json();
                })
                .then(data => {
                    new MultipleChoiceQuiz('quiz-container', data);
                })
                .catch(err => {
                    document.getElementById('quiz-container').innerHTML =
                        '<div class="instructions"><h3>Cuestionario no disponible</h3>' +
                        '<p>Este cuestionario aun no esta disponible. Estamos trabajando en el contenido.</p></div>';
                });
        });
    </script>
</body>
</html>`;
}

// Generate pages
let created = 0;
for (const book of books) {
    for (let ch = 1; ch <= book.chapters; ch++) {
        const dir = path.join(__dirname, book.slug, 'cuestionarios', String(ch));
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, 'index.html');
        fs.writeFileSync(filePath, quizPageTemplate(book.slug, book.name, ch, book.chapters));
        created++;
    }
    console.log(`  ${book.name}: ${book.chapters} quiz pages generated`);
}

console.log(`\nDone! Created ${created} quiz pages total.`);
