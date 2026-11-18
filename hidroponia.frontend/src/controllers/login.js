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
    const formRecuperar = document.getElementById("form-recuperar-acceso");
    const btnCerrarRecuperar = document.getElementById("btn-cerrar-recuperar");
    const toastLogin = document.getElementById("toast-login");
    let toastTimer = null;

    function mostrarToastLogin(mensaje) {
        if (!toastLogin) return;
        toastLogin.textContent = mensaje;
        toastLogin.hidden = false;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastLogin.hidden = true;
        }, 4000);
    }

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

    if (formRecuperar) {
        formRecuperar.addEventListener("submit", async (e) => {
            e.preventDefault();
            const tokenRecuperacion = document.getElementById("rec-token")?.value?.trim() || "";
            const nuevaPassword = document.getElementById("rec-password-nueva")?.value?.trim() || "";
            const confirmar = document.getElementById("rec-password-confirmar")?.value?.trim() || "";

            if (nuevaPassword && confirmar && nuevaPassword !== confirmar) {
                mostrarToastLogin("Las contraseñas nuevas no coinciden.");
                return;
            }

            if (window.AxionApi && tokenRecuperacion && nuevaPassword) {
                try {
                    const res = await window.AxionApi.post("/auth/recuperar", {
                        tokenRecuperacion,
                        nuevaPassword
                    });
                    formRecuperar.reset();
                    cerrarModalRecuperar();
                    mostrarToastLogin(res.mensaje || "Contraseña restablecida correctamente.");
                    return;
                } catch (err) {
                    if (!err.isNetworkError) {
                        mostrarToastLogin(err.message || "Token de recuperación inválido.");
                        return;
                    }
                }
            }

            formRecuperar.reset();
            cerrarModalRecuperar();
            mostrarToastLogin("Contraseña restablecida (modo local). Ya puedes iniciar sesión.");
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalRecuperar && !modalRecuperar.hidden) {
            cerrarModalRecuperar();
        }
    });

    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
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

            let jwtToken = null;
            let autenticadoPorBackend = false;

            if (window.AxionApi) {
                try {
                    const res = await window.AxionApi.post("/auth/login", { correo, password });
                    jwtToken = res.token;
                    autenticadoPorBackend = true;
                } catch (err) {
                    if (!err.isNetworkError) {
                        mostrarFeedback(
                            "error",
                            err.message || "Credenciales incorrectas. Verifica tu correo institucional y contraseña."
                        );
                        if (inputPassword) inputPassword.focus();
                        return;
                    }
                }
            }

            if (!autenticadoPorBackend) {
                const correoAutorizado = obtenerCorreoAutorizado();
                let passwordAutorizada = CREDENCIAL_ADMIN.passwordDemo;
                try {
                    const rawCuenta = localStorage.getItem(CLAVE_CUENTA_ADMIN);
                    if (rawCuenta) {
                        const cuenta = JSON.parse(rawCuenta);
                        if (cuenta && typeof cuenta.passwordAdmin === "string" && cuenta.passwordAdmin.length > 0) {
                            passwordAutorizada = cuenta.passwordAdmin;
                        }
                    }
                } catch (err) {
                    console.warn("No se pudo leer la contraseña administrativa:", err);
                }

                const esCorreoValido =
                    correo === CREDENCIAL_ADMIN.correoDefecto || correo === correoAutorizado;
                const esPasswordValida = password === passwordAutorizada;

                if (!esCorreoValido || !esPasswordValida) {
                    mostrarFeedback(
                        "error",
                        "Credenciales incorrectas. Verifica tu correo institucional y contraseña."
                    );
                    if (inputPassword) inputPassword.focus();
                    return;
                }
            }

            const mantenerSesion = Boolean(checkRecordar && checkRecordar.checked);
            const payloadSesion = JSON.stringify({
                autenticado: true,
                rol: "Administrador Único",
                correo,
                token: jwtToken,
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
            if (typeof window.AxionSincronizarSesion === "function") {
                window.AxionSincronizarSesion();
            }

            if (btnIngresar) btnIngresar.disabled = true;
            mostrarFeedback("exito", "Acceso autorizado. Redirigiendo al dashboard principal...");

            setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                const redirect = params.get("redirect");
                if (redirect) {
                    if (typeof window.AxionNavigate === "function") {
                        window.AxionNavigate(redirect);
                        return;
                    }
                    try {
                        const urlDestino = new URL(redirect, window.location.href);
                        if (urlDestino.origin === window.location.origin) {
                            window.location.href = urlDestino.href;
                            return;
                        }
                    } catch (e) {
                        // Ruta inválida; usar fallback
                    }
                }
                if (typeof window.AxionNavigate === "function") {
                    window.AxionNavigate("/");
                } else {
                    window.location.href = "/";
                }
            }, 650);
        });
    }

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
