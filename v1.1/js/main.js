// Calcula la ruta base de v1.1/ sin importar en qué subcarpeta esté el HTML actual
const BASE_URL = document.currentScript
    ? new URL("../", document.currentScript.src).href
    : "./";

const CLAVE_TEMA = "axion_tema";
const CLAVE_TIPOGRAFIA = "axion_tipografia";
const CLAVE_SESION_ADMIN = "axion_sesion_activa";

function obtenerSesionActiva() {
    try {
        const raw =
            localStorage.getItem(CLAVE_SESION_ADMIN) ||
            sessionStorage.getItem(CLAVE_SESION_ADMIN);
        if (!raw) return null;
        const datos = JSON.parse(raw);
        return datos && datos.autenticado === true ? datos : null;
    } catch (e) {
        console.warn("No se pudo leer el estado de sesión:", e);
        return null;
    }
}

function inicializarSesionHeader(headerContainer) {
    if (!headerContainer) return;

    const btnLogin = headerContainer.querySelector("#btn-header-login");
    const contenedorActivo = headerContainer.querySelector("#contenedor-sesion-activa");
    const btnDropdown = headerContainer.querySelector("#btn-perfil-dropdown");
    const menuDropdown = headerContainer.querySelector("#menu-perfil-header");
    const btnCerrarSesion = headerContainer.querySelector("#btn-cerrar-sesion");

    if (!btnLogin || !contenedorActivo || !btnDropdown || !menuDropdown) return;

    const sesion = obtenerSesionActiva();
    const autenticado = Boolean(sesion);

    btnLogin.hidden = autenticado;
    contenedorActivo.hidden = !autenticado;

    const cerrarMenu = (devolverFoco = false) => {
        menuDropdown.hidden = true;
        btnDropdown.setAttribute("aria-expanded", "false");
        if (devolverFoco) btnDropdown.focus();
    };

    if (autenticado) {
        btnDropdown.addEventListener("click", (e) => {
            e.stopPropagation();
            const abierto = !menuDropdown.hidden;
            menuDropdown.hidden = abierto;
            btnDropdown.setAttribute("aria-expanded", abierto ? "false" : "true");
        });

        document.addEventListener("click", (e) => {
            if (!contenedorActivo.contains(e.target) && !menuDropdown.hidden) {
                cerrarMenu(false);
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !menuDropdown.hidden) {
                cerrarMenu(true);
            }
        });
    }

    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", () => {
            localStorage.removeItem(CLAVE_SESION_ADMIN);
            sessionStorage.removeItem(CLAVE_SESION_ADMIN);
            window.location.href = new URL("login.html", BASE_URL).href;
        });
    }
}

function resolverTemaClaro(modo) {
    if (modo === "sistema") {
        return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
    }
    return modo === "claro";
}

function aplicarTipografiaGuardada() {
    try {
        const raw = localStorage.getItem(CLAVE_TIPOGRAFIA);
        if (!raw) return;
        const prefs = JSON.parse(raw);
        if (prefs.title) document.documentElement.style.setProperty("--font-size-title", prefs.title);
        if (prefs.subtitle) document.documentElement.style.setProperty("--font-size-subtitle", prefs.subtitle);
        if (prefs.base) document.documentElement.style.setProperty("--font-size-base", prefs.base);
    } catch (e) {
        console.warn("No se pudo aplicar la tipografía guardada:", e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Aplica el tema y tipografía guardados en localStorage antes de cargar fragmentos
    const modoGuardado = localStorage.getItem(CLAVE_TEMA) || "oscuro";
    document.body.classList.toggle("tema-claro", resolverTemaClaro(modoGuardado));
    aplicarTipografiaGuardada();

    const resolverRutasRelativas = (contenedor) => {
        const esUrlExternaOAncla = (valor) =>
            !valor ||
            valor.startsWith("#") ||
            valor.startsWith("/") ||
            /^(https?:)?\/\//i.test(valor) ||
            /^(mailto:|tel:|data:|javascript:)/i.test(valor);

        contenedor.querySelectorAll("[src]").forEach((el) => {
            const src = el.getAttribute("src");
            if (!esUrlExternaOAncla(src)) {
                el.setAttribute("src", new URL(src, BASE_URL).href);
            }
        });

        contenedor.querySelectorAll("a[href]").forEach((el) => {
            const href = el.getAttribute("href");
            if (!esUrlExternaOAncla(href)) {
                el.setAttribute("href", new URL(href, BASE_URL).href);
            }
        });
    };

    const cargarComponente = (rutaRelativa, contenedorId) => {
        const url = new URL(rutaRelativa, BASE_URL).href;
        return fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Error al cargar ${url}`);
                return response.text();
            })
            .then(html => {
                const contenedor = document.getElementById(contenedorId);
                if (contenedor) {
                    contenedor.innerHTML = html;
                    resolverRutasRelativas(contenedor);
                }
            })
            .catch(error => console.error(error));
    };

    cargarComponente("views/partials/navbar.html", "contenedor-navbar").then(() => {
        const headerContainer = document.getElementById("contenedor-navbar");
        const btnSidebar = document.getElementById("sidebar");
        const layout = document.querySelector(".layout-container");
        const sidebar = document.getElementById("contenedor-sidebar");

        if (btnSidebar && layout && sidebar) {
            btnSidebar.addEventListener("click", () => {
                const oculto = sidebar.classList.toggle("oculto");
                layout.style.gridTemplateColumns = oculto ? "0px minmax(0, 1fr)" : "250px minmax(0, 1fr)";
                sidebar.style.overflow = oculto ? "hidden" : "";
            });
        }

        if (headerContainer) {
            const btnTema = headerContainer.querySelector(".btn-tema");
            const iconoTemaSpan = headerContainer.querySelector(".icono-tema .material-symbols-outlined");

            if (btnTema && iconoTemaSpan) {
                const sincronizarBotonTema = (esClaro) => {
                    btnTema.classList.toggle("modo-claro", esClaro);
                    document.body.classList.toggle("tema-claro", esClaro);
                    iconoTemaSpan.textContent = esClaro ? "light_mode" : "dark_mode";
                };

                // Sincroniza el estado visual del botón al cargar cualquier página
                sincronizarBotonTema(document.body.classList.contains("tema-claro"));

                btnTema.addEventListener("click", () => {
                    const esClaro = !document.body.classList.contains("tema-claro");
                    sincronizarBotonTema(esClaro);
                    localStorage.setItem(CLAVE_TEMA, esClaro ? "claro" : "oscuro");
                });
            }

            inicializarSesionHeader(headerContainer);
        }
    });

    cargarComponente("views/partials/sidebar.html", "contenedor-sidebar");
});
