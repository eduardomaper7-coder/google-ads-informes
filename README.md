# Informes mensuales de Google Ads — Aibe Technologies

Herramienta web para generar y **descargar en PDF** el informe mensual de Google Ads
de cada cliente, con el logo del negocio y el de la agencia.

No es un panel: eliges cliente y mes, se consulta la API de Google Ads y te descargas el PDF.

---

## Qué incluye el informe

**Portada** con el logo del cliente, el de Aibe Technologies, el mes y los datos de contacto.

**Resumen del mes** con 12 métricas, cada una comparada con el mes anterior:

| | |
|---|---|
| Impresiones | Clics |
| CTR | Inversión |
| CPC medio | Conversiones |
| Coste por conversión | Tasa de conversión |
| Valor de conversión | ROAS |
| Cuota de impresiones en búsqueda | Campañas activas |

**Puntos destacados**: campaña con más inversión, keyword con más tráfico, keyword con más
conversiones y número de keywords con impresiones pero sin clics.

**Rendimiento por campaña**: impresiones, clics, CTR, CPC medio, inversión, conversiones y
coste por conversión de cada campaña, con la fila de totales de la cuenta.

**Palabras clave que estamos atacando**, en dos tablas:

1. *Con actividad*: las que se mostraron al menos una vez en el mes, con concordancia, nivel de
   calidad, impresiones, clics, CTR, CPC medio, inversión y conversiones.
2. *Activas sin impresiones este mes*: el resto de palabras clave activas de la cuenta
   (campaña, grupo y keyword en estado "Activa"), con su campaña, grupo y nivel de calidad.
   Sirven para enseñar al cliente toda la cobertura de búsqueda configurada.

El tope es de 500 palabras clave por tabla.

**Campañas inteligentes (Smart)**: estas campañas no usan palabras clave una a una, así que en
esas cuentas el informe muestra en su lugar:

1. *Temas de palabras clave que estamos atacando*: los temas configurados en cada campaña.
2. *Búsquedas que han activado los anuncios*: las búsquedas reales de usuarios del mes, con
   impresiones, clics, CTR, inversión y conversiones.

El informe detecta solo qué tipo de cuenta es; no hay que configurar nada.

> En todo el informe, cualquier dato que sea 0 o no exista se escribe **«Sin datos»**,
> nunca un cero.

---

## Puesta en marcha

### 1. Requisitos en Google

Necesitas tres cosas, todas de la misma cuenta de Google que gestiona las cuentas de los clientes:

**a) Token de desarrollador**
En tu cuenta administrador (MCC) de Google Ads: *Herramientas y configuración → Configuración →
Centro de API*. Solicítalo si no lo tienes. Hasta que Google lo apruebe con acceso básico,
el token solo funciona contra cuentas de prueba.

**b) Credenciales OAuth — paso a paso**

Todo se hace en [console.cloud.google.com](https://console.cloud.google.com/) con la **misma
cuenta de Google que tiene acceso a las cuentas de Google Ads de los clientes**.

**b.1 · Crear el proyecto**

1. Arriba a la izquierda, en el selector de proyectos → **Proyecto nuevo**.
2. Nombre: `Informes Google Ads`. → **Crear**.
3. Espera unos segundos y asegúrate de que ese proyecto queda seleccionado arriba.

**b.2 · Activar la Google Ads API**

1. Menú ☰ → **APIs y servicios → Biblioteca**.
2. Busca `Google Ads API`.
3. Ábrela y pulsa **Habilitar**.

**b.3 · Configurar la pantalla de consentimiento**

En el menú ☰ ahora aparece **Google Auth Platform** (antes se llamaba "Pantalla de
consentimiento de OAuth"). Entra y pulsa **Comenzar**:

1. **Información de la app**: nombre `Informes Aibe` y tu correo de asistencia.
2. **Público / Audiencia**: **Externo**.
   (La opción "Interno" solo existe si usas Google Workspace; con Gmail no aparece.)
3. **Datos de contacto**: tu correo.
4. Acepta las condiciones → **Crear**.

**b.4 · Publicar la app — no te saltes este paso**

Dentro de *Google Auth Platform → Audiencia*, verás el estado de publicación:

- Si se queda en **Prueba / Testing**, el refresh token **caduca a los 7 días** y los
  informes dejan de funcionar solos.
- Pulsa **Publicar app** para pasar a **En producción**. Al autorizar más adelante,
  Google mostrará un aviso de "app no verificada": pulsa *Configuración avanzada →
  Ir a Informes Aibe (no seguro)*. Es normal, la app es tuya y solo la usas tú.

Alternativa si prefieres no publicar: déjala en Prueba, añádete en **Usuarios de prueba**,
y asume que hay que volver a ejecutar `npm run token` cada semana. No lo recomiendo.

**b.5 · Crear el cliente OAuth de escritorio**

1. *Google Auth Platform → **Clientes*** → **Crear cliente**.
2. **Tipo de aplicación**: `Aplicación de escritorio`.
3. Nombre: `Informes Aibe (escritorio)` → **Crear**.
4. Se abre una ventana con el **ID de cliente** y el **Secreto de cliente**.
   Cópialos: son los que van en `.env.local`.

> El tipo "Aplicación de escritorio" es importante: permite la redirección a
> `http://localhost`, que es la que usa el script `npm run token`. Con un cliente de
> tipo "Aplicación web" el script fallaría.

**c) Refresh token**
Se saca una sola vez desde tu ordenador (ver paso 3).

### 2. Instalar el proyecto

Abre una terminal en la carpeta del proyecto (en Windows: clic derecho en la carpeta →
*Abrir en Terminal*, o `cd "C:\google ads"` desde PowerShell) y ejecuta:

```bash
npm install
```

Tarda menos de un minuto. Solo hay que hacerlo una vez.

Ahora crea el archivo de credenciales. En la misma terminal (PowerShell):

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Rellena al menos estas tres líneas con el token de desarrollador y las credenciales
del paso b.5, y guarda:

```
GOOGLE_ADS_DEVELOPER_TOKEN=mDoi8Fnm44RwuXvVJy4ZRQ
GOOGLE_ADS_CLIENT_ID=1234567890-xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
```

> `.env.local` está en `.gitignore`, así que nunca se sube a GitHub. Es justo donde
> deben vivir estas claves.

### 3. Obtener el refresh token

En la misma terminal:

```bash
npm run token
```

Verás algo así:

```
──────────────────────────────────────────────────────────
 Abre esta URL en tu navegador y autoriza el acceso:

 https://accounts.google.com/o/oauth2/v2/auth?client_id=...
──────────────────────────────────────────────────────────
Esperando la autorización en http://localhost:8765 …
```

1. Copia esa URL y ábrela en el navegador.
2. Inicia sesión con la cuenta de Google que gestiona las cuentas de Google Ads.
3. Si sale el aviso de app no verificada: *Configuración avanzada → Ir a … (no seguro)*.
4. Acepta el permiso de **Google Ads**.
5. El navegador dirá "¡Listo!" y en la terminal aparecerá:

```
✅ Copia esta línea en tu .env.local y en Vercel:

GOOGLE_ADS_REFRESH_TOKEN=1//0gxxxxxxxxxxxxxxxxxxxx
```

Pega esa línea en `.env.local`.

**Si algo falla:**

| Mensaje | Qué pasa |
|---|---|
| `redirect_uri_mismatch` | El cliente OAuth no es de tipo "Aplicación de escritorio". Crea uno nuevo con ese tipo. |
| `access_blocked` / app no verificada sin opción de continuar | Añádete como usuario de prueba en *Audiencia*, o publica la app (paso b.4). |
| No aparece `refresh_token` en la respuesta | Ya habías autorizado antes. Entra en [myaccount.google.com/permissions](https://myaccount.google.com/permissions), quita el acceso a la app y vuelve a ejecutar `npm run token`. |
| El puerto 8765 está ocupado | Cierra lo que lo esté usando, o cambia `const PUERTO` en `scripts/get-refresh-token.mjs`. |

### 4. Completar las variables

En `.env.local` deben quedar rellenas las cinco:

```
GOOGLE_ADS_DEVELOPER_TOKEN=mDoi8Fnm44RwuXvVJy4ZRQ
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890   # tu MCC, solo dígitos
APP_PASSWORD=la-que-quieras               # protege la URL pública
```

El `GOOGLE_ADS_LOGIN_CUSTOMER_ID` es el ID de tu cuenta administradora (MCC), el que sale
arriba a la derecha en Google Ads cuando estás en la cuenta de administración. Sin guiones.

### 5. Probar en local

```bash
npm run dev
```

Abre http://localhost:3000

---

## Subir a GitHub y desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
   **Importante:** `.env.local` no debe subirse (ya está en `.gitignore`).
2. En [vercel.com](https://vercel.com) → *Add New → Project* → importa el repositorio.
3. Antes de desplegar, en *Environment Variables*, añade **las mismas variables** del
   apartado anterior (sin `.env.local`, una a una).
4. Deploy.

Cada vez que hagas `git push`, Vercel vuelve a desplegar solo.

Si cambias una variable de entorno en Vercel, hay que **volver a desplegar** para que surta efecto.

---

## Uso diario

1. Abre la URL de Vercel e introduce la contraseña (`APP_PASSWORD`).
2. **Sube los logos una vez**: el de Aibe Technologies y el de cada cliente.
   Se guardan en el navegador, así que no hay que volver a subirlos.
   Formato recomendado: PNG con fondo transparente.
3. Elige cliente y mes → **Generar informe**.
4. Revisa la vista previa → **Descargar PDF**.

El archivo se descarga como
`Informe Google Ads - Repuestos Rosado - Agosto 2026.pdf`.

> Los logos viven en el navegador donde los subiste. Si cambias de ordenador o de navegador,
> hay que volver a subirlos.

---

## Añadir o quitar clientes

Edita `lib/clients.js`:

```js
export const CLIENTS = [
  { id: '805-245-2048', name: 'Repuestos Rosado' },
  { id: '425-828-1900', name: 'CRI' },
  { id: '653-503-8696', name: 'Aglup Motor' },
  { id: '994-380-7829', name: 'Doctor Play' },
];
```

Los datos de la agencia (nombre, web, teléfono, email) están en el mismo archivo.

---

## Ver el diseño sin credenciales

Con la variable `GOOGLE_ADS_DEMO` puedes probar la herramienta con datos inventados:

```bash
GOOGLE_ADS_DEMO=1 npm run dev       # cuenta con actividad y palabras clave
GOOGLE_ADS_DEMO=smart npm run dev   # cuenta con campañas inteligentes
GOOGLE_ADS_DEMO=vacio npm run dev   # cuenta sin actividad (para ver los "Sin datos")
```

En Windows (PowerShell): `$env:GOOGLE_ADS_DEMO=1; npm run dev`

**No dejes esta variable puesta en Vercel**, o la herramienta devolverá datos falsos.

---

## Personalizar el diseño

- **Colores de marca**: en `app/globals.css`, las variables `--marca` y `--acento` (arriba del todo).
- **Textos y estructura del informe**: `components/ReportDocument.jsx`.
- **Métricas y consultas a Google Ads**: `lib/googleAds.js`.
- **Formato de números y la regla de «Sin datos»**: `lib/format.js`.

---

## Notas técnicas

- Next.js 16 (App Router) desplegable en Vercel sin configuración extra.
- La API de Google Ads se consulta desde el servidor (`app/api/report/route.js`),
  así que las credenciales nunca llegan al navegador.
- Versión de la API: `v25`. Si Google la retira, cambia `GOOGLE_ADS_API_VERSION` en las
  variables de entorno (por ejemplo `v26`) sin tocar el código.
- El PDF se genera en el navegador (jsPDF + html2canvas) en páginas A4 exactas.
- El informe compara siempre con el mes anterior; si no hay datos del mes anterior,
  simplemente no se muestra la variación.
- Los datos del día en curso son parciales en Google Ads, así que el periodo nunca
  llega más allá de ayer.
