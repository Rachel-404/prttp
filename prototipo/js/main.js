document.addEventListener("DOMContentLoaded", () => {
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    fetch("fragmentos/header.html")
        .then(response => {
            if (!response.ok) {
                throw new Error(`No se pudo cargar el header (HTTP ${response.status})`);
            }
            return response.text();
        })
        .then(html => {
            headerContainer.innerHTML = html;

            const btnSidebar = document.getElementById("sidebar");
            if (btnSidebar) {
                btnSidebar.addEventListener("click", () => {
                    alert("click");
                });
            }

            const btnInicio = headerContainer.querySelector(".btn-login");
            const txtLogin = headerContainer.querySelector(".txt-login");
            const icnPerfil = headerContainer.querySelector(".icono-perfil");
            if (!btnInicio || !txtLogin || !icnPerfil) return;

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
            const btnMenu = document.getElementById("btn-menu");
            const btnCerrar = document.getElementById("btn-cerrar");
            const menuLateral = document.getElementById("menu-lateral");
            const overlay = document.getElementById("overlay");

            function toggleMenu() {
                menuLateral.classList.toggle("activo");
                overlay.classList.toggle("activo");
            }

            btnMenu.addEventListener("click", toggleMenu);
            btnCerrar.addEventListener("click", toggleMenu);
            overlay.addEventListener("click", toggleMenu);
        })
        .catch(error => {
            console.error("Error al cargar el header:", error);
            if (window.location.protocol === "file:") {
                console.warn("Abre index.html usando un servidor local (por ejemplo, Live Server o 'python -m http.server') para que fetch() pueda cargar fragmentos/header.html.");
            }
        });

});