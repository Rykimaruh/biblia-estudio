# Crucigrama del Libro de Exodo

Juego interactivo de crucigramas basado en el libro de Exodo de la Biblia. Contiene 16 crucigramas organizados en 4 secciones de 10 capitulos cada una.

## URLs

- **Juego (sin respuestas):** https://crucigrama-exodo.pages.dev
- **Admin (con respuestas):** https://crucigrama-exodo.pages.dev/admin.html (requiere PIN)
- **Repositorio:** https://github.com/Rykimaruh/crucigrama-exodo

## Estructura del proyecto

| Archivo | Descripcion |
|---------|-------------|
| `index.html` | Pagina principal (version sin respuestas) — landing page por defecto |
| `admin.html` | Pagina de acceso con PIN para la version completa |
| `crucigrama-exodo-sin-respuestas.html` | Version del juego sin boton "Mostrar Respuestas" |
| `crucigrama-exodo-completo.html` | Version completa con todas las funciones |
| `capitulos-1-10.html` | Datos de crucigramas (capitulos 1-10) — archivos legacy |
| `capitulos-11-20.html` | Datos de crucigramas (capitulos 11-20) — archivos legacy |
| `capitulos-21-30.html` | Datos de crucigramas (capitulos 21-30) — archivos legacy |
| `capitulos-31-40.html` | Datos de crucigramas (capitulos 31-40) — archivos legacy |
| `crossword.js` | Motor de crucigramas — archivo legacy |
| `style.css` | Estilos — archivo legacy |

## Secciones y crucigramas

- **Capitulos 1-10:** El nacimiento de Moises, la zarza ardiente, las primeras plagas
- **Capitulos 11-20:** La Pascua, el cruce del Mar Rojo, el mana, los Diez Mandamientos
- **Capitulos 21-30:** Leyes, el arca del pacto, el tabernaculo, vestiduras sacerdotales
- **Capitulos 31-40:** El becerro de oro, nuevas tablas, construccion del tabernaculo

Cada seccion tiene 4 crucigramas con 7 palabras cada uno.

## Funcionalidades

### Jugabilidad
- Haz clic en una casilla para seleccionarla (se pone amarilla)
- Escribe letras con el teclado — el cursor avanza automaticamente
- Haz clic en la misma casilla para cambiar entre horizontal y vertical
- Haz clic en cualquier pista para ir a esa palabra
- **Verificar Respuestas:** marca en verde (correctas) y rojo (incorrectas)
- **Dame una Pista:** revela una letra al azar (5 por crucigrama)
- **Borrar Todo:** limpia el crucigrama

### Compatibilidad movil y tablet
- Input oculto para activar el teclado en pantalla en dispositivos moviles
- Captura de texto via evento `input` (no solo `keydown`)
- CSS responsive con breakpoints en 900px y 500px
- Grid con scroll horizontal en pantallas pequenas

### Seguridad del admin
- PIN protegido con hash SHA-256 (Web Crypto API)
- El PIN no aparece en texto plano en el codigo fuente
- La version completa se carga en un iframe despues de verificar el PIN

## Despliegue

Hospedado en **Cloudflare Pages** usando Wrangler CLI.

```bash
# Desplegar
npx wrangler pages deploy . --project-name=crucigrama-exodo

# Cuenta de Cloudflare
# Account ID: b041abbe9de89f572b46aceb6fa16169
```

## Desarrollo local

```bash
# Servidor local
npx http-server . -p 8080 -c-1

# Abrir en navegador
# http://localhost:8080
```

## Detalles tecnicos

### Motor de crucigramas (CrosswordGenerator)
- Genera grids automaticamente a partir de listas de palabras y pistas
- Algoritmo de colocacion: ordena por longitud, coloca la primera horizontalmente, luego busca intersecciones
- Puntuacion de posicion para centrar las palabras
- Recorte y padding automatico a grid de 14x14 minimo
- Numeracion automatica de las pistas

### Correccion del cursor (commit c2dbe5c)
- **Bug:** El cursor no avanzaba al siguiente cuadro al escribir en ciertas celdas
- **Causa:** `type()` usaba `selDir` (direccion global) en vez de la direccion real de la palabra actual
- **Solucion:** `highlight()` sincroniza `selDir` con la direccion de la palabra encontrada; `type()` usa `currentWord()` para determinar la direccion de movimiento
- **Verificado:** 16 crucigramas en las 4 secciones pasan todas las pruebas

## Cuenta GitHub

Repositorio bajo la cuenta **Rykimaruh**.
