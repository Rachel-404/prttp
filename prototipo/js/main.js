document.addEventListener("DOMContentLoaded", async () => {
    const headerContainer = document.getElementById("header-container");
    const sidebarContainer = document.getElementById("sidebar-container");
    const footerContainer = document.getElementById("footer-container");

    try {
        // 1. Cargar fragmentos de Header, Sidebar y Footer
        if (headerContainer) {
            const resHeader = await fetch("fragmentos/header.html");
            if (!resHeader.ok) throw new Error(`No se pudo cargar header.html (HTTP ${resHeader.status})`);
            headerContainer.innerHTML = await resHeader.text();
        }

        if (sidebarContainer) {
            const resSidebar = await fetch("fragmentos/sidebar.html");
            if (!resSidebar.ok) throw new Error(`No se pudo cargar sidebar.html (HTTP ${resSidebar.status})`);
            sidebarContainer.innerHTML = await resSidebar.text();
        }

        if (footerContainer) {
            const resFooter = await fetch("fragmentos/footer.html");
            if (!resFooter.ok) throw new Error(`No se pudo cargar footer.html (HTTP ${resFooter.status})`);
            footerContainer.innerHTML = await resFooter.text();
        }

        // 2. Inicializar animación del botón de Login en el Header
        if (headerContainer) {
            const btnInicio = headerContainer.querySelector(".btn-login");
            const txtLogin = headerContainer.querySelector(".txt-login");
            const icnPerfil = headerContainer.querySelector(".icono-perfil");

            if (btnInicio && txtLogin && icnPerfil) {
                btnInicio.addEventListener("click", () => {
                    const activado = btnInicio.classList.toggle("intercambiado");
                    if (activado) {
                        const gap = 10;
                        const moverIcono = -(txtLogin.offsetWidth + gap);
                        const moverTexto = icnPerfil.offsetWidth + gap;
                        icnPerfil.style.transform = `translateX(${moverIcono}px)`;
                        txtLogin.style.transform = `translateX(${moverTexto}px)`;
                    } else {
                        icnPerfil.style.transform = "translateX(0)";
                        txtLogin.style.transform = "translateX(0)";
                    }
                });
            }
        }

        // 3. Inicializar lógica del Sidebar (Push Layout, Acordeón y Selección de Ítems)
        inicializarSidebar();

    } catch (error) {
        console.error("Error al cargar fragmentos:", error);
        if (window.location.protocol === "file:") {
            console.warn("Abre index.html usando un servidor local (por ejemplo, Live Server o 'python -m http.server') para que fetch() pueda cargar los fragmentos.");
        }
    }
});

/**
 * Inicializa el Sidebar haciendo que ocupe espacio real en la pantalla (empujando el body),
 * controla el acordeón de sensores y el estado activo de los ítems.
 */
function inicializarSidebar() {
    const btnAbrirSidebar = document.getElementById("sidebar"); // Botón hamburguesa en header.html
    const btnCerrarSidebar = document.getElementById("btn-cerrar");
    const menuLateral = document.getElementById("menu-lateral");

    // Acordeón de Configuración de Sensores
    const itemAcordeon = document.getElementById("acordeon-sensores");
    const btnAcordeon = document.getElementById("btn-acordeon-sensores");

    // Ítems seleccionables del menú
    const navItems = document.querySelectorAll("[data-nav-item]");
    const subItems = document.querySelectorAll("[data-sub-item]");

    if (!menuLateral) return;

    // --- A. Apertura y cierre del Sidebar ocupando espacio en pantalla (Push Layout) ---
    function cerrarMenu() {
        menuLateral.classList.remove("activo");
        document.body.classList.remove("sidebar-abierto");
    }

    function toggleMenu() {
        const abierto = menuLateral.classList.toggle("activo");
        document.body.classList.toggle("sidebar-abierto", abierto);
    }

    if (btnAbrirSidebar) btnAbrirSidebar.addEventListener("click", toggleMenu);
    if (btnCerrarSidebar) btnCerrarSidebar.addEventListener("click", cerrarMenu);

    // Cerrar con tecla Escape por accesibilidad UX
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menuLateral.classList.contains("activo")) {
            cerrarMenu();
        }
    });

    // --- B. Acordeón "Configuración de Sensores" ---
    if (btnAcordeon && itemAcordeon) {
        btnAcordeon.addEventListener("click", () => {
            const estaAbierto = itemAcordeon.classList.toggle("abierto");
            btnAcordeon.setAttribute("aria-expanded", estaAbierto ? "true" : "false");
        });
    }

    // --- C. Gestión del estado visual activo (.activo) en ítems principales ---
    navItems.forEach((link) => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href") || "";
            if (href === "#usuarios-roles") {
                e.preventDefault();
                window.location.href = "usuario/usuarios.html";
                return;
            }

            e.preventDefault();
            const yaActivo = link.classList.contains("activo");

            navItems.forEach((el) => el.classList.remove("activo"));
            subItems.forEach((el) => el.classList.remove("activo"));
            if (btnAcordeon) btnAcordeon.classList.remove("activo");

            if (!yaActivo) {
                link.classList.add("activo");
            }
        });
    });

    // --- D. Gestión del estado visual activo (.activo) en sub-opciones de sensores ---
    subItems.forEach((subLink) => {
        subLink.addEventListener("click", (e) => {
            e.preventDefault();

            const yaActivo = subLink.classList.contains("activo");

            navItems.forEach((el) => el.classList.remove("activo"));
            subItems.forEach((el) => el.classList.remove("activo"));

            if (!yaActivo) {
                subLink.classList.add("activo");
                // Resalta también la cabecera del acordeón padre para indicar sección activa
                if (btnAcordeon) btnAcordeon.classList.add("activo");
            } else {
                if (btnAcordeon) btnAcordeon.classList.remove("activo");
            }
        });
    });
}
