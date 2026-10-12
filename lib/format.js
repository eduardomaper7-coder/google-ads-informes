// ─────────────────────────────────────────────────────────────
//  Formateo de métricas.
//
//  REGLA PRINCIPAL DEL INFORME:
//  Nunca se muestra un 0. Si un dato es 0, nulo o no existe,
//  se escribe "Sin datos".
// ─────────────────────────────────────────────────────────────

export const SIN_DATOS = 'Sin datos';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** true si el valor debe mostrarse como "Sin datos" */
function vacio(v) {
  if (v === null || v === undefined || v === '') return true;
  const n = Number(v);
  return !Number.isFinite(n) || n === 0;
}

function nf(decimals) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    // Agrupamos siempre los miles (1.234 y no 1234)
    useGrouping: 'always',
  });
}

/** Número entero: 12.345 */
export function num(v) {
  if (vacio(v)) return SIN_DATOS;
  return nf(0).format(Number(v));
}

/** Número con decimales: 12,34 */
export function dec(v, d = 2) {
  if (vacio(v)) return SIN_DATOS;
  return nf(d).format(Number(v));
}

/** Dinero: 1.234,56 € */
export function eur(v, d = 2) {
  if (vacio(v)) return SIN_DATOS;
  return `${nf(d).format(Number(v))} €`;
}

/** Porcentaje: 4,25 %  (recibe la fracción 0-1) */
export function pct(v, d = 2) {
  if (vacio(v)) return SIN_DATOS;
  return `${nf(d).format(Number(v) * 100)} %`;
}

/** Porcentaje ya expresado en 0-100: 4,25 % */
export function pctRaw(v, d = 2) {
  if (vacio(v)) return SIN_DATOS;
  return `${nf(d).format(Number(v))} %`;
}

/** Multiplicador: 3,20x */
export function times(v, d = 2) {
  if (vacio(v)) return SIN_DATOS;
  return `${nf(d).format(Number(v))}x`;
}

/**
 * Variación respecto al mes anterior.
 * Devuelve null cuando no se puede calcular (para no pintar nada).
 */
export function variacion(actual, anterior) {
  const a = Number(actual);
  const b = Number(anterior);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  if (a === 0) return null;
  const delta = ((a - b) / b) * 100;
  if (!Number.isFinite(delta)) return null;
  return delta;
}

export function variacionTexto(delta) {
  if (delta === null || delta === undefined) return null;
  const signo = delta > 0 ? '+' : '';
  return `${signo}${nf(1).format(delta)} %`;
}

/** "agosto de 2026" */
export function nombreMes(year, month) {
  return `${MESES[month - 1]} de ${year}`;
}

/** "Agosto 2026" */
export function nombreMesCorto(year, month) {
  const m = MESES[month - 1];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
}

/** micros -> unidades monetarias */
export function fromMicros(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n / 1_000_000;
}

const MATCH_TYPES = {
  EXACT: 'Exacta',
  PHRASE: 'De frase',
  BROAD: 'Amplia',
  UNSPECIFIED: 'Sin especificar',
  UNKNOWN: 'Desconocida',
};

export function tipoConcordancia(t) {
  return MATCH_TYPES[t] || t || SIN_DATOS;
}

const ESTADOS = {
  ENABLED: 'Activa',
  PAUSED: 'Pausada',
  REMOVED: 'Eliminada',
  UNKNOWN: 'Desconocido',
  UNSPECIFIED: 'Sin especificar',
};

export function estado(s) {
  return ESTADOS[s] || s || SIN_DATOS;
}

const CANALES = {
  SEARCH: 'Búsqueda',
  DISPLAY: 'Display',
  SHOPPING: 'Shopping',
  VIDEO: 'Vídeo',
  PERFORMANCE_MAX: 'Performance Max',
  MULTI_CHANNEL: 'Multicanal',
  LOCAL: 'Local',
  SMART: 'Smart',
  DEMAND_GEN: 'Demand Gen',
  LOCAL_SERVICES: 'Servicios locales',
  TRAVEL: 'Viajes',
};

export function canal(c) {
  return CANALES[c] || c || SIN_DATOS;
}

/** Texto con la fecha de generación del informe */
export function fechaHoy() {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}
