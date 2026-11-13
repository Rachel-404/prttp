// Calcula la ruta base de v1.1/ sin importar en qué subcarpeta esté el HTML actual
const BASE_URL = document.currentScript
    ? new URL("../", document.currentScript.src).href
    : "./";

const CLAVE_TEMA = "axion_tema";
const CLAVE_TIPOGRAFIA = "axion_tipografia";

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
        }
    });

    cargarComponente("views/partials/sidebar.html", "contenedor-sidebar").then(() => {
        const itemsDesplegables = document.querySelectorAll(".sidebar-item-desplegable");
        itemsDesplegables.forEach((item) => {
            const boton = item.querySelector(".contenedor-opcion");
            if (boton) {
                boton.addEventListener("click", (e) => {
                    e.preventDefault();
                    item.classList.toggle("abierto");
                });
            }
        });
    });
});
