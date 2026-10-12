// ─────────────────────────────────────────────────────────────
//  Clientes de la agencia.
//  Para añadir o quitar clientes, edita esta lista.
//  El "id" es el Customer ID de Google Ads (los guiones dan igual,
//  se limpian automáticamente).
// ─────────────────────────────────────────────────────────────

export const CLIENTS = [
  { id: '805-245-2048', name: 'Repuestos Rosado' },
  { id: '425-828-1900', name: 'CRI' },
  { id: '653-503-8696', name: 'Aglup Motor' },
  { id: '994-380-7829', name: 'Doctor Play' },
];

export const AGENCY = {
  name: 'Aibe Technologies',
  web: 'aibetech.es',
  phone: '699 30 18 19',
  email: 'info@aibetech.es',
};

/** Devuelve el Customer ID en el formato que exige la API: solo dígitos. */
export function cleanCustomerId(id) {
  return String(id || '').replace(/\D/g, '');
}

/** Formatea un Customer ID como 123-456-7890 */
export function prettyCustomerId(id) {
  const raw = cleanCustomerId(id);
  if (raw.length !== 10) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
}
