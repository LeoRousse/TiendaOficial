import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CartWidget from './CartWidget';
import { AiFillHome, AiOutlineSetting } from 'react-icons/ai';
import { VscGithub } from 'react-icons/vsc';
import { TiSocialLinkedinCircular } from 'react-icons/ti';
import { SiUpwork } from 'react-icons/si';
import { useAuth } from './AuthContext.jsx';
import { getMyCourses } from '../services/apiClient.js';
import { usePreferences } from './PreferencesContext.jsx';

const NavBar = ({ url }) => {
  const [isActive, setIsActive] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, logout, purchasedCourses } = useAuth();
  const { theme, currency, reduceMotion, updatePreference } = usePreferences();
  const [purchasedCount, setPurchasedCount] = useState(purchasedCourses.length);
  const initials = user?.displayName
    ? user.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  const toggleMenu = () => {
    setIsActive(!isActive);
  };

  useEffect(() => {
    setPurchasedCount(purchasedCourses.length);
    if (!user) return undefined;
    const controller = new AbortController();
    getMyCourses({ signal: controller.signal })
      .then(({ courses = [] }) => setPurchasedCount(courses.length))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('No se pudo actualizar el contador de cursos', error);
        }
      });
    return () => controller.abort();
  }, [purchasedCourses.length, user]);

  return (
    <nav className="navbar is-spaced has-shadow" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <Link className="navbar-item store-brand" to="/" aria-label="Tienda Quiroga, inicio">
          <img src={url} alt="Tienda Quiroga" />
          <strong>Tienda Quiroga</strong>
        </Link>
        <button type="button"
          className={`navbar-burger ${isActive ? "is-active" : ""}`}
          aria-label="menu"
          aria-expanded={isActive}
          onClick={toggleMenu}
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
      </div>

      <div className={`navbar-menu ${isActive ? "is-active" : ""}`}>
        <div className="navbar-start">
          <Link className="navbar-item" to="/" onClick={() => setIsActive(false)}>
            <AiFillHome size={23} />
            <span style={{ marginLeft: "5px" }}>Inicio</span>
          </Link>

          <Link className="navbar-item" to="/rutas-de-aprendizaje" onClick={() => setIsActive(false)}>
            Rutas de aprendizaje
          </Link>

          <Link className="navbar-item" to="/diagnostico" onClick={() => setIsActive(false)}>
            Test de diagnóstico
          </Link>

          {user && (
            <Link className="navbar-item my-courses-nav-link" to="/mis-cursos" onClick={() => setIsActive(false)}>
              Mis Cursos
              <span className="my-courses-nav-count">{purchasedCount}</span>
            </Link>
          )}

          <a className="navbar-item" href="https://github.com/LeoRousse" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <VscGithub size={20} className="icon-hover" />
          </a>

          <a className="navbar-item" href="https://www.linkedin.com/in/devleonardoquiroga/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <TiSocialLinkedinCircular size={34} className="icon-hover" />
          </a>

          <a
            className="navbar-item upwork-link"
            href="https://www.upwork.com/freelancers/~014314caaade486039"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Upwork"
            title="Upwork"
          >
            <SiUpwork className="icon-hover upwork-logo" aria-hidden="true" />
          </a>

          <div className="navbar-item has-dropdown is-hoverable">
            <span className="navbar-link">Categorías</span>
            <div className="navbar-dropdown">
              <Link className="navbar-item" to="/" onClick={() => setIsActive(false)}>Todos</Link>
              <Link className="navbar-item" to="/category/programming" onClick={() => setIsActive(false)}>Programación</Link>
              <Link className="navbar-item" to="/category/design" onClick={() => setIsActive(false)}>Diseño</Link>
            </div>
          </div>
        </div>

        <div className="navbar-end">
          <div className="navbar-item">
            <div className="buttons">
              <CartWidget />
              {user ? (
                <div className="user-menu">
                  <button
                    type="button"
                    className="user-avatar"
                    onClick={() => setProfileOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    aria-label="Abrir menú de usuario"
                  >
                    {user.photoURL
                      ? <img src={user.photoURL} alt="" />
                      : initials}
                  </button>
                  {profileOpen && (
                    <div className="user-dropdown" role="menu">
                      <Link to="/mis-cursos" role="menuitem" onClick={() => setProfileOpen(false)}>Mis cursos</Link>
                      <Link to="/perfil" role="menuitem" onClick={() => setProfileOpen(false)}>Mi perfil</Link>
                      <button
                        type="button"
                        className="user-settings-trigger"
                        onClick={() => setSettingsOpen((open) => !open)}
                        aria-expanded={settingsOpen}
                        aria-controls="interface-preferences"
                      >
                        <AiOutlineSetting aria-hidden="true" />
                        Configuración
                      </button>
                      {settingsOpen && (
                        <section
                          id="interface-preferences"
                          className="interface-preferences"
                          aria-label="Preferencias de interfaz"
                        >
                          <label>
                            Tema visual
                            <select
                              value={theme}
                              onChange={(event) => updatePreference('theme', event.target.value)}
                            >
                              <option value="light">Modo claro</option>
                              <option value="dark">Modo oscuro</option>
                            </select>
                          </label>
                          <label>
                            Moneda destacada
                            <select
                              value={currency}
                              onChange={(event) => updatePreference('currency', event.target.value)}
                            >
                              <option value="USD">USD</option>
                              <option value="ARS">ARS</option>
                            </select>
                          </label>
                          <label className="interface-preferences-toggle">
                            <input
                              type="checkbox"
                              checked={reduceMotion}
                              onChange={(event) => updatePreference('reduceMotion', event.target.checked)}
                            />
                            Reducir animaciones
                          </label>
                        </section>
                      )}
                      <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); logout(); }}>
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link className="auth-nav-button login" to="/login">Iniciar Sesión</Link>
                  <Link className="auth-nav-button register" to="/register">Registrarse</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;