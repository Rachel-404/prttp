document.addEventListener("DOMContentLoaded", () => {
    const cargarComponente = (url, contenedorId) => {
        return fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Error al cargar ${url}`);
                return response.text();
            })
            .then(html => {
                const contenedor = document.getElementById(contenedorId);
                if (contenedor) {
                    contenedor.innerHTML = html;
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
                btnTema.addEventListener("click", () => {
                    const esClaro = btnTema.classList.toggle("modo-claro");
                    document.body.classList.toggle("tema-claro", esClaro);
                    iconoTemaSpan.textContent = esClaro ? "light_mode" : "dark_mode";
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
