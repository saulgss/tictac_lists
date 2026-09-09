# ¡Tic-Tac! · Juego de tarjetas de cultura pop

Página web estática para jugar en grupo a un juego de adivinanzas: cada equipo tiene un turno cronometrado en el que va
describiendo tarjetas (películas, series, personajes, autores...) para
que su equipo las adivine, sin poder decir el nombre.

No usa ningún framework ni proceso de compilación: es HTML, CSS y
JavaScript planos. Las tarjetas no están escritas en el código, se
cargan en tiempo de ejecución desde uno o varios archivos JSON, para
poder añadir o cambiar listas sin tocar la lógica del juego.

## Cómo se juega

1. Se eligen las categorías activas (una o varias) y la duración del
   turno (30 / 60 / 90 segundos).
2. Se dan de alta los equipos (mínimo dos, sin límite práctico).
3. En cada turno, el equipo activo ve una tarjeta a la vez y pulsa:
   - **¡Acierto!** → suma un punto y la tarjeta se retira del mazo
     para siempre (no volverá a salir en la partida).
   - **Paso** → la tarjeta vuelve a la cola y puede reaparecer más
     tarde en el mismo turno.
4. Al acabar el tiempo se muestra el resumen del turno (aciertos y
   pasos) y pasa el turno al siguiente equipo.
5. La partida termina cuando el mazo se queda sin tarjetas. Gana el
   equipo con más puntos acumulados.

Atajos de teclado durante el turno: `→` acierto, `←` paso.

## Cómo ejecutarlo

Como el juego carga el JSON con `fetch()`, necesita servirse por
`http://`, no abrirse con doble clic (protocolo `file://`), porque los
navegadores bloquean por seguridad la lectura de archivos locales en
ese modo. Dos formas sencillas de probarlo:

- **Servidor local**: desde la carpeta del proyecto,
  ```bash
  python3 -m http.server 8000
  ```
  y abrir `http://localhost:8000/index.html`.
- **GitHub Pages** (o cualquier hosting estático): subir la carpeta tal
  cual; `index.html` es el punto de entrada.

Si aun así se abre con doble clic, la propia página lo detecta y
ofrece un selector para cargar el JSON manualmente desde el
ordenador, como alternativa de emergencia.

## Estructura del proyecto

```
tictac/
├── index.html          Estructura de la página (el "qué hay en pantalla")
├── css/
│   └── styles.css      Todo el diseño visual (el "cómo se ve")
├── js/
│   ├── config.js       Qué listas de tarjetas se cargan (el "de dónde salen los datos")
│   └── app.js          Lógica del juego (el "cómo funciona")
└── data/
    └── timesup.json    Contenido de las tarjetas (los datos en sí)
```

Cada archivo tiene una única responsabilidad, para poder cambiar una
cosa sin arriesgarse a romper las demás:

### `index.html`
Solo marcado (HTML). No contiene estilos ni lógica embebida: enlaza
`css/styles.css` con un `<link>` y carga `js/config.js` y `js/app.js`
con `<script src="...">` al final del `<body>`. El orden de esos dos
`<script>` importa: `config.js` debe ir antes que `app.js`, porque
`app.js` usa la variable `SOURCES` que define `config.js`.

### `css/styles.css`
Todo el aspecto visual: colores, tipografías, tamaños, animaciones y
los ajustes de diseño responsive (móvil, tablet, escritorio, móvil en
horizontal). Se puede rediseñar por completo sin tocar ni una línea
de `app.js`.

### `js/config.js`
El archivo que se toca para añadir o cambiar listas de tarjetas —
normalmente el único que hace falta editar en el día a día. Define el
array `SOURCES`, donde cada elemento es una fuente de datos:

```js
const SOURCES = [
  { label: "Cine y Cultura Pop", url: "data/timesup.json" }
];
```

Para añadir una lista nueva alojada en GitHub, basta con añadir otra
entrada apuntando a la URL "raw" del archivo:

```js
const SOURCES = [
  { label: "Cine y Cultura Pop", url: "data/timesup.json" },
  { label: "Series", url: "https://raw.githubusercontent.com/usuario/repo/main/series.json" }
];
```

Cada fuente puede ser:
- un **array plano** de strings (se agrupa entero bajo `label` como
  una única categoría), como `data/timesup.json`; o
- un **objeto** que ya define varias categorías dentro del propio
  JSON, por ejemplo `{ "Películas": [...], "Series": [...] }`.

### `js/app.js`
Toda la lógica del juego: carga y valida las fuentes de `config.js`,
arma y mezcla el mazo, genera los chips de categorías, controla
turnos, cronómetro, puntuación, y las transiciones entre pantallas
(carga, error, configuración, turno, partida, resultado). Solo se
toca para cambiar reglas del juego (por ejemplo, la duración por
defecto o cómo se reparten las tarjetas pasadas), no para añadir
contenido.

### `data/timesup.json`
Los datos puros: un array de strings con títulos, personajes, autores,
etc. Se puede sustituir o ampliar con nuevos archivos `.json` en la
misma carpeta (`data/series.json`, `data/musica.json`...) referenciados
desde `config.js`.

## Notas técnicas

- El mazo se mezcla al azar al empezar la partida y también al
  empezar cada turno.
- Las tarjetas repetidas dentro de una misma categoría (aunque vengan
  de fuentes distintas) se eliminan automáticamente al cargar los
  datos.
- No hay backend ni base de datos: todo el estado vive en memoria del
  navegador y se pierde al recargar la página.