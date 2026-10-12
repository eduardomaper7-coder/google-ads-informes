// ─────────────────────────────────────────────────────────────
//  Datos de ejemplo para probar el diseño del informe sin
//  credenciales de Google Ads.
//  Se activa poniendo GOOGLE_ADS_DEMO=1 en las variables de entorno.
// ─────────────────────────────────────────────────────────────

import { rangoMes, mesAnterior } from './googleAds';

function derivadas(t) {
  const coste = t.costeMicros / 1_000_000;
  return {
    ...t,
    impresiones: t.impresiones,
    clics: t.clics,
    coste,
    conversiones: t.conversiones,
    valorConversiones: t.valorConversiones,
    ctr: t.impresiones ? t.clics / t.impresiones : 0,
    cpcMedio: t.clics ? coste / t.clics : 0,
    tasaConversion: t.clics ? t.conversiones / t.clics : 0,
    costePorConversion: t.conversiones ? coste / t.conversiones : 0,
    valorPorConversion: t.conversiones ? t.valorConversiones / t.conversiones : 0,
    roas: coste ? t.valorConversiones / coste : 0,
    cuotaImpresiones: t.cuotaImpresiones ?? null,
  };
}

const PALABRAS = [
  'repuestos coche', 'recambios originales', 'taller mecanico cerca de mi', 'pastillas de freno precio',
  'amortiguadores delanteros', 'filtro de aceite barato', 'bateria coche 12v', 'kit distribucion',
  'neumaticos 205 55 r16', 'discos de freno ventilados', 'aceite motor 5w30', 'bujias encendido',
  'alternador coche', 'radiador motor', 'embrague completo', 'espejo retrovisor',
  'faros led homologados', 'limpiaparabrisas', 'correa auxiliar', 'bomba de agua',
  'sensor abs', 'catalizador', 'turbo reconstruido', 'inyectores diesel',
  'amortiguador trasero', 'rotula direccion', 'silentblocks', 'caja de cambios',
];

/** Cuenta de ejemplo con campañas inteligentes (sin palabras clave normales). */
function demoSmart({ customerId, year, month, rango, ant, rangoAnt }) {
  const totales = derivadas({
    impresiones: 28473, clics: 1142, costeMicros: 133140000,
    conversiones: 0, valorConversiones: 0, cuotaImpresiones: null,
  });

  const campanas = [
    { id: '1', nombre: 'Servicio Técnico PS5 Xbox', estado: 'ENABLED', canal: 'SMART', impresiones: 28425, clics: 1139, costeMicros: 125540000, conversiones: 0, valorConversiones: 0 },
    { id: '2', nombre: 'Reparación de Consolas', estado: 'ENABLED', canal: 'SMART', impresiones: 48, clics: 3, costeMicros: 7600000, conversiones: 0, valorConversiones: 0 },
  ].map(derivadas);

  const temas = [
    'reparación de videoconsolas', 'servicio técnico playstation', 'arreglar mando xbox',
    'reparar nintendo switch', 'cambio de lector blu-ray', 'reparación drift joycon',
    'servicio técnico ps5', 'limpieza interna consola', 'reparación hdmi consola',
    'tienda de videojuegos', 'recuperación de datos consola', 'sustitución de ventilador',
  ].map((texto, i) => ({
    id: `t-${i}`,
    texto,
    campana: i % 2 ? 'Reparación de Consolas' : 'Servicio Técnico PS5 Xbox',
  }));

  const terminos = [
    'reparar ps5', 'servicio tecnico playstation tenerife', 'arreglar mando ps5 drift',
    'reparacion xbox series x', 'cambiar lector ps4', 'nintendo switch no enciende',
    'limpiar ps5 polvo', 'reparacion consolas cerca de mi', 'precio reparar hdmi ps5',
    'tecnico videoconsolas', 'joycon drift reparacion', 'ps4 se apaga sola',
    'cambiar ventilador ps5', 'reparar mando xbox', 'servicio tecnico nintendo',
  ].map((texto, i) => derivadas({
    texto,
    campana: i % 3 === 0 ? 'Reparación de Consolas' : 'Servicio Técnico PS5 Xbox',
    impresiones: Math.round(6200 / (i + 1.3)) + 20,
    clics: i % 6 === 2 ? 0 : Math.max(0, Math.round((6200 / (i + 1.3)) * 0.04)),
    costeMicros: i % 4 === 1 ? 0 : (i + 1) * 1_450_000,
    conversiones: 0,
    valorConversiones: 0,
  }));

  return {
    periodo: { year, month, inicio: rango.inicio, fin: rango.fin },
    periodoAnterior: rangoAnt
      ? { year: ant.year, month: ant.month, inicio: rangoAnt.inicio, fin: rangoAnt.fin }
      : null,
    cuenta: { customerId, nombre: 'Cuenta de ejemplo (Smart)', moneda: 'EUR' },
    totales,
    totalesAnterior: null,
    campanas,
    keywords: [],
    keywordsSinActividad: [],
    smart: { temas, terminos },
    demo: true,
  };
}

export function informeDemo({ customerId, year, month, vacio = false, smart = false }) {
  const rango = rangoMes(year, month);
  const ant = mesAnterior(year, month);
  const rangoAnt = rangoMes(ant.year, ant.month);

  if (smart) return demoSmart({ customerId, year, month, rango, ant, rangoAnt });

  // GOOGLE_ADS_DEMO=vacio: cuenta sin actividad, para comprobar los "Sin datos"
  if (vacio) {
    const cero = derivadas({
      impresiones: 0, clics: 0, costeMicros: 0, conversiones: 0, valorConversiones: 0, cuotaImpresiones: null,
    });
    return {
      periodo: { year, month, inicio: rango.inicio, fin: rango.fin },
      periodoAnterior: rangoAnt
        ? { year: ant.year, month: ant.month, inicio: rangoAnt.inicio, fin: rangoAnt.fin }
        : null,
      cuenta: { customerId, nombre: 'Cuenta de ejemplo', moneda: 'EUR' },
      totales: cero,
      totalesAnterior: null,
      campanas: [],
      keywords: [],
      demo: true,
    };
  }

  const totales = derivadas({
    impresiones: 128430,
    clics: 5216,
    costeMicros: 2148300000,
    conversiones: 143.5,
    valorConversiones: 18420.4,
    cuotaImpresiones: 0.6142,
  });

  const totalesAnterior = derivadas({
    impresiones: 111280,
    clics: 4487,
    costeMicros: 1996100000,
    conversiones: 121,
    valorConversiones: 15230,
    cuotaImpresiones: 0.58,
  });

  const campanas = [
    { id: '1', nombre: 'Búsqueda · Marca', estado: 'ENABLED', canal: 'SEARCH', impresiones: 38210, clics: 2410, costeMicros: 412000000, conversiones: 61.5, valorConversiones: 8210 },
    { id: '2', nombre: 'Búsqueda · Genéricas repuestos', estado: 'ENABLED', canal: 'SEARCH', impresiones: 52140, clics: 1832, costeMicros: 986400000, conversiones: 48, valorConversiones: 6120.4 },
    { id: '3', nombre: 'Performance Max · Catálogo', estado: 'ENABLED', canal: 'PERFORMANCE_MAX', impresiones: 28960, clics: 742, costeMicros: 583900000, conversiones: 34, valorConversiones: 4090 },
    { id: '4', nombre: 'Display · Remarketing', estado: 'ENABLED', canal: 'DISPLAY', impresiones: 9120, clics: 232, costeMicros: 166000000, conversiones: 0, valorConversiones: 0 },
  ].map(derivadas);

  const keywords = PALABRAS.map((texto, i) => {
    const impresiones = Math.round(9000 / (i + 1.4)) + 40;
    const clics = i % 7 === 3 ? 0 : Math.max(0, Math.round(impresiones * (0.05 - i * 0.001)));
    const conversiones = i % 4 === 0 ? Math.round(clics * 0.05 * 10) / 10 : 0;
    return derivadas({
      id: String(i),
      texto,
      concordancia: ['EXACT', 'PHRASE', 'BROAD'][i % 3],
      estado: 'ENABLED',
      calidad: i % 9 === 0 ? null : 4 + (i % 7),
      campana: i % 2 ? 'Búsqueda · Genéricas repuestos' : 'Búsqueda · Marca',
      grupo: 'Grupo principal',
      impresiones,
      clics,
      costeMicros: clics * (350000 + i * 9000),
      conversiones,
      valorConversiones: Math.round(conversiones * 128 * 10) / 10,
    });
  });

  const sinActividad = [
    'valvula egr', 'colector de admision', 'junta de culata', 'sonda lambda',
    'bomba de direccion', 'compresor aire acondicionado', 'caudalimetro', 'volante bimasa',
    'palier delantero', 'cerradura puerta', 'elevalunas electrico', 'kit embrague valeo',
    'termostato motor', 'bobina de encendido', 'muelle suspension', 'tubo de escape',
    'deposito expansion', 'cable de bujia', 'retrovisor electrico', 'manguito radiador',
    'cojinete rueda', 'brazo suspension', 'tapa de valvulas', 'sensor de temperatura',
    'polea alternador', 'filtro de habitaculo', 'bomba de gasolina', 'disco embrague',
    'guardapolvo palier', 'soporte motor',
  ].map((texto, i) => ({
    id: `sa-${i}`,
    texto,
    concordancia: ['EXACT', 'PHRASE', 'BROAD'][i % 3],
    calidad: i % 5 === 0 ? null : 3 + (i % 8),
    campana: i % 2 ? 'Búsqueda · Genéricas repuestos' : 'Búsqueda · Marca',
    grupo: i % 3 === 0 ? 'Grupo principal' : 'Recambios generales',
  }));

  return {
    periodo: { year, month, inicio: rango.inicio, fin: rango.fin },
    periodoAnterior: rangoAnt
      ? { year: ant.year, month: ant.month, inicio: rangoAnt.inicio, fin: rangoAnt.fin }
      : null,
    cuenta: { customerId, nombre: 'Cuenta de ejemplo', moneda: 'EUR' },
    totales,
    totalesAnterior,
    campanas,
    keywords,
    keywordsSinActividad: sinActividad,
    demo: true,
  };
}
