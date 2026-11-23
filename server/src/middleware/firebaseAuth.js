import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getFirebaseAuth({ projectId, clientEmail, privateKey }) {
  const existingApp = getApps()[0];
  if (existingApp) return getAuth(existingApp);

  const credential = clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') })
    : applicationDefault();
  return getAuth(initializeApp({
    credential,
    projectId,
  }));
}

export function createFirebaseAuthMiddleware({
  projectId,
  clientEmail,
  privateKey,
  verifyToken,
} = {}) {
  return async function firebaseAuth(req, res, next) {
    const header = req.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) {
      return res.status(401).json({ message: 'Se requiere un token de autenticación.' });
    }

    try {
      const claims = verifyToken
        ? await verifyToken(match[1])
        : await getFirebaseAuth({ projectId, clientEmail, privateKey }).verifyIdToken(match[1]);
      if (!claims?.uid) {
        return res.status(401).json({ message: 'El token de autenticación no es válido.' });
      }
      req.user = { uid: claims.uid };
      return next();
    } catch (error) {
      console.error('Falló la verificación del token de Firebase', error);
      if (error.code === 'app/invalid-credential' || error.code === 'app/no-app') {
        return res.status(503).json({ message: 'La autenticación del servidor no está configurada.' });
      }
      return res.status(401).json({ message: 'El token de autenticación no es válido o expiró.' });
    }
  };
}
