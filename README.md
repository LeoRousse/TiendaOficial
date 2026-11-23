# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Copiloto de orientación

El chat consulta `POST /api/assistant/recommend`. El backend usa Gemini con el catálogo, los temarios y las rutas de aprendizaje del servidor como contexto, y valida los IDs recomendados antes de responder. La clave `GEMINI_API_KEY` se configura exclusivamente en `server/.env`; nunca se expone al navegador.

Para habilitar el copiloto:

1. Configura `GEMINI_API_KEY` en `server/.env` a partir de `server/.env.example`.
2. Reinicia el servidor Express. Si no hay clave configurada, la API responde `503` explícitamente y el chat presenta el error.

## Infraestructura de checkout y pagos

El frontend prepara el flujo de órdenes y redirección; **no procesa pagos por sí mismo**. El servidor Express incluido en `server/` valida la identidad de Firebase, recalcula importes desde su catálogo, persiste órdenes en SQLite y solo las marca pagadas tras verificar los webhooks. Los importes enviados por el navegador nunca se usan para cobrar.

Para iniciar el backend local:

1. Ejecuta `npm install --prefix server`.
2. Ejecuta `npm run setup:env --prefix server` para crear/configurar `server/.env` con el asistente; nunca guardes credenciales reales en Git.
3. Ejecuta `npm run check:env --prefix server` para revisar la configuración y luego `npm run start --prefix server` para iniciar la API en `http://localhost:4000`. Si faltan credenciales de una pasarela, el API responde `503` de forma controlada y la interfaz indica que está en modo configuración.
4. Sigue [server/TESTING_SANDBOX.md](./server/TESTING_SANDBOX.md) para instalar túneles y probar E2E. Ejecuta `npm test --prefix server` para la suite y `npm run test:smoke --prefix server` con el backend activo. La base SQLite persiste en `server/data/orders.sqlite`; el directorio se ignora en Git.

Configura un URL HTTPS público para `SERVER_PUBLIC_URL` y registra `{SERVER_PUBLIC_URL}/api/webhooks/mercadopago` en Mercado Pago y `/api/webhooks/stripe` en Stripe. Para desarrollo local, usa un túnel HTTPS. Los secretos de Admin SDK, Mercado Pago y Stripe pertenecen únicamente al backend. Configura `ARS_EXCHANGE_RATE` con la tasa que tu operación realmente aplicará y revisa los precios fuente en `server/src/data/catalog.js` antes de habilitar cobros.

Los descuentos promocionales del carrito todavía no forman parte del contrato de órdenes: el servidor cobra precios del catálogo y no confía en rebajas calculadas por el navegador. No publiques una promoción como aplicable al pago hasta definir y probar su regla en el backend.

Configura en `.env.local`:

- `REACT_APP_API_BASE_URL`: URL base de la API; por defecto `http://localhost:4000/api`.
- `REACT_APP_USD_ARS_ESTIMATE_RATE`: tasa indicativa para mostrar el equivalente ARS. El valor de ejemplo (`1000`) debe cambiarse por uno actual; nunca determina el importe cobrado.

El backend debe autenticar el encabezado `Authorization: Bearer <Firebase ID token>` y exponer estos contratos:

1. `POST /api/orders` recibe `{ "courseIds": ["..."], "userId": "...", "currency": "USD" | "ARS" }` y `Idempotency-Key`. Devuelve `{ "orderId", "status", "totalAmount", "currency", "items" }`; la misma clave y payload devuelve la misma orden. Reutilizar la clave con otro carrito devuelve `409`.
2. `POST /api/payments/mercadopago/checkout` y `POST /api/payments/stripe/checkout` reciben `{ "orderId", "successUrl", "cancelUrl" }` y `Idempotency-Key`. Las URLs aportadas por el cliente se ignoran: el servidor usa `CLIENT_URL`. También se aceptan los aliases `/api/payments/mercadopago` y `/api/payments/stripe`. Mercado Pago devuelve `init_point`; Stripe devuelve `url`.
3. `GET /api/orders/:orderId/status` devuelve el estado y, si el pago fue confirmado, incluye recibo (método, fecha, moneda e items) y `unlockedCourseIds`. Solo un webhook verificado puede desbloquear cursos y cambiar el estado a `paid`.
4. Las órdenes pendientes vencen luego de 24 horas. Crear una orden para cursos que el usuario ya adquirió devuelve `409` con `ownedCourseIds`; las compras nuevas se verifican transaccionalmente en SQLite.
4. Si Stripe retorna con `session_id`, `GET /api/payments/stripe/sessions/:session_id/order` devuelve `{ "orderId": "..." }`.
5. `GET /api/me/courses` requiere un ID token de Firebase y devuelve solo los cursos pagados del usuario autenticado, con lecciones y progreso persistente. `PATCH /api/me/courses/:courseId/progress` guarda el estado de una lección y valida que el usuario haya comprado el curso.
6. `POST /api/assistant/recommend` recibe `{ "message", "history" }` y devuelve `{ "answer", "recommendedCourseIds" }`. El endpoint aplica límites de frecuencia y de tamaño para las consultas.

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
