// ─────────────────────────────────────────────────────────────
//  Cliente de la API de Google Ads (solo servidor).
//  Usa la API REST con searchStream y OAuth por refresh token.
// ─────────────────────────────────────────────────────────────

import { cleanCustomerId } from './clients';

const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const API_HOST = 'https://googleads.googleapis.com';

function version() {
  return process.env.GOOGLE_ADS_API_VERSION || 'v25';
}

export function faltanCredenciales() {
  const faltan = [];
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) faltan.push('GOOGLE_ADS_DEVELOPER_TOKEN');
  if (!process.env.GOOGLE_ADS_CLIENT_ID) faltan.push('GOOGLE_ADS_CLIENT_ID');
  if (!process.env.GOOGLE_ADS_CLIENT_SECRET) faltan.push('GOOGLE_ADS_CLIENT_SECRET');
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) faltan.push('GOOGLE_ADS_REFRESH_TOKEN');
  return faltan;
}

// Caché sencilla del access token (dura ~1h en Google, lo renovamos a los 50 min)
let tokenCache = { value: null, expiresAt: 0 };

async function getAccessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      'No se ha podido renovar el acceso a Google Ads. Revisa GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET y GOOGLE_ADS_REFRESH_TOKEN.',
      data
    );
  }

  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  return tokenCache.value;
}

export class ApiError extends Error {
  constructor(message, detalle) {
    super(message);
    this.name = 'ApiError';
    this.detalle = detalle;
  }
}

function mensajeDeError(payload) {
  try {
    const err = Array.isArray(payload) ? payload[0]?.error : payload?.error;
    const detalle = err?.details?.[0]?.errors?.[0];
    return detalle?.message || err?.message || null;
  } catch {
    return null;
  }
}

/** Ejecuta una consulta GAQL y devuelve las filas ya aplanadas. */
async function search(customerId, query) {
  const token = await getAccessToken();
  const cid = cleanCustomerId(customerId);

  const headers = {
    Authorization: `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };

  const mcc = cleanCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  if (mcc) headers['login-customer-id'] = mcc;

  const res = await fetch(
    `${API_HOST}/${version()}/customers/${cid}/googleAds:searchStream`,
    { method: 'POST', headers, body: JSON.stringify({ query }) }
  );

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = mensajeDeError(payload);
    throw new ApiError(msg || `Google Ads ha devuelto un error ${res.status}.`, payload);
  }

  const chunks = Array.isArray(payload) ? payload : [payload];
  const filas = [];
  for (const chunk of chunks) {
    if (chunk?.results) filas.push(...chunk.results);
  }
  return filas;
}

// ── Utilidades de fechas ─────────────────────────────────────

function iso(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Rango del mes indicado. El final nunca pasa de ayer (los datos de hoy son parciales). */
export function rangoMes(year, month) {
  const inicio = new Date(Date.UTC(year, month - 1, 1));
  let fin = new Date(Date.UTC(year, month, 0));
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (fin > ayer) fin = new Date(Date.UTC(ayer.getUTCFullYear(), ayer.getUTCMonth(), ayer.getUTCDate()));
  if (fin < inicio) return null; // mes futuro
  return { inicio: iso(inicio), fin: iso(fin) };
}

export function mesAnterior(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// ── Consultas ────────────────────────────────────────────────

const CAMPOS_TOTALES = [
  'customer.descriptive_name',
  'customer.currency_code',
  'metrics.impressions',
  'metrics.clicks',
  'metrics.cost_micros',
  'metrics.conversions',
  'metrics.conversions_value',
  'metrics.search_impression_share',
];

async function totalesCuenta(customerId, rango) {
  const construir = (campos) => `
    SELECT ${campos.join(', ')}
    FROM customer
    WHERE segments.date BETWEEN '${rango.inicio}' AND '${rango.fin}'`;

  let filas;
  try {
    filas = await search(customerId, construir(CAMPOS_TOTALES));
  } catch (e) {
    // search_impression_share puede no estar disponible en algunas cuentas: reintento sin ella
    const reducidos = CAMPOS_TOTALES.filter((c) => c !== 'metrics.search_impression_share');
    filas = await search(customerId, construir(reducidos));
  }

  const fila = filas[0] || {};
  const m = fila.metrics || {};
  return {
    nombreCuenta: fila.customer?.descriptiveName || null,
    moneda: fila.customer?.currencyCode || 'EUR',
    impresiones: Number(m.impressions || 0),
    clics: Number(m.clicks || 0),
    costeMicros: Number(m.costMicros || 0),
    conversiones: Number(m.conversions || 0),
    valorConversiones: Number(m.conversionsValue || 0),
    cuotaImpresiones: m.searchImpressionShare != null ? Number(m.searchImpressionShare) : null,
  };
}

async function campanas(customerId, rango) {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${rango.inicio}' AND '${rango.fin}'
      AND metrics.impressions > 0
    ORDER BY metrics.cost_micros DESC`;

  const filas = await search(customerId, query);
  return filas.map((f) => {
    const m = f.metrics || {};
    return {
      id: f.campaign?.id || null,
      nombre: f.campaign?.name || null,
      estado: f.campaign?.status || null,
      canal: f.campaign?.advertisingChannelType || null,
      impresiones: Number(m.impressions || 0),
      clics: Number(m.clicks || 0),
      costeMicros: Number(m.costMicros || 0),
      conversiones: Number(m.conversions || 0),
      valorConversiones: Number(m.conversionsValue || 0),
    };
  });
}

async function keywords(customerId, rango, limite = 500) {
  const query = `
    SELECT
      ad_group_criterion.resource_name,
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.quality_info.quality_score,
      campaign.name,
      ad_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM keyword_view
    WHERE segments.date BETWEEN '${rango.inicio}' AND '${rango.fin}'
      AND metrics.impressions > 0
    ORDER BY metrics.impressions DESC
    LIMIT ${limite}`;

  const filas = await search(customerId, query);
  return filas.map((f) => {
    const m = f.metrics || {};
    const crit = f.adGroupCriterion || {};
    return {
      id: crit.resourceName || crit.criterionId || null,
      texto: crit.keyword?.text || null,
      concordancia: crit.keyword?.matchType || null,
      estado: crit.status || null,
      calidad: crit.qualityInfo?.qualityScore ?? null,
      campana: f.campaign?.name || null,
      grupo: f.adGroup?.name || null,
      impresiones: Number(m.impressions || 0),
      clics: Number(m.clicks || 0),
      costeMicros: Number(m.costMicros || 0),
      conversiones: Number(m.conversions || 0),
      valorConversiones: Number(m.conversionsValue || 0),
    };
  });
}

/**
 * Todas las palabras clave activas de la cuenta (campaña, grupo y keyword en
 * estado "Activa"), tengan o no impresiones. Se consulta sin rango de fechas
 * porque describe la configuración actual, no el rendimiento del mes.
 */
async function keywordsActivas(customerId, limite = 500) {
  const query = `
    SELECT
      ad_group_criterion.resource_name,
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.quality_info.quality_score,
      campaign.name,
      ad_group.name
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = FALSE
      AND ad_group_criterion.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
    LIMIT ${limite}`;

  const filas = await search(customerId, query);
  return filas.map((f) => {
    const crit = f.adGroupCriterion || {};
    return {
      id: crit.resourceName || crit.criterionId || null,
      texto: crit.keyword?.text || null,
      concordancia: crit.keyword?.matchType || null,
      calidad: crit.qualityInfo?.qualityScore ?? null,
      campana: f.campaign?.name || null,
      grupo: f.adGroup?.name || null,
    };
  });
}

// ── Campañas inteligentes (Smart) ────────────────────────────
//
//  Las campañas Smart no usan palabras clave normales: se configuran con
//  "temas de palabras clave" y Google decide las búsquedas concretas.
//  Por eso keyword_view no devuelve nada en estas cuentas y hay que
//  consultar otros dos recursos.

/** Temas de palabras clave configurados en las campañas inteligentes. */
async function temasKeyword(customerId) {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign_criterion.criterion_id,
      campaign_criterion.status,
      campaign_criterion.keyword_theme.keyword_theme_constant,
      campaign_criterion.keyword_theme.free_form_keyword_theme
    FROM campaign_criterion
    WHERE campaign_criterion.type = 'KEYWORD_THEME'
      AND campaign_criterion.status = 'ENABLED'`;

  const filas = await search(customerId, query);

  const temas = filas.map((f) => {
    const tema = f.campaignCriterion?.keywordTheme || {};
    return {
      id: f.campaignCriterion?.criterionId || null,
      constante: tema.keywordThemeConstant || null,
      texto: tema.freeFormKeywordTheme || null,
      campana: f.campaign?.name || null,
    };
  });

  // Los temas del catálogo de Google llegan como identificador
  // (keywordThemeConstants/40804~0): hay que traducirlos a su nombre.
  const constantes = [...new Set(temas.map((t) => t.constante).filter(Boolean))];
  const nombres = await nombresDeTemas(customerId, constantes);

  return temas
    .map((t) => ({
      ...t,
      texto: t.texto || nombres[t.constante] || null,
    }))
    .filter((t) => t.texto)
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
}

/** Traduce los identificadores de tema a su nombre legible. */
async function nombresDeTemas(customerId, recursos) {
  const mapa = {};
  if (!recursos.length) return mapa;

  // Se consulta por tandas para no generar consultas gigantes
  for (let i = 0; i < recursos.length; i += 100) {
    const tanda = recursos.slice(i, i + 100).map((r) => `'${r}'`).join(', ');
    const query = `
      SELECT keyword_theme_constant.resource_name, keyword_theme_constant.display_name
      FROM keyword_theme_constant
      WHERE keyword_theme_constant.resource_name IN (${tanda})`;
    try {
      const filas = await search(customerId, query);
      for (const f of filas) {
        const k = f.keywordThemeConstant || {};
        if (k.resourceName) mapa[k.resourceName] = k.displayName || null;
      }
    } catch {
      // Si falla la traducción se muestran los temas de formato libre igualmente
    }
  }
  return mapa;
}

/** Búsquedas reales que activaron los anuncios de las campañas inteligentes. */
async function terminosSmart(customerId, rango, limite = 500) {
  const construir = (campos) => `
    SELECT
      smart_campaign_search_term_view.search_term,
      campaign.name,
      ${campos.join(', ')}
    FROM smart_campaign_search_term_view
    WHERE segments.date BETWEEN '${rango.inicio}' AND '${rango.fin}'
    ORDER BY metrics.impressions DESC
    LIMIT ${limite}`;

  const completos = ['metrics.impressions', 'metrics.clicks', 'metrics.cost_micros', 'metrics.conversions'];
  let filas;
  try {
    filas = await search(customerId, construir(completos));
  } catch {
    filas = await search(customerId, construir(['metrics.impressions', 'metrics.clicks']));
  }

  return filas.map((f) => {
    const m = f.metrics || {};
    return {
      texto: f.smartCampaignSearchTermView?.searchTerm || null,
      campana: f.campaign?.name || null,
      impresiones: Number(m.impressions || 0),
      clics: Number(m.clicks || 0),
      costeMicros: Number(m.costMicros || 0),
      conversiones: Number(m.conversions || 0),
      valorConversiones: 0,
    };
  });
}

// ── Cálculo de métricas derivadas ────────────────────────────

function derivadas(t) {
  const coste = (t.costeMicros || 0) / 1_000_000;
  return {
    impresiones: t.impresiones || 0,
    clics: t.clics || 0,
    coste,
    conversiones: t.conversiones || 0,
    valorConversiones: t.valorConversiones || 0,
    ctr: t.impresiones ? t.clics / t.impresiones : 0,
    cpcMedio: t.clics ? coste / t.clics : 0,
    tasaConversion: t.clics ? t.conversiones / t.clics : 0,
    costePorConversion: t.conversiones ? coste / t.conversiones : 0,
    valorPorConversion: t.conversiones ? t.valorConversiones / t.conversiones : 0,
    roas: coste ? t.valorConversiones / coste : 0,
    cuotaImpresiones: t.cuotaImpresiones ?? null,
  };
}

// ── Función principal ────────────────────────────────────────

export async function generarInforme({ customerId, year, month }) {
  const rango = rangoMes(year, month);
  if (!rango) {
    throw new ApiError('Ese mes todavía no ha empezado, no hay datos que mostrar.');
  }

  const anterior = mesAnterior(year, month);
  const rangoAnterior = rangoMes(anterior.year, anterior.month);

  const [totales, listaCampanas, listaKeywords, listaActivas, listaTemas, listaTerminos] =
    await Promise.all([
      totalesCuenta(customerId, rango),
      campanas(customerId, rango),
      keywords(customerId, rango),
      keywordsActivas(customerId).catch(() => []),
      temasKeyword(customerId).catch(() => []),
      terminosSmart(customerId, rango).catch(() => []),
    ]);

  // Keywords activas que no tuvieron ni una impresión en el mes
  const conActividad = new Set(listaKeywords.map((k) => k.id).filter(Boolean));
  const sinActividad = listaActivas
    .filter((k) => k.id && !conActividad.has(k.id))
    .sort((a, b) => (a.texto || '').localeCompare(b.texto || '', 'es'));

  let totalesAnterior = null;
  if (rangoAnterior) {
    try {
      totalesAnterior = derivadas(await totalesCuenta(customerId, rangoAnterior));
    } catch {
      totalesAnterior = null;
    }
  }

  return {
    periodo: { year, month, inicio: rango.inicio, fin: rango.fin },
    periodoAnterior: rangoAnterior
      ? { year: anterior.year, month: anterior.month, inicio: rangoAnterior.inicio, fin: rangoAnterior.fin }
      : null,
    cuenta: {
      customerId,
      nombre: totales.nombreCuenta,
      moneda: totales.moneda,
    },
    totales: derivadas(totales),
    totalesAnterior,
    campanas: listaCampanas.map((c) => ({ ...c, ...derivadas(c) })),
    keywords: listaKeywords.map((k) => ({ ...k, ...derivadas(k) })),
    keywordsSinActividad: sinActividad,
    smart: {
      temas: listaTemas,
      terminos: listaTerminos.map((t) => ({ ...t, ...derivadas(t) })),
    },
  };
}
