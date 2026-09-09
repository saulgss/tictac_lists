/*
 * CONFIGURACIÓN DE FUENTES DE DATOS
 * ----------------------------------
 * Este es el único archivo que necesitas tocar para añadir o cambiar
 * las listas de tarjetas del juego. Cada fuente es un JSON accesible
 * por fetch, en uno de estos dos formatos:
 *
 *   1) Array plano de strings -> se agrupa bajo "label" como una única categoría:
 *      ["Star Wars", "Batman", "Friends"]
 *
 *   2) Objeto con varias categorías ya definidas dentro del propio JSON:
 *      { "Películas": [...], "Series": [...] }
 *
 * Para leer una lista alojada en GitHub, usa la URL "raw" del archivo, p.ej.:
 *   { label: "Series", url: "https://raw.githubusercontent.com/usuario/repo/main/series.json" }
 */
const SOURCES = [
  { label: "Cine y Cultura Pop", url: "data/timesup.json" }
];
