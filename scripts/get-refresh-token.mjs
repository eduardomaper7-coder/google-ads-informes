/**
 * Obtiene el GOOGLE_ADS_REFRESH_TOKEN. Se ejecuta UNA sola vez, en tu ordenador.
 *
 *   1. Crea .env.local con GOOGLE_ADS_CLIENT_ID y GOOGLE_ADS_CLIENT_SECRET
 *      (credenciales OAuth de tipo "Aplicación de escritorio" en Google Cloud).
 *   2. npm run token
 *   3. Abre en el navegador la URL que aparece en la consola e inicia sesión
 *      con la cuenta de Google que tiene acceso a las cuentas de Google Ads.
 *   4. Copia el refresh token que imprime y pégalo en .env.local y en Vercel.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PUERTO = 8765;
const REDIRECT = `http://localhost:${PUERTO}`;
const SCOPE = 'https://www.googleapis.com/auth/adwords';

function cargarEnv() {
  for (const archivo of ['.env.local', '.env']) {
    const ruta = path.join(process.cwd(), archivo);
    if (!fs.existsSync(ruta)) continue;
    for (const linea of fs.readFileSync(ruta, 'utf8').split('\n')) {
      const limpio = linea.trim();
      if (!limpio || limpio.startsWith('#')) continue;
      const i = limpio.indexOf('=');
      if (i === -1) continue;
      const clave = limpio.slice(0, i).trim();
      const valor = limpio.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[clave]) process.env[clave] = valor;
    }
  }
}

cargarEnv();

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Faltan GOOGLE_ADS_CLIENT_ID y/o GOOGLE_ADS_CLIENT_SECRET en .env.local\n');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

console.log('\n──────────────────────────────────────────────────────────');
console.log(' Abre esta URL en tu navegador y autoriza el acceso:\n');
console.log(' ' + authUrl);
console.log('\n──────────────────────────────────────────────────────────\n');

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.end('Autorización cancelada. Puedes cerrar esta pestaña.');
    console.error('\n❌ Autorización cancelada:', error, '\n');
    servidor.close();
    return;
  }
  if (!code) {
    res.end('Esperando el código de autorización…');
    return;
  }

  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    });
    const data = await r.json();

    if (!data.refresh_token) {
      res.end('No se ha recibido refresh token. Revisa la consola.');
      console.error('\n❌ Respuesta de Google sin refresh_token:\n', data, '\n');
    } else {
      res.end('¡Listo! Ya puedes cerrar esta pestaña y volver a la terminal.');
      console.log('\n✅ Copia esta línea en tu .env.local y en Vercel:\n');
      console.log(`GOOGLE_ADS_REFRESH_TOKEN=${data.refresh_token}\n`);
    }
  } catch (e) {
    res.end('Error al canjear el código. Revisa la consola.');
    console.error('\n❌ Error:', e, '\n');
  } finally {
    servidor.close();
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Esperando la autorización en ${REDIRECT} …\n`);
});
