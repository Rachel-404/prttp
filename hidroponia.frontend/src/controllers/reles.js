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
            const DEFAULTS_TECNICOS_RELES = {
                pines: {
                    1: "GPIO 14",
                    2: "GPIO 15",
                    3: "GPIO 16",
                    4: "GPIO 17",
                    5: "GPIO 18",
                    6: "GPIO 21"
                },
                logicaDisparo: "low"
            };

            let estadoOperacionReles = {
                modo: "manual",
                canales: []
            };

            let estadoTecnicoReles = {
                pines: { ...DEFAULTS_TECNICOS_RELES.pines },
                logicaDisparo: DEFAULTS_TECNICOS_RELES.logicaDisparo
            };

            const selectModo = document.getElementById("modo-operacion-reles");
            const avisoModoAuto = document.getElementById("aviso-modo-automatico");
            const gridCanales = document.getElementById("grid-reles-canales");

            const bloqueTecnico = document.getElementById("bloque-tecnico-reles");
            const btnAcordeonTecnico = document.getElementById("btn-acordeon-tecnico-reles");
            const formTecnico = document.getElementById("form-tecnico-reles");
            const selectLogica = document.getElementById("tec-rele-logica");
            const errorTecnico = document.getElementById("error-tecnico-reles");
            const btnRestaurarFabrica = document.getElementById("btn-restaurar-fabrica-reles");

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

            function aplicarListaDesdeBackend(lista) {
                if (!Array.isArray(lista) || lista.length === 0) return;
                estadoOperacionReles.modo = lista[0].modoOperacion === "automatico" ? "automatico" : "manual";
                estadoOperacionReles.canales = lista.map((r) => ({
                    canal: r.canal,
                    nombre: String(r.nombre || `Canal ${r.canal}`).replace(/\s*\([^()]+\)/g, ""),
                    encendido: Boolean(r.encendido)
                }));
                estadoTecnicoReles.logicaDisparo = lista[0].logicaDisparo === "high" ? "high" : "low";
                lista.forEach((r) => {
                    if (r.pinGpio) estadoTecnicoReles.pines[r.canal] = r.pinGpio;
                });
                renderizarTarjetasCanales();
                sincronizarCamposTecnicos();
            }

            async function cargarDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const lista = await window.AxionApi.get("/reles");
                    aplicarListaDesdeBackend(lista);
                } catch (err) {
                    mostrarToast(err.message || "No se pudo cargar el estado de los relés desde el servidor.");
                }
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
                    inputNombre.addEventListener("change", async () => {
                        const limpio = inputNombre.value.trim();
                        if (!limpio) {
                            inputNombre.value = canalObj.nombre;
                            return;
                        }
                        try {
                            const actualizado = await window.AxionApi.patch(`/reles/${canalObj.canal}/nombre`, {
                                nombre: limpio
                            });
                            canalObj.nombre = actualizado.nombre || limpio;
                            inputNombre.value = canalObj.nombre;
                            mostrarToast(`Nombre del Canal ${canalObj.canal} actualizado.`);
                        } catch (err) {
                            inputNombre.value = canalObj.nombre;
                            mostrarToast(err.message || "Error al actualizar el nombre del canal.");
                        }
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
                            onAceptar: async () => {
                                try {
                                    const resp = await window.AxionApi.patch(`/reles/${canalObj.canal}/estado`, {
                                        encendido: nuevoEstado
                                    });
                                    canalObj.encendido = Boolean(resp.encendido);
                                    renderizarTarjetasCanales();
                                    mostrarToast(`Canal ${canalObj.canal} ${canalObj.encendido ? "encendido" : "apagado"}.`);
                                } catch (err) {
                                    toggle.checked = !nuevoEstado;
                                    mostrarToast(err.message || "No se pudo cambiar el estado del canal.");
                                }
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
                    if (inputPin) inputPin.value = estadoTecnicoReles.pines[i] || "";
                }
                if (selectLogica) selectLogica.value = estadoTecnicoReles.logicaDisparo;
            }

            selectModo.addEventListener("change", async () => {
                const modoPrevio = estadoOperacionReles.modo;
                const nuevoModo = selectModo.value;
                try {
                    const lista = await window.AxionApi.put("/reles/modo", { modoOperacion: nuevoModo });
                    aplicarListaDesdeBackend(lista);
                    mostrarToast(nuevoModo === "manual" ? "Modo Manual activado." : "Modo Automático activado.");
                } catch (err) {
                    estadoOperacionReles.modo = modoPrevio;
                    selectModo.value = modoPrevio;
                    mostrarToast(err.message || "No se pudo cambiar el modo de operación.");
                }
            });

            if (btnAcordeonTecnico && bloqueTecnico) {
                btnAcordeonTecnico.addEventListener("click", () => {
                    const abierto = bloqueTecnico.classList.toggle("abierto");
                    btnAcordeonTecnico.setAttribute("aria-expanded", abierto ? "true" : "false");
                });
            }

            if (formTecnico) {
                formTecnico.addEventListener("submit", async (e) => {
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

                    const payloadTecnico = {
                        pines: nuevosPines,
                        logicaDisparo: selectLogica.value === "high" ? "high" : "low"
                    };

                    try {
                        const lista = await window.AxionApi.put("/reles/tecnico", payloadTecnico);
                        aplicarListaDesdeBackend(lista);
                        mostrarToast("Configuración técnica de pines guardada.");
                    } catch (err) {
                        mostrarErrorTecnico(err.message || "Error al guardar la configuración técnica.");
                    }
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
                        mensaje: "Se restablecerán los pines GPIO por defecto y la lógica de disparo Activo en Bajo.",
                        claseBoton: "btn-modal-pausar",
                        onAceptar: async () => {
                            try {
                                const lista = await window.AxionApi.put("/reles/tecnico", DEFAULTS_TECNICOS_RELES);
                                aplicarListaDesdeBackend(lista);
                                limpiarErrorTecnico();
                                mostrarToast("Pines y lógica restaurados a valores de fábrica.");
                            } catch (err) {
                                mostrarToast(err.message || "Error al restaurar valores de fábrica.");
                            }
                        }
                    });
                });
            }

            btnAceptar.addEventListener("click", () => {
                if (typeof accionConfirmarPendiente === "function") accionConfirmarPendiente();
                cerrarModal(true);
            });
            btnCancelar.addEventListener("click", () => cerrarModal(false));
            modal.addEventListener("click", (e) => {
                if (e.target === modal) cerrarModal(false);
            });
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && !modal.hidden) cerrarModal(false);
            });

            cargarDesdeBackend();
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
