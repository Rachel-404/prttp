document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_TEMA_LOCAL = "axion_tema";
    const CLAVE_TIPOGRAFIA_LOCAL = "axion_tipografia";
    const CLAVE_CUENTA_ADMIN = "axion_cuenta_admin";

    const DEFAULTS_TIPOGRAFIA_PX = {
        titlePx: 24,
        subtitlePx: 18,
        basePx: 14
    };

    // Referencias DOM - Bloque 1: Apariencia y Accesibilidad
    const formApariencia = document.getElementById("form-apariencia");
    const selectTema = document.getElementById("select-tema-general");
    const inputFontTitle = document.getElementById("input-font-title");
    const inputFontSubtitle = document.getElementById("input-font-subtitle");
    const inputFontBase = document.getElementById("input-font-base");

    // Referencias DOM - Bloque 2: Cuenta Administrativa
    const formCuenta = document.getElementById("form-cuenta-admin");
    const displayCorreo = document.getElementById("perfil-correo-display");
    const inputNombreVisible = document.getElementById("nombre-visible");
    const inputCorreoAlertas = document.getElementById("correo-alertas");
    const inputExpiracion = document.getElementById("expiracion-sesion");
    const inputPasswordActual = document.getElementById("password-actual");
    const errorCuenta = document.getElementById("error-cuenta-admin");
    const enlaceRegenerar = document.getElementById("enlace-regenerar-seguridad");

    // Referencias DOM - Modal y Toast
    const modal = document.getElementById("modal-config-general");
    const modalTitulo = document.getElementById("modal-config-titulo");
    const modalMensaje = document.getElementById("modal-config-mensaje");
    const btnCerrarModal = document.getElementById("btn-modal-cerrar-config");
    const toast = document.getElementById("toast-config");

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

    function leerTamanoPx(input, min, max, fallback) {
        const num = Number.parseFloat(input.value);
        if (!Number.isFinite(num)) return fallback;
        return Math.min(max, Math.max(min, Math.round(num)));
    }

    function aplicarVariablesTipograficas() {
        const root = document.documentElement;
        const titlePx = leerTamanoPx(inputFontTitle, 16, 48, DEFAULTS_TIPOGRAFIA_PX.titlePx);
        const subtitlePx = leerTamanoPx(inputFontSubtitle, 12, 32, DEFAULTS_TIPOGRAFIA_PX.subtitlePx);
        const basePx = leerTamanoPx(inputFontBase, 10, 24, DEFAULTS_TIPOGRAFIA_PX.basePx);

        const valTitle = `${titlePx}px`;
        const valSubtitle = `${subtitlePx}px`;
        const valBase = `${basePx}px`;

        root.style.setProperty("--font-size-title", valTitle);
        root.style.setProperty("--font-size-subtitle", valSubtitle);
        root.style.setProperty("--font-size-base", valBase);

        return {
            titlePx,
            subtitlePx,
            basePx,
            title: valTitle,
            subtitle: valSubtitle,
            base: valBase
        };
    }

    function aplicarTemaSeleccionado(modo) {
        let esClaro = modo === "claro";
        if (modo === "sistema") {
            esClaro = Boolean(
                window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
            );
        }

        document.body.classList.toggle("tema-claro", esClaro);

        const btnNavbarTema = document.querySelector("#contenedor-navbar .btn-tema");
        const iconoNavbarTema = document.querySelector(
            "#contenedor-navbar .icono-tema .material-symbols-outlined"
        );
        if (btnNavbarTema) btnNavbarTema.classList.toggle("modo-claro", esClaro);
        if (iconoNavbarTema) iconoNavbarTema.textContent = esClaro ? "light_mode" : "dark_mode";
    }

    function actualizarEtiquetasOpcionesTema(modoActual) {
        Array.from(selectTema.options).forEach((opt) => {
            if (opt.value === "oscuro") {
                opt.textContent = modoActual === "oscuro" ? "Modo Oscuro (Actual)" : "Modo Oscuro";
            } else if (opt.value === "claro") {
                opt.textContent = modoActual === "claro" ? "Modo Claro (Actual)" : "Modo Claro";
            } else if (opt.value === "sistema") {
                opt.textContent =
                    modoActual === "sistema"
                        ? "Sincronizar con el Sistema (Actual)"
                        : "Sincronizar con el Sistema";
            }
        });
    }

    function cargarPreferenciasIniciales() {
        const modoTema = localStorage.getItem(CLAVE_TEMA_LOCAL) || "oscuro";
        if (["oscuro", "claro", "sistema"].includes(modoTema)) {
            selectTema.value = modoTema;
        }
        actualizarEtiquetasOpcionesTema(selectTema.value);

        try {
            const rawTipo = localStorage.getItem(CLAVE_TIPOGRAFIA_LOCAL);
            if (rawTipo) {
                const tipo = JSON.parse(rawTipo);
                if (Number.isFinite(Number(tipo.titlePx))) inputFontTitle.value = String(tipo.titlePx);
                if (Number.isFinite(Number(tipo.subtitlePx))) inputFontSubtitle.value = String(tipo.subtitlePx);
                if (Number.isFinite(Number(tipo.basePx))) inputFontBase.value = String(tipo.basePx);
            }
        } catch (err) {
            console.warn("No se pudo restaurar la tipografía:", err);
        }
        aplicarVariablesTipograficas();

        try {
            const rawCuenta = localStorage.getItem(CLAVE_CUENTA_ADMIN);
            if (rawCuenta) {
                const cuenta = JSON.parse(rawCuenta);
                if (cuenta.nombreVisible) inputNombreVisible.value = cuenta.nombreVisible;
                if (cuenta.correoAlertas) {
                    inputCorreoAlertas.value = cuenta.correoAlertas;
                    if (displayCorreo) displayCorreo.textContent = cuenta.correoAlertas;
                }
                if (Number.isFinite(Number(cuenta.expiracionMinutos))) {
                    inputExpiracion.value = String(cuenta.expiracionMinutos);
                }
            }
        } catch (err) {
            console.warn("No se pudo restaurar la cuenta administrativa:", err);
        }
    }

    // Actualización de variables CSS tipográficas en tiempo real al escribir o cambiar valor
    [inputFontTitle, inputFontSubtitle, inputFontBase].forEach((campo) => {
        if (!campo) return;
        campo.addEventListener("input", () => {
            aplicarVariablesTipograficas();
        });
    });

    // Vista previa en tiempo real al cambiar tema en el selector
    selectTema.addEventListener("change", () => {
        aplicarTemaSeleccionado(selectTema.value);
    });

    // Bloque 1 - Guardar Apariencia
    formApariencia.addEventListener("submit", (e) => {
        e.preventDefault();
        const modoTema = selectTema.value;
        const prefsTipografia = aplicarVariablesTipograficas();

        aplicarTemaSeleccionado(modoTema);
        actualizarEtiquetasOpcionesTema(modoTema);

        localStorage.setItem(CLAVE_TEMA_LOCAL, modoTema);
        localStorage.setItem(CLAVE_TIPOGRAFIA_LOCAL, JSON.stringify(prefsTipografia));

        mostrarToast("Apariencia y tipografía aplicadas.");
    });

    // Sincronizar si el usuario cambia el tema desde el switch de la barra superior
    const observadorTemaNavbar = new MutationObserver(() => {
        const esClaro = document.body.classList.contains("tema-claro");
        const modoGuardado = localStorage.getItem(CLAVE_TEMA_LOCAL);
        if (modoGuardado === "claro" || modoGuardado === "oscuro") {
            selectTema.value = esClaro ? "claro" : "oscuro";
            actualizarEtiquetasOpcionesTema(selectTema.value);
        }
    });
    observadorTemaNavbar.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // Bloque 2 - Regenerar Token / Cambiar Contraseña
    if (enlaceRegenerar) {
        enlaceRegenerar.addEventListener("click", (e) => {
            e.preventDefault();
            const nuevoToken = `axn_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
            abrirModal({
                titulo: "Token de Acceso Regenerado",
                mensaje: `Se generó un nuevo token temporal de sesión administrativa (${nuevoToken}). Para cambiar tu contraseña, ingresa primero tu contraseña actual y guarda los cambios.`,
                claseBoton: "btn-modal-activar"
            });
        });
    }

    // Bloque 2 - Validación y guardado de Cuenta Administrativa
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

    formCuenta.addEventListener("submit", (e) => {
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

        // Validación de seguridad obligatoria mediante modal limpio
        if (!passwordActual) {
            abrirModal({
                titulo: "Contraseña Requerida",
                mensaje: "Por seguridad, debes ingresar tu Contraseña Actual para confirmar y guardar los cambios de la cuenta administrativa.",
                claseBoton: "btn-modal-advertencia",
                onCerrar: () => inputPasswordActual.focus()
            });
            return;
        }

        const datosCuenta = {
            nombreVisible,
            correoAlertas,
            expiracionMinutos,
            ultimaActualizacion: new Date().toISOString()
        };
        localStorage.setItem(CLAVE_CUENTA_ADMIN, JSON.stringify(datosCuenta));

        if (displayCorreo) displayCorreo.textContent = correoAlertas;
        inputPasswordActual.value = "";

        abrirModal({
            titulo: "Cambios Guardados",
            mensaje: "La configuración de la Cuenta Administrativa (Admin Único) se actualizó correctamente.",
            claseBoton: "btn-modal-activar"
        });
    });

    btnCerrarModal.addEventListener("click", cerrarModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) cerrarModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.hidden) {
            cerrarModal();
        }
    });

    cargarPreferenciasIniciales();
});

