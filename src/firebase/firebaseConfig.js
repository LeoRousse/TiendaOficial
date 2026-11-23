import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
    apiKey: "AIzaSyD6izt4xfdj9oOAUYie7EyiEYNnXurEmb0",
    authDomain: "proyectoreactquiroga.firebaseapp.com",
    projectId: "proyectoreactquiroga",
    storageBucket: "proyectoreactquiroga.firebasestorage.app",
    messagingSenderId: "281539623387",
    appId: "1:281539623387:web:103fdadc8843a88b73cffe"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const appCheckSiteKey = process.env.REACT_APP_FIREBASE_APP_CHECK_SITE_KEY?.trim();
const useAppCheckDebugToken = process.env.NODE_ENV === 'development'
  && process.env.REACT_APP_APPCHECK_DEBUG === 'true';

if (useAppCheckDebugToken && typeof window !== 'undefined') {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

export const appCheck = appCheckSiteKey
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;

export { app };