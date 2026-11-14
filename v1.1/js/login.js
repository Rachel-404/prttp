document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_TEMA = "axion_tema";
    const CLAVE_TIPOGRAFIA = "axion_tipografia";
    const CLAVE_SESION_ADMIN = "axion_sesion_activa";
    const CLAVE_CUENTA_ADMIN = "axion_cuenta_admin";

    const CREDENCIAL_ADMIN = {
        correoDefecto: "admin@universidad.edu",
        passwordDemo: "axion2026"
    };

    const formLogin = document.getElementById("form-login");
    const inputEmail = document.getElementById("login-email");
    const inputPassword = document.getElementById("login-password");
    const btnTogglePassword = document.getElementById("btn-toggle-password");
    const iconoOjoMostrar = document.getElementById("icono-ojo-mostrar");
    const iconoOjoOcultar = document.getElementById("icono-ojo-ocultar");
    const checkRecordar = document.getElementById("login-recordar");
    const btnRecuperar = document.getElementById("btn-recuperar-acceso");
    const feedback = document.getElementById("login-feedback");
    const feedbackTexto = document.getElementById("login-feedback-texto");
    const btnIngresar = document.getElementById("btn-ingresar");

    const modalRecuperar = document.getElementById("modal-recuperar-acceso");
    const btnCerrarRecuperar = document.getElementById("btn-cerrar-recuperar");

    function aplicarPreferenciasVisuales() {
        const modo = localStorage.getItem(CLAVE_TEMA) || "oscuro";
        const esClaro =
            modo === "sistema"
                ? Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)
                : modo === "claro";
        document.body.classList.toggle("tema-claro", esClaro);

        try {
            const rawTipo = localStorage.getItem(CLAVE_TIPOGRAFIA);
            if (!rawTipo) return;
            const prefs = JSON.parse(rawTipo);
            if (prefs.title) document.documentElement.style.setProperty("--font-size-title", prefs.title);
            if (prefs.subtitle) document.documentElement.style.setProperty("--font-size-subtitle", prefs.subtitle);
            if (prefs.base) document.documentElement.style.setProperty("--font-size-base", prefs.base);
        } catch (e) {
            console.warn("No se pudo aplicar la tipografía guardada:", e);
        }
    }

    function obtenerCorreoAutorizado() {
        try {
            const rawCuenta = localStorage.getItem(CLAVE_CUENTA_ADMIN);
            if (rawCuenta) {
                const cuenta = JSON.parse(rawCuenta);
                if (cuenta && cuenta.correoAlertas) {
                    return String(cuenta.correoAlertas).trim().toLowerCase();
                }
            }
        } catch (e) {
            console.warn("No se pudo leer la cuenta administrativa:", e);
        }
        return CREDENCIAL_ADMIN.correoDefecto;
    }

    function mostrarFeedback(tipo, mensaje) {
        if (!feedback || !feedbackTexto) return;
        feedback.classList.remove("es-error", "es-exito");
        feedback.classList.add(tipo === "exito" ? "es-exito" : "es-error");
        feedbackTexto.textContent = mensaje;
        feedback.hidden = false;
    }

    function ocultarFeedback() {
        if (!feedback || !feedbackTexto) return;
        feedback.hidden = true;
        feedback.classList.remove("es-error", "es-exito");
        feedbackTexto.textContent = "";
    }

    function abrirModalRecuperar() {
        if (!modalRecuperar || !btnCerrarRecuperar) return;
        modalRecuperar.hidden = false;
        btnCerrarRecuperar.focus();
    }

    function cerrarModalRecuperar() {
        if (!modalRecuperar) return;
        modalRecuperar.hidden = true;
        if (btnRecuperar) btnRecuperar.focus();
    }

    aplicarPreferenciasVisuales();

    if (btnTogglePassword && inputPassword) {
        btnTogglePassword.addEventListener("click", () => {
            const mostrar = inputPassword.type === "password";
            inputPassword.type = mostrar ? "text" : "password";
            btnTogglePassword.setAttribute("aria-pressed", mostrar ? "true" : "false");
            btnTogglePassword.setAttribute(
                "aria-label",
                mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
            );
            if (iconoOjoMostrar) iconoOjoMostrar.hidden = mostrar;
            if (iconoOjoOcultar) iconoOjoOcultar.hidden = !mostrar;
        });
    }

    [inputEmail, inputPassword].forEach((campo) => {
        if (campo) {
            campo.addEventListener("input", ocultarFeedback);
        }
    });

    if (btnRecuperar) {
        btnRecuperar.addEventListener("click", abrirModalRecuperar);
    }

    if (btnCerrarRecuperar) {
        btnCerrarRecuperar.addEventListener("click", cerrarModalRecuperar);
    }

    if (modalRecuperar) {
        modalRecuperar.addEventListener("click", (e) => {
            if (e.target === modalRecuperar) cerrarModalRecuperar();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalRecuperar && !modalRecuperar.hidden) {
            cerrarModalRecuperar();
        }
    });

    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();
            ocultarFeedback();

            const correo = (inputEmail ? inputEmail.value : "").trim().toLowerCase();
            const password = inputPassword ? inputPassword.value : "";

            if (!correo) {
                mostrarFeedback("error", "Ingresa tu correo institucional para continuar.");
                if (inputEmail) inputEmail.focus();
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                mostrarFeedback("error", "El formato del correo institucional no es válido.");
                if (inputEmail) inputEmail.focus();
                return;
            }

            if (!password.trim()) {
                mostrarFeedback("error", "Ingresa tu contraseña de administrador.");
                if (inputPassword) inputPassword.focus();
                return;
            }

            const correoAutorizado = obtenerCorreoAutorizado();
            const esCorreoValido =
                correo === CREDENCIAL_ADMIN.correoDefecto || correo === correoAutorizado;
            const esPasswordValida = password === CREDENCIAL_ADMIN.passwordDemo;

            if (!esCorreoValido || !esPasswordValida) {
                mostrarFeedback(
                    "error",
                    "Credenciales incorrectas. Verifica tu correo institucional y contraseña."
                );
                if (inputPassword) inputPassword.focus();
                return;
            }

            const mantenerSesion = Boolean(checkRecordar && checkRecordar.checked);
            const payloadSesion = JSON.stringify({
                autenticado: true,
                rol: "Administrador Único",
                correo,
                persistente: mantenerSesion,
                inicioIso: new Date().toISOString()
            });

            localStorage.removeItem(CLAVE_SESION_ADMIN);
            sessionStorage.removeItem(CLAVE_SESION_ADMIN);

            if (mantenerSesion) {
                localStorage.setItem(CLAVE_SESION_ADMIN, payloadSesion);
            } else {
                sessionStorage.setItem(CLAVE_SESION_ADMIN, payloadSesion);
            }

            if (btnIngresar) btnIngresar.disabled = true;
            mostrarFeedback("exito", "Acceso autorizado. Redirigiendo al dashboard principal...");

            setTimeout(() => {
                window.location.href = "index.html";
            }, 650);
        });
    }
});

