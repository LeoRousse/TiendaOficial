# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Copiloto de orientación

El chat usa Firebase AI Logic con Gemini y fundamenta sus respuestas con los cursos, temarios y rutas de aprendizaje de Firestore. No requiere una API key de Gemini en el navegador.

Para habilitarlo:

1. Ejecuta `npx -y firebase-tools@latest init ailogic` en este directorio y selecciona la app web `ReactAppQuiroga` para completar la provisión de Firebase AI Logic. El proveedor Gemini Developer API ya está habilitado en el proyecto `proyectoreactquiroga`.
2. Crea una clave score-based de reCAPTCHA Enterprise y registra la aplicación web en App Check con ese proveedor. Para desarrollo local, usa una clave separada que permita `localhost`; no agregues `localhost` a la clave de producción.
3. Copia `.env.example` a `.env.local` y define `REACT_APP_FIREBASE_APP_CHECK_SITE_KEY` con la clave de sitio.
4. Solo para desarrollo local, define `REACT_APP_APPCHECK_DEBUG=true`, inicia la app y registra el token que Firebase imprime en la consola del navegador en Firebase Console > App Check > Apps. No publiques ni compartas ese token; en producción debe permanecer desactivado.
5. Reinicia `npm start` después de cambiar las variables.

Si AI Logic o App Check no están configurados, el copiloto informa que no está habilitado en lugar de simular una respuesta.

## Infraestructura de checkout y pagos

El frontend prepara el flujo de órdenes y redirección; **no procesa pagos por sí mismo**. El servidor Express incluido en `server/` valida la identidad de Firebase, recalcula importes desde su catálogo, persiste órdenes en SQLite y solo las marca pagadas tras verificar los webhooks. Los importes enviados por el navegador nunca se usan para cobrar.

Para iniciar el backend local:

1. Ejecuta `npm install --prefix server`.
2. Copia `server/.env.example` a `server/.env`, configura las credenciales de Firebase Admin y las claves de prueba de las pasarelas. Nunca guardes `server/.env` en Git.
3. Ejecuta `npm run check:env --prefix server` y después `npm run start --prefix server`; el validador revisa las credenciales sandbox antes de que la API escuche en `http://localhost:4000`.
4. Sigue [server/TESTING_SANDBOX.md](./server/TESTING_SANDBOX.md) para túneles y pruebas E2E; ejecuta `npm test --prefix server` para la suite. La base SQLite persiste en `server/data/orders.sqlite`; el directorio se ignora en Git.

Configura un URL HTTPS público para `SERVER_PUBLIC_URL` y registra `{SERVER_PUBLIC_URL}/api/webhooks/mercadopago` en Mercado Pago y `/api/webhooks/stripe` en Stripe. Para desarrollo local, usa un túnel HTTPS. Los secretos de Admin SDK, Mercado Pago y Stripe pertenecen únicamente al backend. Configura `ARS_EXCHANGE_RATE` con la tasa que tu operación realmente aplicará y revisa los precios fuente en `server/src/data/catalog.js` antes de habilitar cobros.

Los descuentos promocionales del carrito todavía no forman parte del contrato de órdenes: el servidor cobra precios del catálogo y no confía en rebajas calculadas por el navegador. No publiques una promoción como aplicable al pago hasta definir y probar su regla en el backend.

Configura en `.env.local`:

- `REACT_APP_API_BASE_URL`: URL base de la API; por defecto `http://localhost:4000/api`.
- `REACT_APP_USD_ARS_ESTIMATE_RATE`: tasa indicativa para mostrar el equivalente ARS. El valor de ejemplo (`1000`) debe cambiarse por uno actual; nunca determina el importe cobrado.

El backend debe autenticar el encabezado `Authorization: Bearer <Firebase ID token>` y exponer estos contratos:

1. `POST /api/orders` recibe `{ "courseIds": ["..."], "userId": "...", "currency": "USD" | "ARS" }` y `Idempotency-Key`. Devuelve `{ "orderId", "status", "totalAmount", "currency", "items" }`; la misma clave y payload devuelve la misma orden. Reutilizar la clave con otro carrito devuelve `409`.
2. `POST /api/payments/mercadopago/checkout` y `POST /api/payments/stripe/checkout` reciben `{ "orderId", "successUrl", "cancelUrl" }` y `Idempotency-Key`. Las URLs aportadas por el cliente se ignoran: el servidor usa `CLIENT_URL`. También se aceptan los aliases `/api/payments/mercadopago` y `/api/payments/stripe`. Mercado Pago devuelve `init_point`; Stripe devuelve `url`.
3. `GET /api/orders/:orderId/status` devuelve `{ "orderId", "status", "unlockedCourseIds", "updatedAt" }`. Solo un webhook verificado puede desbloquear cursos y cambiar el estado a `paid`.
4. Si Stripe retorna con `session_id`, `GET /api/payments/stripe/sessions/:session_id/order` devuelve `{ "orderId": "..." }`.

El hook de sincronización persiste y combina el carrito de invitado con el carrito guardado para la cuenta en el mismo navegador; para sincronización entre dispositivos hace falta un endpoint autenticado del backend. La ruta `/checkout/success` consulta el estado cada 3 segundos, con un máximo de 60 segundos, y libera el acceso solo al recibir `paid`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
