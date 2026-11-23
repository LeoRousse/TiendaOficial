import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig.js";

function AuthPage({ mode = "login" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      window.location.assign("/");
    } catch (authError) {
      const messages = {
        "auth/email-already-in-use": "Ese correo ya tiene una cuenta.",
        "auth/invalid-credential": "Correo o contraseña incorrectos.",
        "auth/invalid-email": "Ingresa un correo válido.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      };
      setError(messages[authError.code] || "No pudimos procesar la autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-6" style={{ maxWidth: "480px" }}>
      <div className="box">
        <h1 className="title has-text-centered">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </h1>
        {error && <div className="notification is-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="field">
              <label className="label">Nombre</label>
              <div className="control">
                <input
                  className="input"
                  value={name}
                  onChange={({ target }) => setName(target.value)}
                  required
                  minLength={2}
                />
              </div>
            </div>
          )}
          <div className="field">
            <label className="label">Correo electrónico</label>
            <div className="control">
              <input
                className="input"
                type="email"
                value={email}
                onChange={({ target }) => setEmail(target.value)}
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Contraseña</label>
            <div className="control">
              <input
                className="input"
                type="password"
                value={password}
                onChange={({ target }) => setPassword(target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <button className="button is-primary is-fullwidth" disabled={loading}>
            {loading ? "Procesando..." : isRegister ? "Registrarme" : "Acceder"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthPage;
