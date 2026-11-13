document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_RELES_ESTADO = "axion_reles_estado";
    const CLAVE_RELES_TECNICO = "axion_reles_tecnico";

    const DEFAULTS_CANALES = [
        { canal: 1, nombre: "Electrobomba 1 (Recirculación Principal)", encendido: true },
        { canal: 2, nombre: "Electrobomba 2 (Dosificación / Oxigenación)", encendido: false },
        { canal: 3, nombre: "Electrobomba 3 (Llenado / Auxiliar)", encendido: false },
        { canal: 4, nombre: "Reflector (Iluminación del Cultivo)", encendido: true },
        { canal: 5, nombre: "Canal Reserva 1 (Disponible)", encendido: false },
        { canal: 6, nombre: "Canal Reserva 2 (Disponible)", encendido: false }
    ];

    const DEFAULTS_TECNICOS_RELES = {
        pines: {
            1: "GPIO 4",
            2: "GPIO 5",
            3: "GPIO 6",
            4: "GPIO 7",
            5: "GPIO 15",
            6: "GPIO 16"
        },
        logicaDisparo: "low"
    };

    let estadoOperacionReles = {
        modo: "manual",
        canales: DEFAULTS_CANALES.map((c) => ({ ...c }))
    };

    let estadoTecnicoReles = {
        pines: { ...DEFAULTS_TECNICOS_RELES.pines },
        logicaDisparo: DEFAULTS_TECNICOS_RELES.logicaDisparo
    };

    // Referencias DOM - Bloque 1
    const selectModo = document.getElementById("modo-operacion-reles");
    const avisoModoAuto = document.getElementById("aviso-modo-automatico");
    const gridCanales = document.getElementById("grid-reles-canales");

    // Referencias DOM - Bloque 2
    const bloqueTecnico = document.getElementById("bloque-tecnico-reles");
    const btnAcordeonTecnico = document.getElementById("btn-acordeon-tecnico-reles");
    const formTecnico = document.getElementById("form-tecnico-reles");
    const selectLogica = document.getElementById("tec-rele-logica");
    const errorTecnico = document.getElementById("error-tecnico-reles");
    const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-reles");

    // Referencias DOM - Modal y Toast
    const modal = document.getElementById("modal-confirmacion-reles");
    const modalTitulo = document.getElementById("modal-reles-titulo");
    const modalMensaje = document.getElementById("modal-reles-mensaje");
    const btnCancelar = document.getElementById("btn-modal-cancelar-reles");
    const btnAceptar = document.getElementById("btn-modal-aceptar-reles");
    const toast = document.getElementById("toast-reles");

    if (!selectModo || !gridCanales || !modal) return;

    let accionConfirmarPendiente = null;
    let accionCancelarPendiente = null;
    let toastTimer = null;

    function cargarEstadoInicial() {
        try {
            const rawOp = localStorage.getItem(CLAVE_RELES_ESTADO);
            if (rawOp) {
                const datos = JSON.parse(rawOp);
                if (datos.modo === "manual" || datos.modo === "automatico") {
                    estadoOperacionReles.modo = datos.modo;
                }
                if (Array.isArray(datos.canales) && datos.canales.length === 6) {
                    estadoOperacionReles.canales = datos.canales.map((c, idx) => ({
                        canal: idx + 1,
                        nombre: String(c.nombre || DEFAULTS_CANALES[idx].nombre),
                        encendido: Boolean(c.encendido)
                    }));
                }
            }

            const rawTec = localStorage.getItem(CLAVE_RELES_TECNICO);
            if (rawTec) {
                const tec = JSON.parse(rawTec);
                if (tec.pines && typeof tec.pines === "object") {
                    estadoTecnicoReles.pines = { ...DEFAULTS_TECNICOS_RELES.pines, ...tec.pines };
                }
                if (tec.logicaDisparo === "low" || tec.logicaDisparo === "high") {
                    estadoTecnicoReles.logicaDisparo = tec.logicaDisparo;
                }
            }
        } catch (err) {
            console.warn("No se pudo restaurar la configuración de relés:", err);
        }
    }

    function persistirOperacion() {
        localStorage.setItem(CLAVE_RELES_ESTADO, JSON.stringify(estadoOperacionReles));
    }

    function persistirTecnico() {
        localStorage.setItem(CLAVE_RELES_TECNICO, JSON.stringify(estadoTecnicoReles));
    }

    function mostrarToast(texto) {
        if (!toast) return;
        toast.textContent = texto;
        toast.hidden = false;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 3000);
    }

    function mostrarErrorTecnico(msg) {
        if (!errorTecnico) return;
        errorTecnico.textContent = msg;
        errorTecnico.hidden = false;
    }

    function limpiarErrorTecnico() {
        if (!errorTecnico) return;
        errorTecnico.textContent = "";
        errorTecnico.hidden = true;
    }

    function abrirModalConfirmacion({ titulo, mensaje, claseBoton, onAceptar, onCancelar }) {
        accionConfirmarPendiente = onAceptar || null;
        accionCancelarPendiente = onCancelar || null;
        modalTitulo.textContent = titulo;
        modalMensaje.textContent = mensaje;
        btnAceptar.className = `btn-modal ${claseBoton || "btn-modal-activar"}`;
        modal.hidden = false;
        btnCancelar.focus();
    }

    function cerrarModal(ejecutadoAceptar = false) {
        modal.hidden = true;
        if (!ejecutadoAceptar && typeof accionCancelarPendiente === "function") {
            accionCancelarPendiente();
        }
        accionConfirmarPendiente = null;
        accionCancelarPendiente = null;
    }

    function enviarOrdenReleEsp32(canalObj) {
        const comando = {
            microcontrolador: "ESP32-S3",
            canal: canalObj.canal,
            nombre: canalObj.nombre,
            gpio: estadoTecnicoReles.pines[canalObj.canal],
            estado: canalObj.encendido ? "ENCENDIDO" : "APAGADO",
            logicaDisparo: estadoTecnicoReles.logicaDisparo,
            timestamp: new Date().toISOString()
        };

        document.dispatchEvent(new CustomEvent("reles:comandoEnviado", { detail: comando }));
        console.info("Orden enviada al ESP32-S3:", comando);
        mostrarToast(
            `Canal ${canalObj.canal} ${canalObj.encendido ? "encendido" : "apagado"} (orden enviada al ESP32-S3).`
        );
    }

    function renderizarTarjetasCanales() {
        const esAutomatico = estadoOperacionReles.modo === "automatico";
        selectModo.value = estadoOperacionReles.modo;
        if (avisoModoAuto) avisoModoAuto.hidden = !esAutomatico;

        gridCanales.innerHTML = "";

        estadoOperacionReles.canales.forEach((canalObj) => {
            const card = document.createElement("article");
            card.className = "tarjeta-canal-rele";
            card.dataset.canal = String(canalObj.canal);

            const claseEstado = canalObj.encendido ? "encendido" : "apagado";
            const textoEstado = canalObj.encendido ? "Encendido" : "Apagado";

            card.innerHTML = `
                <div class="cabecera-canal">
                    <span class="etiqueta-canal-num">Canal ${canalObj.canal}</span>
                    <span class="estado-rele-badge ${claseEstado}" id="badge-rele-${canalObj.canal}">
                        <span class="punto-estado-rele" aria-hidden="true"></span>
                        <span class="texto-estado-rele">${textoEstado}</span>
                    </span>
                </div>
                <div class="cuerpo-canal">
                    <label for="nombre-rele-${canalObj.canal}" class="etiqueta-campo">Equipo asignado</label>
                    <input
                        type="text"
                        id="nombre-rele-${canalObj.canal}"
                        class="campo-control input-nombre-rele"
                        value="${canalObj.nombre.replace(/"/g, "&quot;")}"
                    />
                </div>
                <div class="pie-canal">
                    <span class="texto-accion-rele">Control manual</span>
                    <label class="switch-rele" aria-label="Encender o apagar Canal ${canalObj.canal}">
                        <input
                            type="checkbox"
                            id="switch-rele-${canalObj.canal}"
                            ${canalObj.encendido ? "checked" : ""}
                            ${esAutomatico ? "disabled" : ""}
                        />
                        <span class="slider-rele"></span>
                    </label>
                </div>
            `;

            const inputNombre = card.querySelector(`#nombre-rele-${canalObj.canal}`);
            inputNombre.addEventListener("change", () => {
                const limpio = inputNombre.value.trim() || DEFAULTS_CANALES[canalObj.canal - 1].nombre;
                inputNombre.value = limpio;
                canalObj.nombre = limpio;
                persistirOperacion();
                mostrarToast(`Nombre del Canal ${canalObj.canal} actualizado.`);
            });

            const toggle = card.querySelector(`#switch-rele-${canalObj.canal}`);
            toggle.addEventListener("change", () => {
                const nuevoEstado = toggle.checked;
                abrirModalConfirmacion({
                    titulo: nuevoEstado
                        ? `¿Encender Canal ${canalObj.canal}?`
                        : `¿Apagar Canal ${canalObj.canal}?`,
                    mensaje: `Se enviará la orden al microcontrolador ESP32-S3 para ${
                        nuevoEstado ? "encender" : "apagar"
                    } "${canalObj.nombre}".`,
                    claseBoton: nuevoEstado ? "btn-modal-activar" : "btn-modal-pausar",
                    onAceptar: () => {
                        canalObj.encendido = nuevoEstado;
                        persistirOperacion();
                        renderizarTarjetasCanales();
                        enviarOrdenReleEsp32(canalObj);
                    },
                    onCancelar: () => {
                        toggle.checked = !nuevoEstado;
                    }
                });
            });

            gridCanales.appendChild(card);
        });
    }

    function sincronizarCamposTecnicos() {
        for (let i = 1; i <= 6; i++) {
            const inputPin = document.getElementById(`pin-rele-${i}`);
            if (inputPin) inputPin.value = estadoTecnicoReles.pines[i];
        }
        if (selectLogica) selectLogica.value = estadoTecnicoReles.logicaDisparo;
    }

    // Cambio de modo global
    selectModo.addEventListener("change", () => {
        estadoOperacionReles.modo = selectModo.value;
        persistirOperacion();
        renderizarTarjetasCanales();
        document.dispatchEvent(
            new CustomEvent("reles:modoCambiado", { detail: { modo: estadoOperacionReles.modo } })
        );
        mostrarToast(
            estadoOperacionReles.modo === "manual"
                ? "Modo Manual activado."
                : "Modo Automático (Temporizador) activado."
        );
    });

    // Acordeón Técnico (Bloque 2)
    if (btnAcordeonTecnico && bloqueTecnico) {
        btnAcordeonTecnico.addEventListener("click", () => {
            const abierto = bloqueTecnico.classList.toggle("abierto");
            btnAcordeonTecnico.setAttribute("aria-expanded", abierto ? "true" : "false");
        });
    }

    if (formTecnico) {
        formTecnico.addEventListener("submit", (e) => {
            e.preventDefault();
            limpiarErrorTecnico();

            const nuevosPines = {};
            const usados = new Set();

            for (let i = 1; i <= 6; i++) {
                const val = (document.getElementById(`pin-rele-${i}`)?.value || "").trim();
                if (!val) {
                    mostrarErrorTecnico(`Indica el pin GPIO para el Relé ${i}.`);
                    return;
                }
                const clave = val.toUpperCase();
                if (usados.has(clave)) {
                    mostrarErrorTecnico(`El pin "${val}" está duplicado. Cada relé requiere un GPIO único.`);
                    return;
                }
                usados.add(clave);
                nuevosPines[i] = val;
            }

            estadoTecnicoReles.pines = nuevosPines;
            estadoTecnicoReles.logicaDisparo = selectLogica.value === "high" ? "high" : "low";
            persistirTecnico();

            document.dispatchEvent(
                new CustomEvent("reles:configTecnicaGuardada", { detail: { ...estadoTecnicoReles } })
            );
            mostrarToast("Configuración técnica de pines guardada.");
        });

        for (let i = 1; i <= 6; i++) {
            const inputPin = document.getElementById(`pin-rele-${i}`);
            if (inputPin) inputPin.addEventListener("input", limpiarErrorTecnico);
        }
    }

    if (btnRestaurarFabrica) {
        btnRestaurarFabrica.addEventListener("click", () => {
            abrirModalConfirmacion({
                titulo: "¿Restaurar valores de fábrica?",
                mensaje:
                    "Se restablecerán los pines GPIO por defecto (GPIO 4, 5, 6, 7, 15, 16) y la lógica de disparo Activo en Bajo (Low-Level Trigger).",
                claseBoton: "btn-modal-pausar",
                onAceptar: () => {
                    estadoTecnicoReles = {
                        pines: { ...DEFAULTS_TECNICOS_RELES.pines },
                        logicaDisparo: DEFAULTS_TECNICOS_RELES.logicaDisparo
                    };
                    persistirTecnico();
                    sincronizarCamposTecnicos();
                    limpiarErrorTecnico();
                    mostrarToast("Pines y lógica restaurados a valores de fábrica.");
                }
            });
        });
    }

    // Modal compartido
    btnAceptar.addEventListener("click", () => {
        if (typeof accionConfirmarPendiente === "function") {
            accionConfirmarPendiente();
        }
        cerrarModal(true);
    });

    btnCancelar.addEventListener("click", () => cerrarModal(false));

    modal.addEventListener("click", (e) => {
        if (e.target === modal) cerrarModal(false);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.hidden) cerrarModal(false);
    });

    cargarEstadoInicial();
    renderizarTarjetasCanales();
    sincronizarCamposTecnicos();
});

