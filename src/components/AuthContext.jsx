import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (currentUserId.current !== firebaseUser?.uid) {
        const nextUserId = firebaseUser?.uid || null;
        currentUserId.current = nextUserId;
        if (!nextUserId) {
          setPurchasedCourses([]);
        } else {
          try {
            const storedCourses = localStorage.getItem(`tienda-quiroga-courses:${nextUserId}`);
            const parsedCourses = storedCourses ? JSON.parse(storedCourses) : [];
            setPurchasedCourses(Array.isArray(parsedCourses) ? parsedCourses : []);
          } catch (error) {
            console.error("No se pudieron cargar los cursos de la cuenta", error);
            setPurchasedCourses([]);
          }
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    try {
      localStorage.setItem(
        `tienda-quiroga-courses:${user.uid}`,
        JSON.stringify(purchasedCourses),
      );
    } catch (error) {
      console.error("No se pudieron guardar los cursos de la cuenta", error);
    }
  }, [purchasedCourses, user?.uid]);

  const register = async ({ name, email, password }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
      setUser({ ...credential.user, displayName: name.trim() });
    }
    return credential.user;
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return signInWithPopup(auth, provider);
  };

  const resetPassword = (email) =>
    sendPasswordResetEmail(auth, email);

  const logout = () => signOut(auth);

  const value = useMemo(() => ({
    user,
    purchasedCourses,
    setPurchasedCourses,
    loading,
    login,
    register,
    loginWithGoogle,
    resetPassword,
    logout,
  }), [user, purchasedCourses, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        <progress className="progress is-primary" max="100">Cargando</progress>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}
