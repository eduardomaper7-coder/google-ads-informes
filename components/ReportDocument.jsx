'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AGENCY, prettyCustomerId } from '@/lib/clients';
import {
  SIN_DATOS,
  num,
  dec,
  eur,
  pct,
  times,
  variacion,
  variacionTexto,
  nombreMes,
  nombreMesCorto,
  tipoConcordancia,
  canal,
  fechaHoy,
} from '@/lib/format';

// Alto de una hoja A4 a 96 ppp
const ALTO_A4 = 1123;

// Valores de partida; se ajustan solos si algo se sale de la hoja
const KEYWORDS_PRIMERA = 25;
const KEYWORDS_RESTO = 28;
const SIN_ACTIVIDAD_PRIMERA = 27;
const SIN_ACTIVIDAD_RESTO = 31;
const TEMAS_PRIMERA = 27;
const TEMAS_RESTO = 31;
const TERMINOS_PRIMERA = 25;
const TERMINOS_RESTO = 28;
const CAMPANAS_POR_PAGINA = 26;
// Si hay pocas campañas, la tabla se intenta meter en la página del resumen
const CAMPANAS_EN_RESUMEN = 8;

function trozos(lista, primera, resto) {
  const partes = [];
  if (!lista.length) return partes;
  partes.push(lista.slice(0, primera));
  let i = primera;
  while (i < lista.length) {
    partes.push(lista.slice(i, i + resto));
    i += resto;
  }
  return partes;
}

/** Celda que escribe "Sin datos" en gris cuando no hay valor */
function Celda({ children, className = '' }) {
  const nulo = children === SIN_DATOS;
  return <td className={`${className}${nulo ? ' nulo' : ''}`}>{children}</td>;
}

function Kpi({ nombre, valor, delta, direccion = 'normal' }) {
  const vacio = valor === SIN_DATOS;
  let clase = 'neutro';
  let texto = null;

  if (delta !== null && delta !== undefined && direccion !== 'ninguna') {
    texto = `${variacionTexto(delta)} vs. mes anterior`;
    if (direccion === 'inversa') clase = delta > 0 ? 'baja' : 'sube';
    else clase = delta > 0 ? 'sube' : 'baja';
  } else if (delta !== null && delta !== undefined) {
    texto = `${variacionTexto(delta)} vs. mes anterior`;
    clase = 'neutro';
  }

  return (
    <div className="kpi">
      <div className="kpi-nombre">{nombre}</div>
      <div className={`kpi-valor${vacio ? ' vacio' : ''}`}>{valor}</div>
      {texto && <div className={`kpi-var ${clase}`}>{texto}</div>}
    </div>
  );
}

function Page({ children, numero, total, cliente, mesTexto, logoAgencia, portada = false, tipo }) {
  if (portada) {
    return (
      <section className="page portada" data-tipo="portada">
        {children}
      </section>
    );
  }
  return (
    <section className="page" data-tipo={tipo}>
      <div className="page-cab">
        <div className="page-cab-izq">
          {logoAgencia && <img src={logoAgencia} alt="" />}
          <div>
            <div className="page-cab-titulo">Informe mensual de Google Ads</div>
            <div className="page-cab-sub">
              {cliente} · {mesTexto}
            </div>
          </div>
        </div>
        <div className="page-cab-sub">{AGENCY.name}</div>
      </div>
      <div className="page-cuerpo">{children}</div>
      <div className="page-pie">
        <span>
          {AGENCY.name} · {AGENCY.web} · {AGENCY.phone} · {AGENCY.email}
        </span>
        <span>
          Página {numero} de {total}
        </span>
      </div>
    </section>
  );
}

function TablaCampanas({ filas, ultimo, totales }) {
  return (
    <table className="tabla">
      <thead>
        <tr>
          <th className="izq">Campaña</th>
          <th className="izq">Tipo</th>
          <th>Impr.</th>
          <th>Clics</th>
          <th>CTR</th>
          <th>CPC medio</th>
          <th>Inversión</th>
          <th>Conv.</th>
          <th>Coste/conv.</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((c) => (
          <tr key={c.id}>
            <td className="texto">{c.nombre || SIN_DATOS}</td>
            <Celda className="izq">{canal(c.canal)}</Celda>
            <Celda>{num(c.impresiones)}</Celda>
            <Celda>{num(c.clics)}</Celda>
            <Celda>{pct(c.ctr)}</Celda>
            <Celda>{eur(c.cpcMedio)}</Celda>
            <Celda>{eur(c.coste)}</Celda>
            <Celda>{dec(c.conversiones, 1)}</Celda>
            <Celda>{eur(c.costePorConversion)}</Celda>
          </tr>
        ))}
      </tbody>
      {ultimo && (
        <tfoot>
          <tr>
            <td className="izq">Total cuenta</td>
            <td className="izq">—</td>
            <Celda>{num(totales.impresiones)}</Celda>
            <Celda>{num(totales.clics)}</Celda>
            <Celda>{pct(totales.ctr)}</Celda>
            <Celda>{eur(totales.cpcMedio)}</Celda>
            <Celda>{eur(totales.coste)}</Celda>
            <Celda>{dec(totales.conversiones, 1)}</Celda>
            <Celda>{eur(totales.costePorConversion)}</Celda>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function destacadosDe(informe) {
  const items = [];
  const { totales, campanas, keywords } = informe;

  const topCampana = [...campanas].sort((a, b) => b.coste - a.coste)[0];
  if (topCampana && topCampana.coste > 0) {
    const porc = totales.coste ? (topCampana.coste / totales.coste) * 100 : 0;
    items.push(
      `La campaña con mayor inversión ha sido «${topCampana.nombre}», con ${eur(
        topCampana.coste
      )} (${dec(porc, 1)} % del total del mes).`
    );
  }

  const topKw = [...keywords].sort((a, b) => b.clics - a.clics)[0];
  if (topKw && topKw.clics > 0) {
    items.push(
      `La palabra clave que más tráfico ha traído es «${topKw.texto}», con ${num(
        topKw.clics
      )} clics y un CTR del ${pct(topKw.ctr)}.`
    );
  }

  const topConv = [...keywords]
    .filter((k) => k.conversiones > 0)
    .sort((a, b) => b.conversiones - a.conversiones)[0];
  if (topConv) {
    items.push(
      `La palabra clave que más conversiones ha generado es «${topConv.texto}», con ${dec(
        topConv.conversiones,
        1
      )} conversiones y un coste por conversión de ${eur(topConv.costePorConversion)}.`
    );
  }

  // Cuentas con campañas inteligentes: no hay keywords, se usan las búsquedas reales
  const terminos = informe.smart?.terminos || [];
  const temas = informe.smart?.temas || [];
  if (!keywords.length && terminos.length) {
    const topTermino = [...terminos].sort((a, b) => b.clics - a.clics)[0];
    if (topTermino && topTermino.clics > 0) {
      items.push(
        `La búsqueda que más tráfico ha traído es «${topTermino.texto}», con ${num(
          topTermino.clics
        )} clics y un CTR del ${pct(topTermino.ctr)}.`
      );
    }
    if (temas.length) {
      items.push(
        `La cobertura se apoya en ${num(temas.length)} temas de palabras clave, y los anuncios han aparecido en ${num(
          terminos.length
        )} búsquedas distintas durante el mes.`
      );
    }
  }

  const sinClics = keywords.filter((k) => k.impresiones > 0 && k.clics === 0).length;
  if (sinClics > 0) {
    items.push(
      `${num(sinClics)} palabras clave han recibido impresiones pero ningún clic: son las primeras candidatas a revisar o pausar.`
    );
  }

  if (!items.length) {
    items.push('No se ha registrado actividad suficiente en el periodo para destacar resultados.');
  }

  return items;
}

export default function ReportDocument({ informe, cliente, logoCliente, logoAgencia, contenedorRef }) {
  // Ajuste automático de la paginación: si una página se pasa del alto A4,
  // se reduce el número de filas hasta que todo encaja.
  const [ajuste, setAjuste] = useState({
    kwPrimera: KEYWORDS_PRIMERA,
    kwResto: KEYWORDS_RESTO,
    saPrimera: SIN_ACTIVIDAD_PRIMERA,
    saResto: SIN_ACTIVIDAD_RESTO,
    temasPrimera: TEMAS_PRIMERA,
    temasResto: TEMAS_RESTO,
    terPrimera: TERMINOS_PRIMERA,
    terResto: TERMINOS_RESTO,
    campPagina: CAMPANAS_POR_PAGINA,
    campEnResumen: true,
    pasadas: 0,
  });

  // El contenedor lo monta este componente, para que su ref ya esté puesta
  // cuando corre el useLayoutEffect que mide las páginas.
  const propioRef = useRef(null);
  const ponerRef = (nodo) => {
    propioRef.current = nodo;
    if (contenedorRef) contenedorRef.current = nodo;
  };

  const firma = informe
    ? `${informe.cuenta?.customerId}-${informe.periodo?.year}-${informe.periodo?.month}`
    : null;
  const firmaPrevia = useRef(firma);

  useEffect(() => {
    if (firmaPrevia.current !== firma) {
      firmaPrevia.current = firma;
      setAjuste({
        kwPrimera: KEYWORDS_PRIMERA,
        kwResto: KEYWORDS_RESTO,
        saPrimera: SIN_ACTIVIDAD_PRIMERA,
        saResto: SIN_ACTIVIDAD_RESTO,
        temasPrimera: TEMAS_PRIMERA,
        temasResto: TEMAS_RESTO,
        terPrimera: TERMINOS_PRIMERA,
        terResto: TERMINOS_RESTO,
        campPagina: CAMPANAS_POR_PAGINA,
        campEnResumen: true,
        pasadas: 0,
      });
    }
  }, [firma]);

  useLayoutEffect(() => {
    const nodo = propioRef.current;
    if (!nodo || ajuste.pasadas > 40) return;

    const paginas = Array.from(nodo.querySelectorAll('.page'));
    const desbordada = paginas.find((p) => p.scrollHeight > ALTO_A4 + 2);
    if (!desbordada) return;

    const tipo = desbordada.dataset.tipo;
    setAjuste((a) => {
      const siguiente = { ...a, pasadas: a.pasadas + 1 };
      if (tipo === 'resumen' && a.campEnResumen) {
        siguiente.campEnResumen = false;
      } else if (tipo === 'keywords') {
        siguiente.kwPrimera = Math.max(6, a.kwPrimera - 1);
        siguiente.kwResto = Math.max(6, a.kwResto - 1);
      } else if (tipo === 'sin-actividad') {
        siguiente.saPrimera = Math.max(6, a.saPrimera - 1);
        siguiente.saResto = Math.max(6, a.saResto - 1);
      } else if (tipo === 'temas') {
        siguiente.temasPrimera = Math.max(6, a.temasPrimera - 1);
        siguiente.temasResto = Math.max(6, a.temasResto - 1);
      } else if (tipo === 'terminos') {
        siguiente.terPrimera = Math.max(6, a.terPrimera - 1);
        siguiente.terResto = Math.max(6, a.terResto - 1);
      } else if (tipo === 'campanas') {
        siguiente.campPagina = Math.max(6, a.campPagina - 1);
      } else {
        return a;
      }
      return siguiente;
    });
  });

  if (!informe) return null;

  const { periodo, totales, totalesAnterior, campanas, keywords, cuenta } = informe;
  const sinActividad = informe.keywordsSinActividad || [];
  const temas = informe.smart?.temas || [];
  const terminos = informe.smart?.terminos || [];
  const haySmart = temas.length > 0 || terminos.length > 0;
  const mesTexto = nombreMesCorto(periodo.year, periodo.month);
  const mesLargo = nombreMes(periodo.year, periodo.month);
  const prev = totalesAnterior;

  const v = (campo) => (prev ? variacion(totales[campo], prev[campo]) : null);

  const kpis = [
    { nombre: 'Impresiones', valor: num(totales.impresiones), delta: v('impresiones'), direccion: 'normal' },
    { nombre: 'Clics', valor: num(totales.clics), delta: v('clics'), direccion: 'normal' },
    { nombre: 'CTR', valor: pct(totales.ctr), delta: v('ctr'), direccion: 'normal' },
    { nombre: 'Inversión', valor: eur(totales.coste), delta: v('coste'), direccion: 'ninguna' },
    { nombre: 'CPC medio', valor: eur(totales.cpcMedio), delta: v('cpcMedio'), direccion: 'inversa' },
    { nombre: 'Conversiones', valor: dec(totales.conversiones, 1), delta: v('conversiones'), direccion: 'normal' },
    {
      nombre: 'Coste / conversión',
      valor: eur(totales.costePorConversion),
      delta: v('costePorConversion'),
      direccion: 'inversa',
    },
    {
      nombre: 'Tasa de conversión',
      valor: pct(totales.tasaConversion),
      delta: v('tasaConversion'),
      direccion: 'normal',
    },
    {
      nombre: 'Valor de conversión',
      valor: eur(totales.valorConversiones),
      delta: v('valorConversiones'),
      direccion: 'normal',
    },
    { nombre: 'ROAS', valor: times(totales.roas), delta: v('roas'), direccion: 'normal' },
    {
      nombre: 'Cuota impr. búsqueda',
      valor: totales.cuotaImpresiones === null ? SIN_DATOS : pct(totales.cuotaImpresiones),
      delta: null,
      direccion: 'ninguna',
    },
    { nombre: 'Campañas activas', valor: num(campanas.length), delta: null, direccion: 'ninguna' },
  ];

  const campanasEnResumen =
    ajuste.campEnResumen && campanas.length > 0 && campanas.length <= CAMPANAS_EN_RESUMEN;
  const bloquesCampanas = campanasEnResumen
    ? []
    : trozos(campanas, ajuste.campPagina, ajuste.campPagina);
  const bloquesKeywords = trozos(keywords, ajuste.kwPrimera, ajuste.kwResto);
  const bloquesSinActividad = trozos(sinActividad, ajuste.saPrimera, ajuste.saResto);
  const bloquesTemas = trozos(temas, ajuste.temasPrimera, ajuste.temasResto);
  const bloquesTerminos = trozos(terminos, ajuste.terPrimera, ajuste.terResto);

  // 1 portada + 1 resumen + campañas + palabras clave / temas de campañas inteligentes
  const nCampanas = campanasEnResumen ? 0 : Math.max(bloquesCampanas.length, 1);
  // Solo se reserva la página de "sin palabras clave" si tampoco hay datos de campañas Smart
  const nKeywords = bloquesKeywords.length || (haySmart ? 0 : 1);
  const total =
    2 + nCampanas + nKeywords + bloquesSinActividad.length + bloquesTemas.length + bloquesTerminos.length;

  let n = 1;
  const paginas = [];

  // ── Portada ────────────────────────────────────────────────
  paginas.push(
    <Page key="portada" portada>
      <div className="portada-top">
        {logoAgencia ? (
          <img src={logoAgencia} alt={AGENCY.name} />
        ) : (
          <div className="agencia-nombre">{AGENCY.name}</div>
        )}
        <div className="agencia-datos">
          Informe generado el
          <br />
          <strong style={{ color: '#10151f' }}>{fechaHoy()}</strong>
        </div>
      </div>

      <div className="portada-centro">
        <div className="portada-logo-cliente">
          {logoCliente ? (
            <img src={logoCliente} alt={cliente.name} />
          ) : (
            <div style={{ fontSize: 30, fontWeight: 700, color: '#14315c' }}>{cliente.name}</div>
          )}
        </div>
        <div className="portada-kicker">Informe mensual</div>
        <h1 className="portada-titulo">
          Resultados de
          <br />
          Google Ads
        </h1>
        <div className="portada-cliente">{cliente.name}</div>
        <div className="portada-periodo">{mesLargo}</div>

        <div className="portada-meta">
          <div className="portada-meta-item">
            <span className="portada-meta-et">Cuenta</span>
            <span className="portada-meta-va">{prettyCustomerId(cuenta.customerId)}</span>
          </div>
          <div className="portada-meta-item">
            <span className="portada-meta-et">Periodo analizado</span>
            <span className="portada-meta-va">
              {periodo.inicio.split('-').reverse().join('/')} — {periodo.fin.split('-').reverse().join('/')}
            </span>
          </div>
          <div className="portada-meta-item">
            <span className="portada-meta-et">Moneda</span>
            <span className="portada-meta-va">{cuenta.moneda || 'EUR'}</span>
          </div>
        </div>
      </div>

      <div className="portada-pie">
        <div>
          <div className="agencia-nombre">{AGENCY.name}</div>
          <div style={{ fontSize: 12, color: '#6b7684' }}>Gestión de campañas de Google Ads</div>
        </div>
        <div className="agencia-datos">
          {AGENCY.web}
          <br />
          {AGENCY.phone}
          <br />
          {AGENCY.email}
        </div>
      </div>
    </Page>
  );

  // ── Resumen ────────────────────────────────────────────────
  n = 2;
  paginas.push(
    <Page key="resumen" tipo="resumen" numero={n} total={total} cliente={cliente.name} mesTexto={mesTexto} logoAgencia={logoAgencia}>
      <div className="bloque">
        <h2 className="seccion-titulo">Resumen del mes</h2>
        <p className="seccion-desc">
          Datos globales de la cuenta en {mesLargo}. La variación compara con el mes anterior.
        </p>
        <div className="kpis">
          {kpis.map((k) => (
            <Kpi key={k.nombre} {...k} />
          ))}
        </div>
      </div>

      <div className="bloque">
        <h2 className="seccion-titulo">Puntos destacados</h2>
        <div className="destacados">
          <ul>
            {destacadosDe(informe).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {campanasEnResumen && (
        <div className="bloque">
          <h2 className="seccion-titulo">Rendimiento por campaña</h2>
          <p className="seccion-desc">Campañas con actividad en {mesLargo}, ordenadas por inversión.</p>
          <TablaCampanas filas={campanas} ultimo totales={totales} />
        </div>
      )}
    </Page>
  );

  // ── Campañas ───────────────────────────────────────────────
  if (campanasEnResumen) {
    // ya se han mostrado en la página de resumen
  } else if (!bloquesCampanas.length) {
    n += 1;
    paginas.push(
      <Page key="camp-vacia" tipo="campanas" numero={n} total={total} cliente={cliente.name} mesTexto={mesTexto} logoAgencia={logoAgencia}>
        <h2 className="seccion-titulo">Rendimiento por campaña</h2>
        <p className="seccion-desc">Detalle de cada campaña activa durante el periodo.</p>
        <div className="vacio-bloque">Sin datos de campañas para este periodo.</div>
      </Page>
    );
  } else {
    bloquesCampanas.forEach((bloque, idx) => {
      n += 1;
      const ultimo = idx === bloquesCampanas.length - 1;
      paginas.push(
        <Page key={`camp-${idx}`} tipo="campanas" numero={n} total={total} cliente={cliente.name} mesTexto={mesTexto} logoAgencia={logoAgencia}>
          <h2 className="seccion-titulo">
            Rendimiento por campaña{bloquesCampanas.length > 1 ? ` (${idx + 1}/${bloquesCampanas.length})` : ''}
          </h2>
          <p className="seccion-desc">Campañas con actividad en {mesLargo}, ordenadas por inversión.</p>
          <TablaCampanas filas={bloque} ultimo={ultimo} totales={totales} />
        </Page>
      );
    });
  }

  // ── Keywords ───────────────────────────────────────────────
  if (!bloquesKeywords.length && haySmart) {
    // La cuenta usa campañas inteligentes: se listan temas y términos más abajo
  } else if (!bloquesKeywords.length) {
    n += 1;
    paginas.push(
      <Page key="kw-vacia" tipo="keywords" numero={n} total={total} cliente={cliente.name} mesTexto={mesTexto} logoAgencia={logoAgencia}>
        <h2 className="seccion-titulo">Palabras clave que estamos atacando</h2>
        <p className="seccion-desc">Palabras clave con actividad durante el periodo.</p>
        <div className="vacio-bloque">Sin datos de palabras clave para este periodo.</div>
      </Page>
    );
  } else {
    bloquesKeywords.forEach((bloque, idx) => {
      n += 1;
      paginas.push(
        <Page key={`kw-${idx}`} tipo="keywords" numero={n} total={total} cliente={cliente.name} mesTexto={mesTexto} logoAgencia={logoAgencia}>
          {idx === 0 ? (
            <>
              <h2 className="seccion-titulo">Palabras clave que estamos atacando</h2>
              <p className="seccion-desc">
                {num(keywords.length)} palabras clave con impresiones en {mesLargo}, ordenadas de mayor a menor volumen.
                «Calidad» es el nivel de calidad que Google asigna a la palabra clave (de 1 a 10).
              </p>
            </>
          ) : (
            <>
              <h2 className="seccion-titulo">
                Palabras clave ({idx + 1}/{bloquesKeywords.length})
              </h2>
              <p className="seccion-desc">Continuación del listado de palabras clave.</p>
            </>
          )}
          <table className="tabla">
            <thead>
              <tr>
                <th className="izq">Palabra clave</th>
                <th className="izq">Concordancia</th>
                <th>Calidad</th>
                <th>Impr.</th>
                <th>Clics</th>
                <th>CTR</th>
                <th>CPC medio</th>
                <th>Inversión</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {bloque.map((k, i) => (
                <tr key={k.id || `${idx}-${i}`}>
                  <td className="texto">{k.texto || SIN_DATOS}</td>
                  <Celda className="izq">{tipoConcordancia(k.concordancia)}</Celda>
                  <Celda>{k.calidad ? num(k.calidad) : SIN_DATOS}</Celda>
                  <Celda>{num(k.impresiones)}</Celda>
                  <Celda>{num(k.clics)}</Celda>
                  <Celda>{pct(k.ctr)}</Celda>
                  <Celda>{eur(k.cpcMedio)}</Celda>
                  <Celda>{eur(k.coste)}</Celda>
                  <Celda>{dec(k.conversiones, 1)}</Celda>
                </tr>
              ))}
            </tbody>
          </table>
          {idx === bloquesKeywords.length - 1 && (
            <p className="nota">
              Estas son las palabras clave que se mostraron al menos una vez en el periodo. Los valores a cero aparecen
              como «Sin datos».
              {sinActividad.length > 0 &&
                ' El resto de palabras clave activas se listan en las páginas siguientes.'}
            </p>
          )}
        </Page>
      );
    });
  }

  // ── Keywords activas sin impresiones este mes ──────────────
  bloquesSinActividad.forEach((bloque, idx) => {
    n += 1;
    paginas.push(
      <Page
        key={`sa-${idx}`}
        tipo="sin-actividad"
        numero={n}
        total={total}
        cliente={cliente.name}
        mesTexto={mesTexto}
        logoAgencia={logoAgencia}
      >
        {idx === 0 ? (
          <>
            <h2 className="seccion-titulo">Palabras clave activas sin impresiones este mes</h2>
            <p className="seccion-desc">
              {num(sinActividad.length)} palabras clave siguen activas en la cuenta pero no llegaron a mostrarse en{' '}
              {mesLargo}. Se incluyen para dejar constancia de toda la cobertura de búsqueda que tenemos configurada.
            </p>
          </>
        ) : (
          <>
            <h2 className="seccion-titulo">
              Palabras clave activas sin impresiones ({idx + 1}/{bloquesSinActividad.length})
            </h2>
            <p className="seccion-desc">Continuación del listado.</p>
          </>
        )}
        <table className="tabla">
          <thead>
            <tr>
              <th className="izq">Palabra clave</th>
              <th className="izq">Concordancia</th>
              <th className="izq">Campaña</th>
              <th className="izq">Grupo de anuncios</th>
              <th>Calidad</th>
            </tr>
          </thead>
          <tbody>
            {bloque.map((k, i) => (
              <tr key={k.id || `sa-${idx}-${i}`}>
                <td className="texto">{k.texto || SIN_DATOS}</td>
                <Celda className="izq">{tipoConcordancia(k.concordancia)}</Celda>
                <Celda className="izq corto">{k.campana || SIN_DATOS}</Celda>
                <Celda className="izq corto">{k.grupo || SIN_DATOS}</Celda>
                <Celda>{k.calidad ? num(k.calidad) : SIN_DATOS}</Celda>
              </tr>
            ))}
          </tbody>
        </table>
        {idx === bloquesSinActividad.length - 1 && (
          <p className="nota">
            No aparecen columnas de rendimiento porque en {mesLargo} no registraron ninguna impresión.
          </p>
        )}
      </Page>
    );
  });

  // ── Campañas inteligentes: temas de palabras clave ─────────
  bloquesTemas.forEach((bloque, idx) => {
    n += 1;
    paginas.push(
      <Page
        key={`temas-${idx}`}
        tipo="temas"
        numero={n}
        total={total}
        cliente={cliente.name}
        mesTexto={mesTexto}
        logoAgencia={logoAgencia}
      >
        {idx === 0 ? (
          <>
            <h2 className="seccion-titulo">Temas de palabras clave que estamos atacando</h2>
            <p className="seccion-desc">
              Esta cuenta trabaja con campañas inteligentes de Google Ads. En este formato no se configuran palabras
              clave una a una: se definen {num(temas.length)} temas de palabras clave y Google decide qué búsquedas
              concretas activan los anuncios dentro de cada tema.
            </p>
          </>
        ) : (
          <>
            <h2 className="seccion-titulo">
              Temas de palabras clave ({idx + 1}/{bloquesTemas.length})
            </h2>
            <p className="seccion-desc">Continuación del listado de temas.</p>
          </>
        )}
        <table className="tabla">
          <thead>
            <tr>
              <th className="izq">Tema de palabras clave</th>
              <th className="izq">Campaña</th>
            </tr>
          </thead>
          <tbody>
            {bloque.map((t, i) => (
              <tr key={t.id || `tema-${idx}-${i}`}>
                <td className="texto">{t.texto || SIN_DATOS}</td>
                <Celda className="izq">{t.campana || SIN_DATOS}</Celda>
              </tr>
            ))}
          </tbody>
        </table>
      </Page>
    );
  });

  // ── Campañas inteligentes: términos de búsqueda ────────────
  bloquesTerminos.forEach((bloque, idx) => {
    n += 1;
    paginas.push(
      <Page
        key={`term-${idx}`}
        tipo="terminos"
        numero={n}
        total={total}
        cliente={cliente.name}
        mesTexto={mesTexto}
        logoAgencia={logoAgencia}
      >
        {idx === 0 ? (
          <>
            <h2 className="seccion-titulo">Búsquedas que han activado los anuncios</h2>
            <p className="seccion-desc">
              {num(terminos.length)} búsquedas reales de usuarios que hicieron aparecer los anuncios en {mesLargo},
              ordenadas de mayor a menor volumen. Es el equivalente a las palabras clave en una campaña inteligente.
            </p>
          </>
        ) : (
          <>
            <h2 className="seccion-titulo">
              Búsquedas que han activado los anuncios ({idx + 1}/{bloquesTerminos.length})
            </h2>
            <p className="seccion-desc">Continuación del listado de búsquedas.</p>
          </>
        )}
        <table className="tabla">
          <thead>
            <tr>
              <th className="izq">Búsqueda</th>
              <th className="izq">Campaña</th>
              <th>Impr.</th>
              <th>Clics</th>
              <th>CTR</th>
              <th>Inversión</th>
              <th>Conv.</th>
            </tr>
          </thead>
          <tbody>
            {bloque.map((t, i) => (
              <tr key={`term-${idx}-${i}`}>
                <td className="texto">{t.texto || SIN_DATOS}</td>
                <Celda className="izq corto">{t.campana || SIN_DATOS}</Celda>
                <Celda>{num(t.impresiones)}</Celda>
                <Celda>{num(t.clics)}</Celda>
                <Celda>{pct(t.ctr)}</Celda>
                <Celda>{eur(t.coste)}</Celda>
                <Celda>{dec(t.conversiones, 1)}</Celda>
              </tr>
            ))}
          </tbody>
        </table>
        {idx === bloquesTerminos.length - 1 && (
          <p className="nota">
            Los valores a cero aparecen como «Sin datos». En campañas inteligentes Google no publica la inversión
            desglosada por búsqueda en todos los casos.
          </p>
        )}
      </Page>
    );
  });

  return (
    <div className="paginas" ref={ponerRef}>
      {paginas}
    </div>
  );
}
