/**
 * USUARIOS.JS - Lógica nativa para Gestión de Usuarios, Roles y Políticas de Seguridad
 * Incluye: Carga de fragmentos, buscador en tiempo real, filtro por rol, acciones de fila,
 * alta/edición con validación @unsm.edu.pe e interruptores (toggles) de políticas.
 */

document.addEventListener("DOMContentLoaded", async () => {
    await cargarFragmentosGlobales();
    inicializarModuloUsuarios();
});

/**
 * Carga Header, Sidebar y Footer desde ../fragmentos/ e inicializa su interactividad.
 */
async function cargarFragmentosGlobales() {
    const headerContainer = document.getElementById("header-container");
    const sidebarContainer = document.getElementById("sidebar-container");
    const footerContainer = document.getElementById("footer-container");

    try {
        if (headerContainer) {
            const res = await fetch("../fragmentos/header.html");
            if (res.ok) headerContainer.innerHTML = await res.text();
        }
        if (sidebarContainer) {
            const res = await fetch("../fragmentos/sidebar.html");
            if (res.ok) sidebarContainer.innerHTML = await res.text();
        }
        if (footerContainer) {
            const res = await fetch("../fragmentos/footer.html");
            if (res.ok) footerContainer.innerHTML = await res.text();
        }

        // Animación del botón Iniciar Sesión en el Header
        if (headerContainer) {
            const btnInicio = headerContainer.querySelector(".btn-login");
            const txtLogin = headerContainer.querySelector(".txt-login");
            const icnPerfil = headerContainer.querySelector(".icono-perfil");

            if (btnInicio && txtLogin && icnPerfil) {
                btnInicio.addEventListener("click", () => {
                    const activado = btnInicio.classList.toggle("intercambiado");
                    if (activado) {
                        const gap = 10;
                        icnPerfil.style.transform = `translateX(${-(txtLogin.offsetWidth + gap)}px)`;
                        txtLogin.style.transform = `translateX(${icnPerfil.offsetWidth + gap}px)`;
                    } else {
                        icnPerfil.style.transform = "translateX(0)";
                        txtLogin.style.transform = "translateX(0)";
                    }
                });
            }
        }

        // Inicializar Sidebar (Push Layout y acordeón)
        const btnAbrirSidebar = document.getElementById("sidebar");
        const btnCerrarSidebar = document.getElementById("btn-cerrar");
        const menuLateral = document.getElementById("menu-lateral");
        const itemAcordeon = document.getElementById("acordeon-sensores");
        const btnAcordeon = document.getElementById("btn-acordeon-sensores");

        if (menuLateral) {
            const toggleMenu = () => {
                const abierto = menuLateral.classList.toggle("activo");
                document.body.classList.toggle("sidebar-abierto", abierto);
            };
            const cerrarMenu = () => {
                menuLateral.classList.remove("activo");
                document.body.classList.remove("sidebar-abierto");
            };

            if (btnAbrirSidebar) btnAbrirSidebar.addEventListener("click", toggleMenu);
            if (btnCerrarSidebar) btnCerrarSidebar.addEventListener("click", cerrarMenu);

            if (btnAcordeon && itemAcordeon) {
                btnAcordeon.addEventListener("click", () => {
                    const estaAbierto = itemAcordeon.classList.toggle("abierto");
                    btnAcordeon.setAttribute("aria-expanded", estaAbierto ? "true" : "false");
                });
            }

            // Marcar "Usuarios y Roles" como ítem activo en el Sidebar y habilitar navegación al Dashboard
            const navLinks = menuLateral.querySelectorAll("[data-nav-item]");
            navLinks.forEach((link) => {
                const href = link.getAttribute("href") || "";
                if (href.includes("usuarios")) {
                    link.classList.add("activo");
                } else {
                    link.classList.remove("activo");
                }

                link.addEventListener("click", (e) => {
                    if (href === "#dashboard" || href.includes("index.html")) {
                        e.preventDefault();
                        window.location.href = "../index.html";
                    }
                });
            });
        }
    } catch (err) {
        console.warn("Aviso al cargar fragmentos globales:", err);
    }
}

/**
 * Inicializa el buscador, el filtro por rol, las acciones de la tabla, el modal y los toggles.
 */
function inicializarModuloUsuarios() {
    const inputBuscar = document.getElementById("input-buscar-usuario");
    const selectFiltroRol = document.getElementById("select-filtro-rol");
    const tbodyUsuarios = document.getElementById("tbody-usuarios");
    const mensajeSinResultados = document.getElementById("mensaje-sin-resultados");
    const contadorTotal = document.getElementById("contador-total");
    const contadorActivos = document.getElementById("contador-activos");

    // Modal Nuevo / Editar Usuario
    const btnNuevoUsuario = document.getElementById("btn-nuevo-usuario");
    const modalUsuario = document.getElementById("modal-usuario");
    const modalTitulo = document.getElementById("modal-titulo");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnCancelarModal = document.getElementById("btn-cancelar-modal");
    const formUsuario = document.getElementById("form-usuario");
    const inputIdEdicion = document.getElementById("usuario-id-edicion");
    const inputNombre = document.getElementById("input-nombre-usuario");
    const inputSubtitulo = document.getElementById("input-subtitulo-usuario");
    const inputCorreo = document.getElementById("input-correo-usuario");
    const selectRol = document.getElementById("select-rol-usuario");
    const errorCorreo = document.getElementById("error-correo");

    // -------------------------------------------------------------------------
    // 1. FILTRADO EN TIEMPO REAL (BUSCADOR + SELECTOR DE ROL)
    // -------------------------------------------------------------------------
    function aplicarFiltros() {
        const termino = (inputBuscar.value || "").trim().toLowerCase();
        const filtroRol = selectFiltroRol.value; // TODOS | ADMINISTRADORES | INVESTIGADORES
        const filas = Array.from(tbodyUsuarios.querySelectorAll("tr"));

        let visibles = 0;

        filas.forEach((fila) => {
            const textoFila = fila.textContent.toLowerCase();
            const categoriaRol = fila.getAttribute("data-categoria-rol");

            const coincideTexto = !termino || textoFila.includes(termino);
            const coincideRol = filtroRol === "TODOS" || categoriaRol === filtroRol;

            if (coincideTexto && coincideRol) {
                fila.hidden = false;
                visibles++;
            } else {
                fila.hidden = true;
            }
        });

        mensajeSinResultados.hidden = visibles > 0;
    }

    if (inputBuscar) inputBuscar.addEventListener("input", aplicarFiltros);
    if (selectFiltroRol) selectFiltroRol.addEventListener("change", aplicarFiltros);

    // -------------------------------------------------------------------------
    // 2. ACTUALIZACIÓN DE CONTADORES DE CABECERA
    // -------------------------------------------------------------------------
    function actualizarContadores() {
        const filas = Array.from(tbodyUsuarios.querySelectorAll("tr"));
        const total = filas.length;
        const activos = filas.filter((f) => {
            const badge = f.querySelector("[data-estado-badge]");
            return badge && badge.classList.contains("estado-activo");
        }).length;

        if (contadorTotal) contadorTotal.textContent = total;
        if (contadorActivos) contadorActivos.textContent = activos;
    }

    // -------------------------------------------------------------------------
    // 3. ACCIONES EN LA TABLA (EDITAR, CAMBIAR CONTRASEÑA, SUSPENDER)
    // -------------------------------------------------------------------------
    tbodyUsuarios.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-accion-circular");
        if (!btn) return;

        const fila = btn.closest("tr");
        if (!fila) return;

        const accion = btn.getAttribute("data-accion");
        const nombreActual = fila.querySelector(".nombre-principal")?.textContent || "Usuario";
        const subtituloActual = fila.querySelector(".subtexto-cargo")?.textContent || "";
        const correoActual = fila.querySelector(".correo-monospace")?.textContent || "";
        const rolActual = fila.getAttribute("data-rol") || "INVESTIGADOR";

        if (accion === "editar") {
            inputIdEdicion.value = fila.getAttribute("data-id");
            inputNombre.value = nombreActual;
            inputSubtitulo.value = subtituloActual;
            inputCorreo.value = correoActual;
            selectRol.value = rolActual;
            errorCorreo.hidden = true;
            modalTitulo.textContent = "Editar Usuario Institucional";
            modalUsuario.hidden = false;
        } else if (accion === "password") {
            mostrarToast(`Se envió enlace de restablecimiento de clave a ${correoActual}`);
        } else if (accion === "suspender") {
            const badgeEstado = fila.querySelector("[data-estado-badge]");
            const textoEstado = badgeEstado?.querySelector(".texto-estado");
            const iconoBtn = btn.querySelector("i");

            if (badgeEstado && textoEstado) {
                const pasaASuspendido = badgeEstado.classList.contains("estado-activo");
                badgeEstado.classList.toggle("estado-activo", !pasaASuspendido);
                badgeEstado.classList.toggle("estado-suspendido", pasaASuspendido);
                textoEstado.textContent = pasaASuspendido ? "Suspendido" : "Activo";

                if (iconoBtn) {
                    iconoBtn.className = pasaASuspendido ? "fa-solid fa-user-check" : "fa-solid fa-user-slash";
                }

                actualizarContadores();
                mostrarToast(
                    pasaASuspendido
                        ? `Acceso suspendido para ${nombreActual}`
                        : `Acceso reactivado para ${nombreActual}`
                );
            }
        }
    });

    // -------------------------------------------------------------------------
    // 4. MODAL PARA CREAR O EDITAR USUARIO (CON VALIDACIÓN @unsm.edu.pe)
    // -------------------------------------------------------------------------
    function cerrarModal() {
        modalUsuario.hidden = true;
        formUsuario.reset();
        inputIdEdicion.value = "";
        errorCorreo.hidden = true;
    }

    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener("click", () => {
            formUsuario.reset();
            inputIdEdicion.value = "";
            errorCorreo.hidden = true;
            modalTitulo.textContent = "Registrar Nuevo Usuario Institucional";
            modalUsuario.hidden = false;
            inputNombre.focus();
        });
    }

    if (btnCerrarModal) btnCerrarModal.addEventListener("click", cerrarModal);
    if (btnCancelarModal) btnCancelarModal.addEventListener("click", cerrarModal);

    if (formUsuario) {
        formUsuario.addEventListener("submit", (e) => {
            e.preventDefault();

            const nombre = inputNombre.value.trim();
            const subtitulo = inputSubtitulo.value.trim();
            const correo = inputCorreo.value.trim().toLowerCase();
            const rol = selectRol.value;

            // Validar dominio institucional @unsm.edu.pe
            if (!correo.endsWith("@unsm.edu.pe")) {
                errorCorreo.hidden = false;
                inputCorreo.focus();
                return;
            }
            errorCorreo.hidden = true;

            const categoriaRol = rol === "INVESTIGADOR" ? "INVESTIGADORES" : "ADMINISTRADORES";
            const claseBadgeRol =
                rol === "SUPER_ADMIN / ASESOR"
                    ? "badge-super-admin"
                    : rol === "ADMIN_OPERADOR"
                    ? "badge-admin-operador"
                    : "badge-investigador";

            const iconoAvatar =
                rol === "SUPER_ADMIN / ASESOR"
                    ? "fa-user-tie"
                    : rol === "ADMIN_OPERADOR"
                    ? "fa-user-shield"
                    : "fa-user-graduate";

            const idEdicion = inputIdEdicion.value;

            if (idEdicion) {
                // Actualizar fila existente
                const fila = tbodyUsuarios.querySelector(`tr[data-id="${idEdicion}"]`);
                if (fila) {
                    fila.setAttribute("data-rol", rol);
                    fila.setAttribute("data-categoria-rol", categoriaRol);
                    fila.querySelector(".nombre-principal").textContent = nombre;
                    fila.querySelector(".subtexto-cargo").textContent = subtitulo;
                    fila.querySelector(".correo-monospace").textContent = correo;

                    const badgeRol = fila.querySelector(".badge-rol");
                    badgeRol.className = `badge-rol ${claseBadgeRol}`;
                    badgeRol.textContent = rol;

                    const avatarIcon = fila.querySelector(".avatar-tabla i");
                    if (avatarIcon) avatarIcon.className = `fa-solid ${iconoAvatar}`;

                    mostrarToast(`Datos actualizados para ${nombre}`);
                }
            } else {
                // Insertar nueva fila
                const nuevoId = Date.now().toString();
                const ahora = new Date();
                const fechaFormateada = ahora.toLocaleDateString("es-PE") + " " + ahora.toTimeString().slice(0, 8);

                const tr = document.createElement("tr");
                tr.setAttribute("data-id", nuevoId);
                tr.setAttribute("data-categoria-rol", categoriaRol);
                tr.setAttribute("data-rol", rol);

                tr.innerHTML = `
                    <td>
                        <div class="celda-usuario">
                            <div class="avatar-tabla">
                                <i class="fa-solid ${iconoAvatar}"></i>
                            </div>
                            <div class="datos-nombre">
                                <span class="nombre-principal"></span>
                                <span class="subtexto-cargo"></span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="correo-monospace"></span>
                    </td>
                    <td>
                        <span class="badge-rol ${claseBadgeRol}"></span>
                    </td>
                    <td>
                        <span class="badge-estado estado-activo" data-estado-badge>
                            <span class="punto-estado"></span>
                            <span class="texto-estado">Activo</span>
                        </span>
                    </td>
                    <td>
                        <span class="fecha-monospace">${fechaFormateada}</span>
                    </td>
                    <td class="col-acciones">
                        <div class="grupo-acciones">
                            <button type="button" class="btn-accion-circular" data-accion="editar" title="Editar usuario">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button type="button" class="btn-accion-circular" data-accion="password" title="Cambiar contraseña">
                                <i class="fa-solid fa-key"></i>
                            </button>
                            <button type="button" class="btn-accion-circular" data-accion="suspender" title="Suspender o reactivar usuario">
                                <i class="fa-solid fa-user-slash"></i>
                            </button>
                        </div>
                    </td>
                `;

                tr.querySelector(".nombre-principal").textContent = nombre;
                tr.querySelector(".subtexto-cargo").textContent = subtitulo;
                tr.querySelector(".correo-monospace").textContent = correo;
                tr.querySelector(".badge-rol").textContent = rol;

                tbodyUsuarios.appendChild(tr);
                actualizarContadores();
                mostrarToast(`Usuario ${correo} registrado correctamente`);
            }

            aplicarFiltros();
            cerrarModal();
        });
    }

    // -------------------------------------------------------------------------
    // 5. INTERRUPTORES (TOGGLES) DE CONFIGURACIÓN Y POLÍTICAS DE SEGURIDAD
    // -------------------------------------------------------------------------
    const togglesPoliticas = document.querySelectorAll(".toggle-pildora");
    const resumenPoliticas = document.getElementById("resumen-politicas");

    function actualizarResumenPoliticas() {
        const total = togglesPoliticas.length;
        const activas = Array.from(togglesPoliticas).filter((t) => t.classList.contains("activo")).length;
        if (resumenPoliticas) {
            resumenPoliticas.textContent = `${activas} de ${total} políticas activas`;
        }
    }

    togglesPoliticas.forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const activado = toggle.classList.toggle("activo");
            toggle.setAttribute("aria-checked", activado ? "true" : "false");
            actualizarResumenPoliticas();

            const nombrePolitica =
                toggle.closest(".item-politica")?.querySelector(".nombre-politica")?.textContent || "Política";
            mostrarToast(`${nombrePolitica}: ${activado ? "HABILITADA" : "DESHABILITADA"}`);
        });
    });
}

/**
 * Muestra una notificación breve en la esquina inferior derecha.
 */
let toastTimeout = null;
function mostrarToast(mensaje) {
    const toast = document.getElementById("toast-notificacion");
    if (!toast) return;

    toast.textContent = mensaje;
    toast.hidden = false;

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.hidden = true;
    }, 3000);
}

