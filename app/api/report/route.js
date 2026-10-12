import { NextResponse } from 'next/server';
import { CLIENTS, cleanCustomerId } from '@/lib/clients';
import { generarInforme, faltanCredenciales, ApiError } from '@/lib/googleAds';
import { informeDemo } from '@/lib/demo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Petición no válida.' }, { status: 400 });
  }

  const { customerId, year, month, password } = body || {};

  // Contraseña opcional (recomendada, la app se despliega en una URL pública)
  const esperada = process.env.APP_PASSWORD;
  if (esperada && password !== esperada) {
    return NextResponse.json(
      { error: 'Contraseña incorrecta.', codigo: 'AUTH' },
      { status: 401 }
    );
  }

  const y0 = Number(year);
  const m0 = Number(month);
  if (!Number.isInteger(y0) || !Number.isInteger(m0) || m0 < 1 || m0 > 12) {
    return NextResponse.json({ error: 'Mes o año no válidos.' }, { status: 400 });
  }

  const permitido = CLIENTS.some(
    (c) => cleanCustomerId(c.id) === cleanCustomerId(customerId)
  );
  if (!permitido) {
    return NextResponse.json(
      { error: 'Ese cliente no está en la lista. Añádelo en lib/clients.js.' },
      { status: 400 }
    );
  }

  // Modo demostración: datos de ejemplo para ver el diseño sin credenciales
  // GOOGLE_ADS_DEMO=1     -> cuenta con actividad y palabras clave
  // GOOGLE_ADS_DEMO=smart -> cuenta con campañas inteligentes (temas y búsquedas)
  // GOOGLE_ADS_DEMO=vacio -> cuenta sin actividad (para revisar los "Sin datos")
  const demo = process.env.GOOGLE_ADS_DEMO;
  if (demo === '1' || demo === 'vacio' || demo === 'smart') {
    return NextResponse.json(
      informeDemo({
        customerId,
        year: y0,
        month: m0,
        vacio: demo === 'vacio',
        smart: demo === 'smart',
      })
    );
  }

  const faltan = faltanCredenciales();
  if (faltan.length) {
    return NextResponse.json(
      {
        error:
          'Faltan variables de entorno en el servidor: ' +
          faltan.join(', ') +
          '. Añádelas en Vercel > Settings > Environment Variables.',
      },
      { status: 500 }
    );
  }

  try {
    const informe = await generarInforme({ customerId, year: y0, month: m0 });
    return NextResponse.json(informe);
  } catch (e) {
    const mensaje =
      e instanceof ApiError
        ? e.message
        : 'No se ha podido conectar con Google Ads. Inténtalo de nuevo en unos minutos.';
    console.error('[informe]', e);
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
