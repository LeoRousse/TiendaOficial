# Validación E2E en sandbox

Esta guía valida pagos de prueba únicamente. No uses credenciales `live`, cuentas reales como compradores ni tarjetas personales. No compartas archivos `.env`, claves privadas, tokens de acceso, IDs de sesión de pago ni tokens Firebase.

## 1. Preparar el entorno local

1. En PowerShell instala Node.js 22.12+ (o Node.js 24), las dependencias y las CLIs:

   ```powershell
   winget install --id Stripe.StripeCli --exact
   winget install --id Ngrok.Ngrok --exact
   winget install --id Cloudflare.cloudflared --exact
   npm install --prefix server
   ```

   Si winget no encuentra un paquete, usa las guías oficiales de [Stripe CLI](https://docs.stripe.com/stripe-cli/install), [ngrok](https://ngrok.com/download) o [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). Ejecuta `stripe login` para autorizar Stripe CLI y `ngrok config add-authtoken <TOKEN>` solo si eliges ngrok. Cloudflare Quick Tunnel con `trycloudflare.com` no requiere cuenta.

2. Ejecuta el asistente de configuración:

   ```powershell
   npm run setup:env --prefix server
   ```

   Ingresa los valores disponibles y pulsa Enter para los datos que aún no tengas (como el URL temporal del túnel o `whsec_` de Stripe); puedes volver a editar `server/.env` cuando inicies las CLIs. Completa:
   - Un service account de Firebase para el mismo proyecto que usa React: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`. En `.env`, conserva la clave PEM entre comillas y los saltos `\n`; dotenv los parsea como saltos de línea y el backend normaliza el formato.
   - Credenciales sandbox `TEST-...` y la firma de webhook de Mercado Pago.
   - `sk_test_...` y el secreto de firma del listener Stripe (`whsec_...`).
   - La URL actual de ngrok en `SERVER_PUBLIC_URL`, `CLIENT_URL=http://localhost:3000` y una tasa de prueba razonable en `ARS_EXCHANGE_RATE`.

   El asistente crea `server/.env` si falta y oculta los valores secretos mientras los escribes. También admite opciones `--VARIABLE=valor`, pero evita pasarlas desde la terminal: pueden quedar en el historial o la lista de procesos. Para generar solo la plantilla sin prompts usa `npm run setup:env --prefix server -- --copy-only`. No pegues credenciales en este documento, el frontend ni el repositorio. Los precios del catálogo y la conversión están en `src/data/catalog.js` y `ARS_EXCHANGE_RATE`.

3. Abre tres terminales PowerShell, en este orden:

   **Terminal 1 — túnel HTTPS.** Elige un proveedor. Cloudflare Tunnel no requiere cuenta:

   ```powershell
   npm run tunnel:cf --prefix server
   ```

   O usa ngrok:

   ```powershell
   npm run tunnel:mp --prefix server
   ```

   Copia el dominio HTTPS asignado a `SERVER_PUBLIC_URL` en `server/.env` con el editor. Actualiza también la URL de notificaciones de Mercado Pago (se detalla abajo).

   **Terminal 2 — Stripe CLI y webhook forwarding.**

   ```powershell
   npm run webhook:stripe --prefix server
   ```

   Copia el secreto `whsec_...` que imprime a `STRIPE_WEBHOOK_SECRET` en `server/.env` con el editor. No continúes hasta que `.env` contenga el secreto correcto del listener activo.

   **Terminal 3 — Express.** Ejecuta el validador y, si pasa, arranca el backend:

   ```powershell
   npm start --prefix server
   ```

   `npm run check:env` valida credenciales antes de probarlas y muestra nombres/motivos, nunca sus valores. `npm start` permite levantar el API aunque una pasarela falte: los endpoints de checkout de ese proveedor responden `503 Service Unavailable` con un mensaje de modo configuración.

   Comprueba `http://localhost:4000/health` (debe devolver `{"status":"ok"}`) y `http://localhost:3000`.

6. Cada vez que ngrok cambie de URL, actualiza `SERVER_PUBLIC_URL` en `server/.env`, reinicia el backend y actualiza la URL de notificaciones/webhook en Mercado Pago Developers a:

   ```text
   https://<URL-ACTUAL-DE-NGROK>/api/webhooks/mercadopago
   ```

   Selecciona notificaciones de pagos. Copia el secreto de firma del webhook desde el panel de Mercado Pago a `MP_WEBHOOK_SECRET`. No uses la URL del túnel de Stripe para Mercado Pago ni publiques el endpoint con un secreto ausente.

7. El comando `stripe listen` imprime un secreto local `whsec_...`. Si cambió, actualiza `STRIPE_WEBHOOK_SECRET` en `server/.env` y reinicia el backend. Mantén Stripe CLI escuchando durante el flujo Stripe; al reiniciar el listener confirma si su secreto cambió. En el Dashboard de Stripe usa modo test y comprueba la suscripción al evento `checkout.session.completed` mediante Stripe CLI.

## Smoke test local

Con Express iniciado y `.env` sandbox válido:

```powershell
npm run test:smoke --prefix server
```

El script prueba health, los nueve precios maestros USD/ARS y que `POST /api/orders` rechace tanto una solicitud sin `Authorization` como un token Firebase inválido. Para usar otra URL local, define `SMOKE_TEST_BASE_URL` en el entorno de esa terminal. El test no crea órdenes ni realiza pagos.

## 2. Checkout Stripe (USD)

1. En `http://localhost:3000`, inicia sesión con una cuenta de Firebase de prueba del proyecto configurado. Agrega un curso al carrito y comienza Stripe; la orden debe ser USD.
2. En la terminal de Stripe CLI confirma que llega `checkout.session.completed` y que la respuesta del webhook es exitosa. El servidor solo procesa eventos con `payment_status=paid`, moneda USD, `orderId` existente y total exacto a la orden guardada.
3. Usa el checkout de Stripe en modo test con:

   ```text
   Número: 4242 4242 4242 4242
   Vencimiento: cualquier fecha futura
   CVC: cualquier valor de 3 dígitos
   Código postal: cualquier valor si se solicita
   ```

   Es una tarjeta de prueba de Stripe, no una tarjeta real. Completa el checkout y espera la pantalla `/checkout/success?orderId=...&session_id=...`. El webhook, no la URL de retorno, libera los cursos.
4. Comprueba que `/checkout/success` pase a «¡Pago confirmado!» y ofrezca acceso al curso. El polling puede tardar unos segundos.

## 3. Checkout Mercado Pago (ARS)

1. Inicia sesión en la tienda con Firebase y agrega un curso. Elige Mercado Pago y confirma que la orden se creó en ARS.
2. Paga en el entorno de prueba de Mercado Pago usando una **cuenta de prueba compradora** creada desde Mercado Pago Developers > Cuentas de prueba. Entra al checkout con esa cuenta y completa el pago con las instrucciones de prueba que correspondan a tu país y al vendedor sandbox; no uses una cuenta ni medio de pago real.
3. En los registros del backend revisa la entrega a `/api/webhooks/mercadopago`. Debe incluir `x-signature` y `x-request-id`; el servidor valida el HMAC-SHA256 usando `MP_WEBHOOK_SECRET`, consulta el pago con la API de Mercado Pago y exige `status=approved`, moneda ARS y total igual al de la orden.
4. Confirma la redirección y polling de `/checkout/success?orderId=...`; el acceso se habilita solo después de la confirmación firmada del webhook. Si no llega el evento, revisa URL pública/HTTPS, evento Payment configurado, token `TEST-`, secreto y logs del webhook en Developers.

## 4. Auditar una orden y el UID

En las herramientas de red del navegador, anota `orderId` de la respuesta exitosa de `POST /api/orders`. Para consultar directamente el estado protegido por Firebase Auth, obtén un ID token actual de la sesión iniciada (en una consola de desarrollo local puedes usar `await auth.currentUser.getIdToken()`, si `auth` está disponible):

```powershell
$headers = @{ Authorization = "Bearer $env:FIREBASE_ID_TOKEN" }
Invoke-RestMethod -Headers $headers -Uri "http://localhost:4000/api/orders/$env:ORDER_ID/status"
```

La respuesta debe mostrar `status: "paid"` y `unlockedCourseIds` con los IDs de los cursos de la orden. El endpoint solo permite al dueño autenticado consultar esa orden.

Para verificar la vinculación local directamente con SQLite:

```powershell
npm run verify:order --prefix server -- $env:ORDER_ID $env:FIREBASE_UID
```

El comando abre `DATABASE_PATH` en modo lectura e imprime `firebaseUid`, si coincide con el UID esperado, estado, moneda, proveedor y cursos desbloqueados. Debe devolver código de salida distinto de cero cuando la orden no existe o no pertenece al UID indicado. Trata ese resultado local como dato privado.

## 5. Diagnóstico y cierre

- `npm run check:env --prefix server`: corrige cada variable reportada y vuelve a correrlo.
- Firma Stripe inválida: copia el `whsec_...` del Stripe CLI que está ejecutándose ahora, ponlo en `server/.env` y reinicia la API.
- Firma de Mercado Pago inválida: verifica que el secreto pertenece a la URL de notificaciones configurada, y que `SERVER_PUBLIC_URL` apunta al túnel activo.
- Orden pagada en proveedor pero `pending` local: revisa la entrega y respuesta del webhook; nunca marques la orden manualmente como pagada.
- Pago confirmado con monto/moneda distintos: la aplicación lo rechaza deliberadamente; revisa la orden y precios del catálogo, sin modificar SQLite a mano.
- Para detener procesos, usa `Ctrl+C`; al terminar pruebas, revoca/rota credenciales sandbox compartidas por error y elimina cualquier archivo local que contenga secretos.

Los precios de catálogo, conversión, configuración del proveedor y certificados deben revisarse antes de cualquier despliegue. Los descuentos promocionales calculados solo en frontend no se aplican al backend.
