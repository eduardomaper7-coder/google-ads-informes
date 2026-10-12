'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CLIENTS, AGENCY, cleanCustomerId } from '@/lib/clients';
import { nombreMesCorto } from '@/lib/format';
import ReportDocument from '@/components/ReportDocument';

const LOGOS_KEY = 'aibe.logos.v1';
const PASS_KEY = 'aibe.pass';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Reduce la imagen y la convierte en data URL para poder guardarla en el navegador */
function procesarLogo(file, maxAncho = 700) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se ha podido leer el archivo.'));
    lector.onload = () => {
      const src = String(lector.result);
      // Los SVG se guardan tal cual
      if (file.type === 'image/svg+xml') return resolve(src);

      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const escala = Math.min(1, maxAncho / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = src;
    };
    lector.readAsDataURL(file);
  });
}

function SubirLogo({ etiqueta, valor, onCambio, onBorrar }) {
  return (
    <div className="logo-item">
      <div className="logo-nombre">{etiqueta}</div>
      <div className="logo-preview">
        {valor ? <img src={valor} alt={etiqueta} /> : <span>Sin logo</span>}
      </div>
      <div className="logo-acciones">
        <label className="file-btn">
          <span>{valor ? 'Cambiar' : 'Subir logo'}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCambio(f);
              e.target.value = '';
            }}
          />
        </label>
        {valor && (
          <button type="button" className="btn btn-suave btn-mini" onClick={onBorrar}>
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const hoy = new Date();
  const mesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

  const [clienteId, setClienteId] = useState(CLIENTS[0].id);
  const [year, setYear] = useState(mesPasado.getFullYear());
  const [month, setMonth] = useState(mesPasado.getMonth() + 1);

  const [logos, setLogos] = useState({});
  const [logosCargados, setLogosCargados] = useState(false);

  const [informe, setInforme] = useState(null);
  const [informeDe, setInformeDe] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [descargando, setDescargando] = useState(false);

  const [password, setPassword] = useState('');
  const [pidePassword, setPidePassword] = useState(false);

  const docRef = useRef(null);

  // Carga de logos y contraseña guardados
  useEffect(() => {
    try {
      const guardados = localStorage.getItem(LOGOS_KEY);
      if (guardados) setLogos(JSON.parse(guardados));
    } catch {}
    try {
      const p = sessionStorage.getItem(PASS_KEY);
      if (p) setPassword(p);
    } catch {}
    setLogosCargados(true);
  }, []);

  useEffect(() => {
    if (!logosCargados) return;
    try {
      localStorage.setItem(LOGOS_KEY, JSON.stringify(logos));
    } catch {
      setError(
        'No se han podido guardar los logos en el navegador (espacio agotado). Prueba con imágenes más pequeñas.'
      );
    }
  }, [logos, logosCargados]);

  const cliente = useMemo(
    () => CLIENTS.find((c) => c.id === clienteId) || CLIENTS[0],
    [clienteId]
  );

  const years = useMemo(() => {
    const actual = hoy.getFullYear();
    return [actual, actual - 1, actual - 2];
  }, [hoy.getFullYear()]);

  const mesFuturo =
    year > hoy.getFullYear() ||
    (year === hoy.getFullYear() && month > hoy.getMonth() + 1);

  async function guardarLogo(clave, file) {
    setError(null);
    try {
      const dataUrl = await procesarLogo(file);
      setLogos((prev) => ({ ...prev, [clave]: dataUrl }));
    } catch (e) {
      setError(e.message);
    }
  }

  function borrarLogo(clave) {
    setLogos((prev) => {
      const copia = { ...prev };
      delete copia[clave];
      return copia;
    });
  }

  async function generar(pass = password) {
    setCargando(true);
    setError(null);
    setInforme(null);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: cliente.id, year, month, password: pass }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data?.codigo === 'AUTH') {
          setPidePassword(true);
          setError(null);
        } else {
          setError(data?.error || 'No se ha podido generar el informe.');
        }
        return;
      }

      setPidePassword(false);
      setInforme(data);
      setInformeDe({ cliente, year, month });
      try {
        sessionStorage.setItem(PASS_KEY, pass || '');
      } catch {}
    } catch {
      setError('Error de conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  async function descargarPdf() {
    if (!docRef.current || !informeDe) return;
    setDescargando(true);
    setError(null);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const paginas = docRef.current.querySelectorAll('.page');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      for (let i = 0; i < paginas.length; i += 1) {
        const canvas = await html2canvas(paginas[i], {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: 794,
        });
        const img = canvas.toDataURL('image/jpeg', 0.94);
        const alto = Math.min(297, (canvas.height / canvas.width) * 210);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, 'JPEG', 0, 0, 210, alto, undefined, 'FAST');
      }

      const nombre = `Informe Google Ads - ${informeDe.cliente.name} - ${nombreMesCorto(
        informeDe.year,
        informeDe.month
      )}.pdf`;
      pdf.save(nombre);
    } catch (e) {
      setError('No se ha podido generar el PDF. Vuelve a intentarlo.');
    } finally {
      setDescargando(false);
    }
  }

  // ── Pantalla de contraseña ────────────────────────────────
  if (pidePassword) {
    return (
      <div className="app">
        <form
          className="acceso"
          onSubmit={(e) => {
            e.preventDefault();
            generar(password);
          }}
        >
          <h1>Acceso</h1>
          <p>Introduce la contraseña de la herramienta de informes.</p>
          <label htmlFor="pass">Contraseña</label>
          <input
            id="pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className="btn" type="submit" disabled={cargando}>
            {cargando ? 'Comprobando…' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="marca-chip">
          {logos.agencia && <img src={logos.agencia} alt={AGENCY.name} />}
          <div>
            <h1>Informes mensuales de Google Ads</h1>
            <p>
              {AGENCY.name} · {AGENCY.web} · {AGENCY.phone} · {AGENCY.email}
            </p>
          </div>
        </div>
      </header>

      <section className="panel">
        <h2>1 · Elige cliente y mes</h2>
        <div className="grid-form">
          <div>
            <label htmlFor="cliente">Cliente</label>
            <select id="cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {CLIENTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mes">Mes</label>
            <select id="mes" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="anio">Año</label>
            <select id="anio" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn" onClick={() => generar()} disabled={cargando || mesFuturo}>
              {cargando ? 'Consultando Google Ads…' : 'Generar informe'}
            </button>
          </div>
        </div>

        {mesFuturo && (
          <div className="aviso aviso-info">Ese mes todavía no ha terminado de empezar: elige un mes pasado.</div>
        )}
        {error && <div className="aviso aviso-error">{error}</div>}
      </section>

      <section className="panel">
        <h2>2 · Logos</h2>
        <div className="logos-lista">
          <SubirLogo
            etiqueta={`${AGENCY.name} (agencia)`}
            valor={logos.agencia}
            onCambio={(f) => guardarLogo('agencia', f)}
            onBorrar={() => borrarLogo('agencia')}
          />
          {CLIENTS.map((c) => {
            const clave = cleanCustomerId(c.id);
            return (
              <SubirLogo
                key={c.id}
                etiqueta={c.name}
                valor={logos[clave]}
                onCambio={(f) => guardarLogo(clave, f)}
                onBorrar={() => borrarLogo(clave)}
              />
            );
          })}
        </div>
        <p className="nota" style={{ color: '#6b7684', fontSize: 12 }}>
          Los logos se guardan en este navegador, así que solo hay que subirlos una vez. Formato recomendado: PNG con
          fondo transparente.
        </p>
      </section>

      {informe && informeDe && (
        <section className="previa">
          <div className="previa-cab">
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#10151f' }}>
                {informeDe.cliente.name} · {nombreMesCorto(informeDe.year, informeDe.month)}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7684' }}>
                Vista previa del informe. Descárgalo en PDF cuando esté listo.
              </p>
            </div>
            <button className="btn btn-acento" onClick={descargarPdf} disabled={descargando}>
              {descargando ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
          </div>

          <div className="previa-scroll">
            <ReportDocument
              informe={informe}
              contenedorRef={docRef}
              cliente={informeDe.cliente}
              logoCliente={logos[cleanCustomerId(informeDe.cliente.id)]}
              logoAgencia={logos.agencia}
            />
          </div>
        </section>
      )}
    </div>
  );
}
