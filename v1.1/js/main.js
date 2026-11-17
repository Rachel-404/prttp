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

function esRutaProtegidaAdmin(pathname) {
    const p = String(pathname || "").toLowerCase();
    if (!p.includes("/views/")) return false;
    if (p.includes("/views/reportes/")) return false;
    return true;
}

function verificarAccesoRutaActual() {
    if (obtenerSesionActiva()) return true;
    if (esRutaProtegidaAdmin(window.location.pathname)) {
        const destino = new URL("login.html", BASE_URL);
        destino.searchParams.set("redirect", window.location.href);
        window.location.replace(destino.href);
        return false;
    }
    return true;
}

window.AxionAuth = {
    obtenerSesionActiva,
    esAdministrador: () => Boolean(obtenerSesionActiva())
};

verificarAccesoRutaActual();

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
            window.location.href = new URL("index.html", BASE_URL).href;
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
        const raw = localStorage.getItem(CLAVE_TIPOGRAFIA) || localStorage.getItem("axion_proto_tipografia");
        if (!raw) return;
        const prefs = JSON.parse(raw);
        if (prefs.title) document.documentElement.style.setProperty("--font-size-title", prefs.title);
        if (prefs.subtitle) document.documentElement.style.setProperty("--font-size-subtitle", prefs.subtitle);
        if (prefs.base) document.documentElement.style.setProperty("--font-size-base", prefs.base);
    } catch (e) {
        console.warn("No se pudo aplicar la tipografía guardada:", e);
    }
}

aplicarTipografiaGuardada();

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
            inicializarCentroAlertas(headerContainer);
        }
    });

    cargarComponente("views/partials/sidebar.html", "contenedor-sidebar").then(() => {
        const sidebarContainer = document.getElementById("contenedor-sidebar");
        if (!sidebarContainer) return;
        const autenticado = Boolean(obtenerSesionActiva());
        sidebarContainer.querySelectorAll('[data-solo-admin="true"]').forEach((el) => {
            el.hidden = !autenticado;
        });
        const labelReportes = sidebarContainer.querySelector("#sidebar-label-reportes");
        if (labelReportes && !autenticado) {
            labelReportes.textContent = "Reportes e Investigación";
        }

        const btnToggleConfig = sidebarContainer.querySelector("#btn-toggle-config-nav");
        const submenuSensores = sidebarContainer.querySelector("#submenu-sensores");

        if (btnToggleConfig && submenuSensores) {
            btnToggleConfig.addEventListener("click", () => {
                const abierto = !submenuSensores.hidden;
                submenuSensores.hidden = abierto;
                btnToggleConfig.setAttribute("aria-expanded", abierto ? "false" : "true");
            });
        }

        const rutaActual = window.location.pathname.replace(/\/index\.html$/i, "/");
        sidebarContainer.querySelectorAll("a[href]").forEach((enlace) => {
            try {
                const rutaEnlace = new URL(enlace.href, window.location.origin).pathname.replace(/\/index\.html$/i, "/");
                if (rutaActual === rutaEnlace) {
                    const itemSubmenu = enlace.closest(".opcionII");
                    if (itemSubmenu) {
                        itemSubmenu.classList.add("activo");
                        if (submenuSensores && btnToggleConfig) {
                            submenuSensores.hidden = false;
                            btnToggleConfig.setAttribute("aria-expanded", "true");
                        }
                    } else {
                        enlace.classList.add("activo");
                    }
                }
            } catch (e) {
                // Ignorar URLs inválidas
            }
        });
    });
});

function inicializarCentroAlertas(headerContainer) {
    const CLAVE_ALERTAS = "axion_proto_alertas";
    const ALERTAS_DEFAULT = [
        {
            id: "alerta-1",
            nivel: "critico",
            titulo: "pH RS485 fuera de umbral",
            detalle: "Lectura: 6.85 pH (Máx: 6.50 pH)",
            tiempo: "Hace 14 min",
            leida: false,
            urlDestino: "views/sensores/ph/index.html"
        },
        {
            id: "alerta-2",
            nivel: "advertencia",
            titulo: "Desconexión temporal PT100",
            detalle: "Resistencia fuera de rango (Circuito abierto)",
            tiempo: "Hace 2 h",
            leida: false,
            urlDestino: "views/sensores/nivel-temperatura/index.html?tab=temperatura"
        },
        {
            id: "alerta-3",
            nivel: "normal",
            titulo: "Sincronización Buffer Offline",
            detalle: "142 tramas enviadas tras reconexión Wi-Fi",
            tiempo: "Ayer, 18:30",
            leida: true,
            urlDestino: "views/nodo-maestro/index.html"
        }
    ];

    const btnAlertas = headerContainer.querySelector("#btn-alertas-header");
    const badgeCount = headerContainer.querySelector("#badge-alertas-count");
    const dropdown = headerContainer.querySelector("#dropdown-alertas-header");
    const lista = headerContainer.querySelector("#lista-alertas-header");
    const btnMarcarTodas = headerContainer.querySelector("#btn-marcar-todas-leidas");

    if (!btnAlertas || !dropdown || !lista) return;

    function leerAlertas() {
        if (window.AxionCache) {
            const cacheList = window.AxionCache.leerDeCache("alertas", ALERTAS_DEFAULT);
            if (Array.isArray(cacheList) && cacheList.length) {
                return cacheList.map((a, idx) => ({
                    ...ALERTAS_DEFAULT[idx],
                    ...a,
                    urlDestino: a.urlDestino || ALERTAS_DEFAULT[idx]?.urlDestino || "index.html"
                }));
            }
        }
        try {
            const raw = localStorage.getItem(CLAVE_ALERTAS);
            if (!raw) return ALERTAS_DEFAULT.map((a) => ({ ...a }));
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) && parsed.length
                ? parsed.map((a, idx) => ({
                      ...ALERTAS_DEFAULT[idx],
                      ...a,
                      urlDestino: a.urlDestino || ALERTAS_DEFAULT[idx]?.urlDestino || "index.html"
                  }))
                : ALERTAS_DEFAULT.map((a) => ({ ...a }));
        } catch (e) {
            return ALERTAS_DEFAULT.map((a) => ({ ...a }));
        }
    }

    function guardarAlertas(alertas) {
        if (window.AxionCache) {
            window.AxionCache.guardarEnCache("alertas", alertas);
            return;
        }
        try {
            localStorage.setItem(CLAVE_ALERTAS, JSON.stringify(alertas));
        } catch (e) {
            console.warn("No se pudo guardar alertas:", e);
        }
    }

    function renderizarAlertas() {
        const alertas = leerAlertas();
        const noLeidas = alertas.filter((a) => !a.leida).length;

        if (badgeCount) {
            badgeCount.textContent = String(noLeidas);
            badgeCount.hidden = noLeidas === 0;
        }

        lista.innerHTML = "";
        alertas.forEach((alerta) => {
            const li = document.createElement("li");
            li.className = `item-alerta-header alerta-${alerta.nivel}${alerta.leida ? " alerta-leida" : ""}`;
            li.setAttribute("role", "button");
            li.setAttribute("tabindex", "0");
            li.dataset.alertaId = alerta.id;
            li.dataset.urlDestino = alerta.urlDestino || "index.html";
            li.innerHTML = `
                <div class="cabecera-item-alerta">
                    <span class="titulo-item-alerta">${alerta.titulo}</span>
                    ${alerta.leida ? "" : '<span class="punto-alerta-no-leida" aria-hidden="true"></span>'}
                </div>
                <span class="detalle-item-alerta">${alerta.detalle}</span>
                <div class="pie-item-alerta">
                    <span>${alerta.tiempo}</span>
                </div>
            `;
            lista.appendChild(li);
        });
    }

    function activarAlerta(itemEl) {
        if (!itemEl) return;
        const id = itemEl.dataset.alertaId;
        const destinoRel = itemEl.dataset.urlDestino || "index.html";
        const alertas = leerAlertas().map((a) => (a.id === id ? { ...a, leida: true } : a));
        guardarAlertas(alertas);
        renderizarAlertas();
        if (obtenerSesionActiva()) {
            window.location.href = new URL(destinoRel, BASE_URL).href;
        }
    }

    btnAlertas.addEventListener("click", (e) => {
        e.stopPropagation();
        const abierto = !dropdown.hidden;
        dropdown.hidden = abierto;
        btnAlertas.setAttribute("aria-expanded", abierto ? "false" : "true");
    });

    lista.addEventListener("click", (e) => {
        const item = e.target.closest(".item-alerta-header");
        if (item) activarAlerta(item);
    });

    lista.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            const item = e.target.closest(".item-alerta-header");
            if (item) {
                e.preventDefault();
                activarAlerta(item);
            }
        }
    });

    if (btnMarcarTodas) {
        btnMarcarTodas.addEventListener("click", () => {
            const alertas = leerAlertas().map((a) => ({ ...a, leida: true }));
            guardarAlertas(alertas);
            renderizarAlertas();
        });
    }

    document.addEventListener("click", (e) => {
        if (!dropdown.hidden && !dropdown.contains(e.target) && !btnAlertas.contains(e.target)) {
            dropdown.hidden = true;
            btnAlertas.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !dropdown.hidden) {
            dropdown.hidden = true;
            btnAlertas.setAttribute("aria-expanded", "false");
        }
    });

    window.addEventListener("axion:alertasActualizadas", renderizarAlertas);

    renderizarAlertas();
}
