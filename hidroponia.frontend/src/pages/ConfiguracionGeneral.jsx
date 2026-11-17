import React, { useEffect } from "react";
import Layout from "../components/Layout";
import usePageStyles from "../components/usePageStyles";
import initCtrl1 from "../controllers/configuracion.js";

const PAGE_CSS = ["/css/configuracion.css"];

export default function ConfiguracionGeneral() {
  usePageStyles(PAGE_CSS);

  useEffect(() => {
    const c1 = initCtrl1();
    return () => {
      if (typeof c1 === 'function') c1();
    };
  }, []);

  return (
    <>
      <Layout plana>

            <header className="encabezado-config">
                <h1>Configuración General</h1>
                <p className="subtitulo-pagina">Gestiona la cuenta administrativa y personaliza la apariencia del sistema.</p>
            </header>

            <div className="config-dos-columnas">

                
                <article className="card card-config-ancha">
                    <header className="titulo-card">
                        <h3>Cuenta Administrativa (Admin Único)</h3>
                    </header>

                    <form id="form-cuenta-admin" className="cuerpo-card" noValidate>
                        
                        <div className="perfil-admin">
                            <div className="avatar-admin" aria-hidden="true">AU</div>
                            <div className="datos-perfil-admin">
                                <p className="rol-admin">Administrador Único</p>
                                <p id="perfil-correo-display" className="correo-admin">admin@universidad.edu</p>
                            </div>
                        </div>

                        
                        <div className="grid-cuenta-campos">
                            <div className="grupo-campo">
                                <label htmlFor="nombre-visible" className="etiqueta-campo">Nombre Visible</label>
                                <input type="text" id="nombre-visible" name="nombreVisible" className="campo-control" defaultValue="Ing. Soporte Principal" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="correo-alertas" className="etiqueta-campo">Correo de Alertas (Notificaciones del sistema)</label>
                                <input type="email" id="correo-alertas" name="correoAlertas" className="campo-control" defaultValue="admin@universidad.edu" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="expiracion-sesion" className="etiqueta-campo">Expiración de Sesión (Minutos de inactividad)</label>
                                <input type="number" id="expiracion-sesion" name="expiracionSesion" className="campo-control" min="1" max="1440" step="1" defaultValue="30" required />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="password-actual" className="etiqueta-campo">Contraseña Actual</label>
                                <input type="password" id="password-actual" name="passwordActual" className="campo-control" autoComplete="current-password" />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="password-nueva" className="etiqueta-campo">Nueva Contraseña</label>
                                <input type="password" id="password-nueva" name="passwordNueva" className="campo-control" autoComplete="new-password" />
                            </div>

                            <div className="grupo-campo">
                                <label htmlFor="password-confirmar" className="etiqueta-campo">Confirmar Nueva Contraseña</label>
                                <input type="password" id="password-confirmar" name="passwordConfirmar" className="campo-control" autoComplete="new-password" />
                            </div>
                        </div>

                        <p id="error-cuenta-admin" className="mensaje-error-form" role="alert" hidden></p>

                        
                        <footer className="acciones-card acciones-cuenta">
                            <a href="#" id="enlace-regenerar-seguridad" className="enlace-seguridad">
                                <svg className="icono-llave-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                                <span>Regenerar Token / Cambiar Contraseña</span>
                            </a>

                            <button type="submit" id="btn-guardar-cuenta" className="btn-modal btn-modal-activar">
                                Guardar Cambios
                            </button>
                        </footer>
                    </form>
                </article>

                
                <article className="card card-config-ancha">
                    <header className="titulo-card">
                        <h3>Apariencia y Accesibilidad</h3>
                    </header>

                    <form id="form-apariencia" className="cuerpo-card" noValidate>
                        <div className="grupo-campo campo-tema-limitado">
                            <label htmlFor="select-tema-general" className="etiqueta-campo">Tema de la Interfaz</label>
                            <select id="select-tema-general" name="tema" className="campo-control" defaultValue="oscuro">
                                <option value="oscuro">Modo Oscuro (Actual)</option>
                                <option value="claro">Modo Claro</option>
                                <option value="sistema">Sincronizar con el Sistema</option>
                            </select>
                        </div>

                        <div className="subgrupo-tipografia">
                            <h4 className="subtitulo-bloque">Configuración Tipográfica</h4>

                            <div className="grid-tipografia-tres">
                                <div className="grupo-campo">
                                    <span id="label-font-title" className="etiqueta-campo">Tamaño de Títulos Principales</span>
                                    <div className="stepper-control" role="group" aria-labelledby="label-font-title" data-stepper="titlePx" data-min="24" data-max="56" data-step="2">
                                        <button type="button" className="btn-modal btn-modal-cancelar stepper-btn" data-accion="decrementar" aria-label="Disminuir tamaño de títulos principales">-</button>
                                        <span id="valor-font-title" className="stepper-valor" aria-live="polite">24 px</span>
                                        <button type="button" className="btn-modal btn-modal-cancelar stepper-btn" data-accion="incrementar" aria-label="Aumentar tamaño de títulos principales">+</button>
                                    </div>
                                    <small className="texto-guia">Rango: 24 – 56 px</small>
                                </div>

                                <div className="grupo-campo">
                                    <span id="label-font-subtitle" className="etiqueta-campo">Tamaño de Subtítulos</span>
                                    <div className="stepper-control" role="group" aria-labelledby="label-font-subtitle" data-stepper="subtitlePx" data-min="18" data-max="36" data-step="2">
                                        <button type="button" className="btn-modal btn-modal-cancelar stepper-btn" data-accion="decrementar" aria-label="Disminuir tamaño de subtítulos">-</button>
                                        <span id="valor-font-subtitle" className="stepper-valor" aria-live="polite">18 px</span>
                                        <button type="button" className="btn-modal btn-modal-cancelar stepper-btn" data-accion="incrementar" aria-label="Aumentar tamaño de subtítulos">+</button>
                                    </div>
                                    <small className="texto-guia">Rango: 18 – 36 px</small>
                                </div>

                                <div className="grupo-campo">
                                    <span id="label-font-base" className="etiqueta-campo">Tamaño del Texto General</span>
                                    <div className="stepper-control" role="group" aria-labelledby="label-font-base" data-stepper="basePx" data-min="12" data-max="24" data-step="1">
                                        <button type="button" className="btn-modal btn-modal-cancelar stepper-btn" data-accion="decrementar" aria-label="Disminuir tamaño del texto general">-</button>
                                        <span id="valor-font-base" className="stepper-valor" aria-live="polite">14 px</span>
                                        <button type="button" className="btn-modal btn-modal-cancelar stepper-btn" data-accion="incrementar" aria-label="Aumentar tamaño del texto general">+</button>
                                    </div>
                                    <small className="texto-guia">Rango: 12 – 24 px</small>
                                </div>
                            </div>
                        </div>

                        <footer className="acciones-card">
                            <button type="submit" id="btn-aplicar-apariencia" className="btn-modal btn-modal-activar">
                                Aplicar Apariencia
                            </button>
                        </footer>
                    </form>
                </article>

                
                <section className="card card-config-ancha" aria-label="Bitácora de Auditoría de Configuración">
                    <header className="titulo-card">
                        <h3>Bitácora de Auditoría de Configuración</h3>
                    </header>

                    <div className="cuerpo-card">
                        <p className="texto-guia">Registro cronológico inmutable de modificaciones realizadas sobre parámetros críticos, umbrales y hardware.</p>

                        <div className="fila-dos-cols barra-filtros-auditoria">
                            <div className="grupo-campo">
                                <label htmlFor="filtro-auditoria-modulo" className="etiqueta-campo">Filtrar por módulo</label>
                                <select id="filtro-auditoria-modulo" className="campo-control" defaultValue="todos">
                                    <option value="todos">Todos los módulos</option>
                                    <option value="Conductividad / TDS">Conductividad / TDS</option>
                                    <option value="pH RS485">pH RS485</option>
                                    <option value="Nivel y Temperatura">Nivel y Temperatura</option>
                                    <option value="Control de Equipos">Control de Equipos</option>
                                    <option value="Nodo ESP32-S3">Nodo ESP32-S3</option>
                                    <option value="Sistema y Tipografía">Sistema y Tipografía</option>
                                </select>
                            </div>

                            <div className="acciones-card acciones-en-linea">
                                <button type="button" id="btn-exportar-auditoria-csv" className="btn-modal btn-modal-activar">
                                    Exportar Bitácora CSV
                                </button>
                            </div>
                        </div>

                        <div className="contenedor-tabla-registros">
                            <table className="tabla-historial" aria-label="Bitácora de auditoría de configuración">
                                <thead>
                                    <tr>
                                        <th>Fecha y Hora</th>
                                        <th>Módulo</th>
                                        <th>Parámetro Modificado</th>
                                        <th>Detalle del Cambio</th>
                                        <th>Responsable</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-auditoria-sistema" aria-live="polite"></tbody>
                            </table>
                        </div>
                    </div>
                </section>

            </div>
        
      </Layout>


    
    <div id="modal-config-general" className="modal-overlay" hidden>
        <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-config-titulo" aria-describedby="modal-config-mensaje" aria-live="polite">
            <h4 id="modal-config-titulo" className="modal-titulo"></h4>
            <p id="modal-config-mensaje" className="modal-mensaje"></p>
            <div className="modal-acciones">
                <button type="button" id="btn-modal-cerrar-config" className="btn-modal btn-modal-activar">Aceptar</button>
            </div>
        </div>
    </div>

    
    <div id="toast-config" className="toast-notificacion" role="status" aria-live="polite" hidden></div>

    
    </>
  );
}
