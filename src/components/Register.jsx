import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { useAuth } from "./AuthContext.jsx";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const nextErrors = {};
    if (name.trim().length < 2) nextErrors.name = "Ingresa tu nombre completo.";
    if (!emailPattern.test(email.trim())) nextErrors.email = "Formato de correo inválido.";
    if (password.length < 6) nextErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    if (confirmPassword !== password) nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      navigate("/", { replace: true });
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": "Ese correo ya tiene una cuenta.",
        "auth/invalid-email": "Formato de correo inválido.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      };
      setErrors({ form: messages[error.code] || "No pudimos crear tu cuenta." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <div className="auth-card-header">
          <span className="auth-kicker">Nueva cuenta</span>
          <h1 id="register-title">Comienza a aprender</h1>
          <p>Crea tu perfil y descubre tu próximo curso.</p>
        </div>

        {errors.form && <div className="auth-alert is-error" role="alert">{errors.form}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Nombre completo</span>
            <input
              type="text"
              value={name}
              onChange={({ target }) => {
                setName(target.value);
                if (errors.name) setErrors((current) => ({ ...current, name: "" }));
              }}
              placeholder="Tu nombre"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <small className="auth-error">{errors.name}</small>}
          </label>

          <label className="auth-field">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={({ target }) => {
                setEmail(target.value);
                if (errors.email) setErrors((current) => ({ ...current, email: "" }));
              }}
              placeholder="nombre@correo.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <small className="auth-error">{errors.email}</small>}
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <div className="password-control">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={({ target }) => {
                  setPassword(target.value);
                  if (errors.password) setErrors((current) => ({ ...current, password: "" }));
                }}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Mostrar u ocultar contraseñas">
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </button>
            </div>
            {errors.password && <small className="auth-error">{errors.password}</small>}
          </label>

          <label className="auth-field">
            <span>Confirmar contraseña</span>
            <div className="password-control">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={({ target }) => {
                  setConfirmPassword(target.value);
                  if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: "" }));
                }}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
              />
            </div>
            {errors.confirmPassword && <small className="auth-error">{errors.confirmPassword}</small>}
          </label>

          <button type="submit" className="auth-primary-button" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
