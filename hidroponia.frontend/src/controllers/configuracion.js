export default function initController() {
    const __docListeners = [];
    const __winListeners = [];
    const __observers = [];
    const __origDocAdd = document.addEventListener.bind(document);
    const __origWinAdd = window.addEventListener.bind(window);
    const __OrigMO = window.MutationObserver;

    const __docProxy = (type, fn, opts) => {
        __docListeners.push([type, fn, opts]);
        return __origDocAdd(type, fn, opts);
    };
    const __winProxy = (type, fn, opts) => {
        __winListeners.push([type, fn, opts]);
        return __origWinAdd(type, fn, opts);
    };
    class __TrackedMO extends __OrigMO {
        constructor(cb) {
            super(cb);
            __observers.push(this);
        }
    }

    document.addEventListener = __docProxy;
    window.addEventListener = __winProxy;
    window.MutationObserver = __TrackedMO;

    try {
        (function () {
            const CLAVE_TEMA_LOCAL = "axion_tema";
            const CLAVE_TIPOGRAFIA_LOCAL = "axion_tipografia";

            const DEFAULTS_TIPOGRAFIA_PX = { titlePx: 24, subtitlePx: 18, basePx: 14 };
            const estadoTipografia = { ...DEFAULTS_TIPOGRAFIA_PX };

            const formApariencia = document.getElementById("form-apariencia");
            const selectTema = document.getElementById("select-tema-general");
            const steppersTipografia = Array.from(document.querySelectorAll(".stepper-control[data-stepper]"));

            const formCuenta = document.getElementById("form-cuenta-admin");
            const displayCorreo = document.getElementById("perfil-correo-display");
            const inputNombreVisible = document.getElementById("nombre-visible");
            const inputCorreoAlertas = document.getElementById("correo-alertas");
            const inputExpiracion = document.getElementById("expiracion-sesion");
            const inputPasswordActual = document.getElementById("password-actual");
            const errorCuenta = document.getElementById("error-cuenta-admin");
            const enlaceRegenerar = document.getElementById("enlace-regenerar-seguridad");

            const modal = document.getElementById("modal-config-general");
            const modalTitulo = document.getElementById("modal-config-titulo");
            const modalMensaje = document.getElementById("modal-config-mensaje");
            const btnCerrarModal = document.getElementById("btn-modal-cerrar-config");
            const toast = document.getElementById("toast-config");

            const selectFiltroAuditoria = document.getElementById("filtro-auditoria-modulo");
            const btnExportarAuditoria = document.getElementById("btn-exportar-auditoria-csv");

            if (!formApariencia || !formCuenta || !modal) return;

            let alCerrarModal = null;
            let toastTimer = null;

            function mostrarToast(texto) {
                if (!toast) return;
                toast.textContent = texto;
                toast.hidden = false;
                if (toastTimer) clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    toast.hidden = true;
                }, 3000);
            }

            function abrirModal({ titulo, mensaje, claseBoton, onCerrar }) {
                modalTitulo.textContent = titulo;
                modalMensaje.textContent = mensaje;
                btnCerrarModal.className = `btn-modal ${claseBoton || "btn-modal-activar"}`;
                alCerrarModal = typeof onCerrar === "function" ? onCerrar : null;
                modal.hidden = false;
                btnCerrarModal.focus();
            }

            function cerrarModal() {
                modal.hidden = true;
                if (alCerrarModal) {
                    const cb = alCerrarModal;
                    alCerrarModal = null;
                    cb();
                }
            }

            function ajustarValorRango(valor, min, max, fallback) {
                const num = Number.parseFloat(valor);
                if (!Number.isFinite(num)) return fallback;
                return Math.min(max, Math.max(min, Math.round(num)));
            }

            function renderizarSteppers() {
                steppersTipografia.forEach((stepper) => {
                    const clave = stepper.dataset.stepper;
                    const min = Number(stepper.dataset.min);
                    const max = Number(stepper.dataset.max);
                    const valor = ajustarValorRango(estadoTipografia[clave], min, max, DEFAULTS_TIPOGRAFIA_PX[clave]);
                    estadoTipografia[clave] = valor;

                    const spanValor = stepper.querySelector(".stepper-valor");
                    const btnMenos = stepper.querySelector('[data-accion="decrementar"]');
                    const btnMas = stepper.querySelector('[data-accion="incrementar"]');

                    if (spanValor) spanValor.textContent = `${valor} px`;
                    if (btnMenos) btnMenos.disabled = valor <= min;
                    if (btnMas) btnMas.disabled = valor >= max;
                });
            }

            function aplicarVariablesTipograficas() {
                const root = document.documentElement;
                const prefs = {
                    titlePx: estadoTipografia.titlePx,
                    subtitlePx: estadoTipografia.subtitlePx,
                    basePx: estadoTipografia.basePx,
                    title: `${estadoTipografia.titlePx}px`,
                    subtitle: `${estadoTipografia.subtitlePx}px`,
                    base: `${estadoTipografia.basePx}px`
                };
                root.style.setProperty("--font-size-title", prefs.title);
                root.style.setProperty("--font-size-subtitle", prefs.subtitle);
                root.style.setProperty("--font-size-base", prefs.base);
                renderizarSteppers();
                return prefs;
            }

            function aplicarTemaSeleccionado(modo) {
                let esClaro = modo === "claro";
                if (modo === "sistema") {
                    esClaro = Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
                }
                document.body.classList.toggle("tema-claro", esClaro);

                const btnNavbarTema = document.querySelector("#contenedor-navbar .btn-tema");
                const iconoNavbarTema = document.querySelector("#contenedor-navbar .icono-tema .material-symbols-outlined");
                if (btnNavbarTema) btnNavbarTema.classList.toggle("modo-claro", esClaro);
                if (iconoNavbarTema) iconoNavbarTema.textContent = esClaro ? "light_mode" : "dark_mode";
            }

            function actualizarJwtSesion(nuevoToken) {
                if (!nuevoToken) return;
                ["localStorage", "sessionStorage"].forEach((storeName) => {
                    const store = window[storeName];
                    const raw = store.getItem("axion_sesion_activa");
                    if (raw) {
                        try {
                            const obj = JSON.parse(raw);
                            obj.token = nuevoToken;
                            store.setItem("axion_sesion_activa", JSON.stringify(obj));
                        } catch {
                            // Ignorar
                        }
                    }
                });
            }

            async function cargarPreferenciasDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const ap = await window.AxionApi.get("/configuracion/apariencia");
                    if (ap) {
                        if (ap.tema && ["oscuro", "claro", "sistema"].includes(ap.tema)) {
                            selectTema.value = ap.tema;
                            localStorage.setItem(CLAVE_TEMA_LOCAL, ap.tema);
                            aplicarTemaSeleccionado(ap.tema);
                        }
                        if (Number.isFinite(Number(ap.titlePx))) estadoTipografia.titlePx = Number(ap.titlePx);
                        if (Number.isFinite(Number(ap.subtitlePx))) estadoTipografia.subtitlePx = Number(ap.subtitlePx);
                        if (Number.isFinite(Number(ap.basePx))) estadoTipografia.basePx = Number(ap.basePx);
                        const prefs = aplicarVariablesTipograficas();
                        localStorage.setItem(CLAVE_TIPOGRAFIA_LOCAL, JSON.stringify(prefs));
                    }
                } catch {
                    aplicarVariablesTipograficas();
                }

                try {
                    const cuenta = await window.AxionApi.get("/configuracion/cuenta");
                    if (cuenta) {
                        if (cuenta.nombreVisible && inputNombreVisible) inputNombreVisible.value = cuenta.nombreVisible;
                        if (cuenta.correo) {
                            if (inputCorreoAlertas) inputCorreoAlertas.value = cuenta.correo;
                            if (displayCorreo) displayCorreo.textContent = cuenta.correo;
                        }
                        if (Number.isFinite(Number(cuenta.expiracionMinutos)) && inputExpiracion) {
                            inputExpiracion.value = String(cuenta.expiracionMinutos);
                        }
                    }
                } catch (err) {
                    mostrarToast(err.message || "No se pudo cargar la información de la cuenta desde el servidor.");
                }
            }

            steppersTipografia.forEach((stepper) => {
                const clave = stepper.dataset.stepper;
                const min = Number(stepper.dataset.min);
                const max = Number(stepper.dataset.max);
                const step = Number(stepper.dataset.step) || 1;

                stepper.addEventListener("click", (e) => {
                    const btn = e.target.closest(".stepper-btn");
                    if (!btn || btn.disabled) return;
                    const delta = btn.dataset.accion === "incrementar" ? step : -step;
                    estadoTipografia[clave] = ajustarValorRango(
                        estadoTipografia[clave] + delta,
                        min,
                        max,
                        DEFAULTS_TIPOGRAFIA_PX[clave]
                    );
                    const prefs = aplicarVariablesTipograficas();
                    localStorage.setItem(CLAVE_TIPOGRAFIA_LOCAL, JSON.stringify(prefs));
                });
            });

            selectTema.addEventListener("change", () => {
                aplicarTemaSeleccionado(selectTema.value);
            });

            formApariencia.addEventListener("submit", async (e) => {
                e.preventDefault();
                const modoTema = selectTema.value;
                const prefsTipografia = aplicarVariablesTipograficas();

                aplicarTemaSeleccionado(modoTema);
                localStorage.setItem(CLAVE_TEMA_LOCAL, modoTema);
                localStorage.setItem(CLAVE_TIPOGRAFIA_LOCAL, JSON.stringify(prefsTipografia));

                try {
                    await window.AxionApi.put("/configuracion/apariencia", {
                        tema: modoTema,
                        titlePx: prefsTipografia.titlePx,
                        subtitlePx: prefsTipografia.subtitlePx,
                        basePx: prefsTipografia.basePx
                    });
                    mostrarToast("Apariencia y tipografía guardadas.");
                    renderizarBitacoraAuditoria();
                } catch (err) {
                    mostrarToast(err.message || "Error al guardar la apariencia en el servidor.");
                }
            });

            const observadorTemaNavbar = new MutationObserver(() => {
                const esClaro = document.body.classList.contains("tema-claro");
                const modoGuardado = localStorage.getItem(CLAVE_TEMA_LOCAL);
                if (modoGuardado === "claro" || modoGuardado === "oscuro") {
                    selectTema.value = esClaro ? "claro" : "oscuro";
                }
            });
            observadorTemaNavbar.observe(document.body, { attributes: true, attributeFilter: ["class"] });

            if (enlaceRegenerar) {
                enlaceRegenerar.addEventListener("click", async (e) => {
                    e.preventDefault();
                    try {
                        const res = await window.AxionApi.post("/configuracion/regenerar-token");
                        if (res.token) actualizarJwtSesion(res.token);
                        abrirModal({
                            titulo: "Token de Acceso Regenerado",
                            mensaje: `Se generó un nuevo token de recuperación administrativa: ${res.tokenRecuperacion}. Guárdalo en un lugar seguro.`,
                            claseBoton: "btn-modal-activar"
                        });
                        renderizarBitacoraAuditoria();
                    } catch (err) {
                        mostrarToast(err.message || "No se pudo regenerar el token de recuperación.");
                    }
                });
            }

            [inputNombreVisible, inputCorreoAlertas, inputExpiracion, inputPasswordActual].forEach((campo) => {
                if (campo) {
                    campo.addEventListener("input", () => {
                        if (errorCuenta) {
                            errorCuenta.textContent = "";
                            errorCuenta.hidden = true;
                        }
                    });
                }
            });

            formCuenta.addEventListener("submit", async (e) => {
                e.preventDefault();
                if (errorCuenta) {
                    errorCuenta.textContent = "";
                    errorCuenta.hidden = true;
                }

                const nombreVisible = (inputNombreVisible.value || "").trim();
                const correoAlertas = (inputCorreoAlertas.value || "").trim();
                const expiracionMinutos = Number.parseInt(inputExpiracion.value, 10);
                const passwordActual = (inputPasswordActual.value || "").trim();

                if (!nombreVisible) {
                    errorCuenta.textContent = "El campo Nombre Visible no puede estar vacío.";
                    errorCuenta.hidden = false;
                    inputNombreVisible.focus();
                    return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoAlertas)) {
                    errorCuenta.textContent = "Ingresa un Correo de Alertas válido.";
                    errorCuenta.hidden = false;
                    inputCorreoAlertas.focus();
                    return;
                }
                if (!Number.isFinite(expiracionMinutos) || expiracionMinutos < 1 || expiracionMinutos > 1440) {
                    errorCuenta.textContent = "La Expiración de Sesión debe estar entre 1 y 1440 minutos.";
                    errorCuenta.hidden = false;
                    inputExpiracion.focus();
                    return;
                }
                if (!passwordActual) {
                    abrirModal({
                        titulo: "Contraseña Requerida",
                        mensaje: "Por seguridad, debes ingresar tu Contraseña Actual para confirmar y guardar los cambios.",
                        claseBoton: "btn-modal-advertencia",
                        onCerrar: () => inputPasswordActual.focus()
                    });
                    return;
                }

                const inputPasswordNueva = document.getElementById("password-nueva");
                const inputPasswordConfirmar = document.getElementById("password-confirmar");
                const passwordNueva = (inputPasswordNueva?.value || "").trim();
                const passwordConfirmar = (inputPasswordConfirmar?.value || "").trim();

                let cambioPassword = false;
                if (passwordNueva || passwordConfirmar) {
                    if (passwordNueva.length < 6) {
                        errorCuenta.textContent = "La Nueva Contraseña debe tener al menos 6 caracteres.";
                        errorCuenta.hidden = false;
                        if (inputPasswordNueva) inputPasswordNueva.focus();
                        return;
                    }
                    if (passwordNueva !== passwordConfirmar) {
                        errorCuenta.textContent = "La Nueva Contraseña y su confirmación no coinciden.";
                        errorCuenta.hidden = false;
                        if (inputPasswordConfirmar) inputPasswordConfirmar.focus();
                        return;
                    }
                    cambioPassword = true;
                }

                try {
                    const res = await window.AxionApi.put("/configuracion/cuenta", {
                        nombreVisible,
                        correoAlertas,
                        expiracionMinutos,
                        passwordActual,
                        passwordNueva: cambioPassword ? passwordNueva : null
                    });
                    if (res && res.token) actualizarJwtSesion(res.token);
                    if (displayCorreo) displayCorreo.textContent = correoAlertas;
                    inputPasswordActual.value = "";
                    if (inputPasswordNueva) inputPasswordNueva.value = "";
                    if (inputPasswordConfirmar) inputPasswordConfirmar.value = "";

                    abrirModal({
                        titulo: "Cambios Guardados",
                        mensaje: res.mensaje || "La configuración de la Cuenta Administrativa se actualizó correctamente.",
                        claseBoton: "btn-modal-activar"
                    });
                    renderizarBitacoraAuditoria();
                } catch (err) {
                    errorCuenta.textContent = err.message || "Error al actualizar la cuenta administrativa.";
                    errorCuenta.hidden = false;
                    inputPasswordActual.focus();
                }
            });

            btnCerrarModal.addEventListener("click", cerrarModal);
            modal.addEventListener("click", (e) => {
                if (e.target === modal) cerrarModal();
            });
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && !modal.hidden) cerrarModal();
            });

            async function renderizarBitacoraAuditoria() {
                const filtro = selectFiltroAuditoria ? selectFiltroAuditoria.value : "todos";
                const tbody = document.getElementById("tbody-auditoria-sistema");
                if (!tbody || !window.AxionApi) return;

                function agregarFilaMensaje(texto) {
                    const tr = document.createElement("tr");
                    const td = document.createElement("td");
                    td.colSpan = 5;
                    td.textContent = texto;
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                }

                try {
                    const page = await window.AxionApi.get(`/auditoria?modulo=${encodeURIComponent(filtro)}&page=0&size=50`);
                    tbody.textContent = "";
                    if (!page || !Array.isArray(page.content) || page.content.length === 0) {
                        agregarFilaMensaje("No hay registros para el módulo seleccionado.");
                        return;
                    }
                    page.content.forEach((item) => {
                        const tr = document.createElement("tr");
                        const fecha = item.fechaHora ? new Date(item.fechaHora).toLocaleString("es-PE") : "";
                        const detalle = item.valorAnterior ? `${item.valorAnterior} → ${item.valorNuevo}` : (item.valorNuevo || "");
                        [fecha, item.modulo || "", item.parametro || "", detalle, item.usuario || ""].forEach((valor) => {
                            const td = document.createElement("td");
                            td.textContent = String(valor);
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                } catch {
                    tbody.textContent = "";
                    agregarFilaMensaje("No se pudo cargar la bitácora desde el servidor.");
                }
            }

            if (selectFiltroAuditoria) {
                selectFiltroAuditoria.addEventListener("change", renderizarBitacoraAuditoria);
            }

            if (btnExportarAuditoria) {
                btnExportarAuditoria.addEventListener("click", async () => {
                    const filtro = selectFiltroAuditoria ? selectFiltroAuditoria.value : "todos";
                    try {
                        await window.AxionApi.download(
                            `/auditoria/exportar?modulo=${encodeURIComponent(filtro)}`,
                            `axion_auditoria_${new Date().toISOString().slice(0, 10)}.csv`
                        );
                        mostrarToast("Bitácora de auditoría descargada en formato CSV.");
                    } catch (err) {
                        mostrarToast(err.message || "No se pudo exportar la bitácora de auditoría.");
                    }
                });
            }

            cargarPreferenciasDesdeBackend();
            renderizarBitacoraAuditoria();
        })();
    } finally {
        document.addEventListener = __origDocAdd;
        window.addEventListener = __origWinAdd;
        window.MutationObserver = __OrigMO;
    }

    return () => {
        __docListeners.forEach(([t, fn, opts]) => document.removeEventListener(t, fn, opts));
        __winListeners.forEach(([t, fn, opts]) => window.removeEventListener(t, fn, opts));
        __observers.forEach((obs) => obs.disconnect());
    };
}
