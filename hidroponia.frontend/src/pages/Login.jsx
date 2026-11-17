import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/login.js";

const PAGE_CSS = ["/css/login.css"];

export default function Login() {
  usePageStyles(PAGE_CSS);

  useEffect(() => {
    const c1 = initCtrl1();
    return () => {
      if (typeof c1 === 'function') c1();
    };
  }, []);

  return (
    <>

    <main className="login-main">
        <section className="card login-card" aria-labelledby="login-titulo">
            <header className="login-encabezado">
                <div className="login-logo-contenedor">
                    <img className="login-logo-img" src="/img/logo.png" alt="Logo AXIÓN IOT" />
                </div>
                <h1 id="login-titulo" className="login-titulo">AXIÓN - IOT</h1>
                <p className="login-subtitulo">Acceso al Sistema de Monitoreo y Control Hidropónico</p>
            </header>

            <form id="form-login" className="login-formulario" noValidate>
                <div className="grupo-campo">
                    <label htmlFor="login-email" className="etiqueta-campo">Correo Institucional</label>
                    <input type="email" id="login-email" name="email" className="campo-control" placeholder="Correo institucional" required autoComplete="username" />
                </div>

                <div className="grupo-campo">
                    <label htmlFor="login-password" className="etiqueta-campo">Contraseña</label>
                    <div className="campo-password-wrapper">
                        <input type="password" id="login-password" name="password" className="campo-control campo-password" placeholder="Ingresa tu contraseña" required autoComplete="current-password" />
                        <button type="button" id="btn-toggle-password" className="btn-ver-password" aria-label="Mostrar contraseña" aria-pressed="false">
                            <svg id="icono-ojo-mostrar" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            <svg id="icono-ojo-ocultar" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" hidden>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="login-opciones">
                    <label htmlFor="login-recordar" className="checkbox-etiqueta">
                        <input type="checkbox" id="login-recordar" name="recordar" className="checkbox-control" />
                        <span>Mantener sesión iniciada</span>
                    </label>
                    <button type="button" id="btn-recuperar-acceso" className="enlace-recuperar">
                        Recuperar acceso
                    </button>
                </div>

                <div id="login-feedback" className="login-feedback" role="alert" aria-live="polite" hidden>
                    <span className="punto-feedback" aria-hidden="true"></span>
                    <span id="login-feedback-texto"></span>
                </div>

                <button type="submit" id="btn-ingresar" className="btn-modal btn-modal-activar btn-login-submit">
                    Ingresar al Sistema
                </button>
            </form>

            <footer className="login-pie">
                <Link to="/" className="enlace-retorno-publico">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>Volver al Panel Público (Solo Lectura)</span>
                </Link>
            </footer>
        </section>
    </main>

    <div id="modal-recuperar-acceso" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="modal-recuperar-titulo" aria-describedby="modal-recuperar-mensaje">
            <h2 id="modal-recuperar-titulo" className="modal-titulo">Recuperación de Acceso</h2>
            <p id="modal-recuperar-mensaje" className="modal-mensaje">
                Ingresa el token de recuperación física del controlador ESP32-S3 y define una nueva contraseña para el Administrador Único.
            </p>
            <form id="form-recuperar-acceso" className="modal-login-form" noValidate>
                <div className="grupo-campo">
                    <label htmlFor="rec-token" className="etiqueta-campo">Token de Recuperación de Emergencia</label>
                    <input type="text" id="rec-token" name="tokenRecuperacion" className="campo-control" placeholder="Token de recuperación" required />
                </div>
                <div className="grupo-campo">
                    <label htmlFor="rec-password-nueva" className="etiqueta-campo">Nueva Contraseña</label>
                    <input type="password" id="rec-password-nueva" name="passwordNueva" className="campo-control" placeholder="Nueva contraseña" required />
                </div>
                <div className="grupo-campo">
                    <label htmlFor="rec-password-confirmar" className="etiqueta-campo">Confirmar Nueva Contraseña</label>
                    <input type="password" id="rec-password-confirmar" name="passwordConfirmar" className="campo-control" placeholder="Confirmar contraseña" required />
                </div>
                <footer className="modal-acciones">
                    <button type="button" id="btn-cerrar-recuperar" className="btn-modal btn-modal-cancelar">
                        Cancelar
                    </button>
                    <button type="submit" className="btn-modal btn-modal-activar">
                        Restablecer Contraseña
                    </button>
                </footer>
            </form>
        </div>
    </div>

    <div id="toast-login" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
