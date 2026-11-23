import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`Tienda Quiroga API escuchando en http://localhost:${config.port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.info(`Webhook Mercado Pago: ${config.serverPublicUrl}/api/webhooks/mercadopago`);
    console.info('Si la URL del túnel cambió, actualiza SERVER_PUBLIC_URL y el webhook de Mercado Pago Developers, y reinicia esta API.');
    console.info('Para Stripe local, ejecuta npm run webhook:stripe y configura su whsec_ actual en server/.env.');
  }
});

function shutdown(signal) {
  console.log(`Recibida señal ${signal}; cerrando API.`);
  server.close(() => {
    app.locals.orderStore.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
