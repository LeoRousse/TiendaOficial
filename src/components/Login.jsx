import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AiFillEye, AiFillEyeInvisible, AiOutlineGoogle } from "react-icons/ai";
import { useAuth } from "./AuthContext.jsx";

const authErrorMessage = (code) => ({
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "Ingresa un correo electrónico válido.",
  "auth/user-disabled": "Esta cuenta fue deshabilitada.",
  "auth/popup-blocked": "Permite las ventanas emergentes e intenta nuevamente.",
  "auth/popup-closed-by-user": "El inicio de sesión con Google fue cancelado.",
  "auth/operation-not-allowed": "Google no está habilitado en Firebase Authentication.",
}[code] || "No pudimos iniciar sesión. Intenta nuevamente.");

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || "/";

  const finishLogin = () => navigate(destination, { replace: true });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
      finishLogin();
    } catch (authError) {
      setError(authErrorMessage(authError.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      finishLogin();
    } catch (authError) {
      setError(authErrorMessage(authError.code));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Ingresa tu correo para restablecer la contraseña.");
      return;
    }

    try {
      await resetPassword(email.trim());
      setMessage("Te enviamos un correo para restablecer tu contraseña.");
    } catch (authError) {
      setError(authErrorMessage(authError.code));
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card-header">
          <span className="auth-kicker">Tienda Quiroga</span>
          <h1 id="login-title">Bienvenido de nuevo</h1>
          <p>Accede a tus cursos y continúa aprendiendo.</p>
        </div>

        {error && <div className="auth-alert is-error" role="alert">{error}</div>}
        {message && <div className="auth-alert is-success" role="status">{message}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={({ target }) => setEmail(target.value)}
              placeholder="nombre@correo.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <div className="password-control">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={({ target }) => setPassword(target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </button>
            </div>
          </label>

          <button type="button" className="forgot-password" onClick={handleReset}>
            ¿Olvidaste tu contraseña?
          </button>

          <button type="submit" className="auth-primary-button" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="auth-divider"><span>o continúa con</span></div>

        <button type="button" className="google-button" onClick={handleGoogle} disabled={loading}>
          <AiOutlineGoogle />
          Continuar con Google
        </button>

        <p className="auth-switch">
          ¿Nuevo en Tienda Quiroga? <Link to="/register">Crea tu cuenta</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
