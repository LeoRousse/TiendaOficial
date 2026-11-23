import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CartWidget from './CartWidget';
import { AiOutlineMenuUnfold, AiFillHome } from 'react-icons/ai';
import { VscGithub } from 'react-icons/vsc';
import { TiSocialLinkedinCircular } from 'react-icons/ti';
import { useAuth } from './AuthContext.jsx';

const NavBar = ({ url }) => {
  const [isActive, setIsActive] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const initials = user?.displayName
    ? user.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  const toggleMenu = () => {
    setIsActive(!isActive);
  };

  return (
    <nav className="navbar is-spaced has-shadow" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <button type="button" className="navbar-item button is-white" onClick={toggleMenu} aria-label="Abrir navegación">
          <AiOutlineMenuUnfold size={23} />
          <img src={url} alt="Logo" style={{ marginLeft: "10px", height: "40px" }} />
        </button>
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

          <div className="navbar-item" onClick={() => setIsActive(false)}>
            <CartWidget />
          </div>

          <a className="navbar-item" href="https://github.com/LeoRousse" target="_blank" rel="noopener noreferrer">
            <VscGithub size={20} className="icon-hover" />
          </a>

          <a className="navbar-item" href="https://www.linkedin.com/in/devleonardoquiroga/" target="_blank" rel="noopener noreferrer">
            <TiSocialLinkedinCircular size={34} className="icon-hover" />
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
              <Link className="button is-primary is-rounded" to="/cart">
                <strong>Ver carrito</strong>
              </Link>
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