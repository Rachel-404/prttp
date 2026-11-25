export default function initController() {
    const __docListeners = [];
    const __winListeners = [];
    const __observers = [];
    let pollingRelesTimer = null;
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
            const TOTAL_CANALES_RELES = 8;
            const DEFAULTS_TECNICOS_RELES = {
                pines: {
                    1: "GPIO 16",
                    2: "GPIO 17",
                    3: "GPIO 18",
                    4: "GPIO 8",
                    5: "GPIO 42",
                    6: "GPIO 41",
                    7: "GPIO 40",
                    8: "GPIO 39"
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

            function calcularFirmaEstadoActual() {
                const canalesFirma = estadoOperacionReles.canales
                    .map((c) => `${c.canal}|${Boolean(c.encendido)}|${c.nombre}|${estadoTecnicoReles.pines[c.canal] || ""}|${JSON.stringify(c.reglaAuto || {})}`)
                    .join(";");
                return `${estadoOperacionReles.modo}|${estadoTecnicoReles.logicaDisparo}|${canalesFirma}`;
            }

            function calcularFirmaListaRemota(lista) {
                const modo = lista[0].modoOperacion === "automatico" ? "automatico" : "manual";
                const logica = lista[0].logicaDisparo === "high" ? "high" : "low";
                const canalesFirma = lista
                    .map((r) => {
                        const nombre = String(r.nombre || `Canal ${r.canal}`).replace(/\s*\([^()]+\)/g, "");
                        const pin = r.pinGpio || estadoTecnicoReles.pines[r.canal] || "";
                        return `${r.canal}|${Boolean(r.encendido)}|${nombre}|${pin}|${JSON.stringify(r.reglaAuto || {})}`;
                    })
                    .join(";");
                return `${modo}|${logica}|${canalesFirma}`;
            }

            function aplicarListaDesdeBackend(lista, silencioso = false) {
                if (!Array.isArray(lista) || lista.length === 0) return;
                if (silencioso) {
                    const activo = document.activeElement;
                    const editandoUi = !modal.hidden
                        || (selectModo && activo === selectModo)
                        || (activo && (
                            activo.classList?.contains("input-nombre-rele")
                            || activo.closest?.(".bloque-regla-auto")
                            || (formTecnico && formTecnico.contains(activo))
                        ));
                    if (editandoUi) return;
                    if (calcularFirmaListaRemota(lista) === calcularFirmaEstadoActual()) return;
                }
                estadoOperacionReles.modo = lista[0].modoOperacion === "automatico" ? "automatico" : "manual";
                estadoOperacionReles.canales = lista.map((r) => ({
                    canal: r.canal,
                    nombre: String(r.nombre || `Canal ${r.canal}`).replace(/\s*\([^()]+\)/g, ""),
                    encendido: Boolean(r.encendido),
                    reglaAuto: r.reglaAuto && typeof r.reglaAuto === "object" ? { ...r.reglaAuto } : { variable: "ninguna" }
                }));
                estadoTecnicoReles.logicaDisparo = lista[0].logicaDisparo === "high" ? "high" : "low";
                lista.forEach((r) => {
                    if (r.pinGpio) estadoTecnicoReles.pines[r.canal] = r.pinGpio;
                });
                renderizarTarjetasCanales();
                sincronizarCamposTecnicos();
            }

            async function refrescarSilenciosoDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const lista = await window.AxionApi.get("/reles");
                    aplicarListaDesdeBackend(lista, true);
                } catch {
                    // Mantener estado actual si hay fallo transitorio en polling
                }
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

            const OPCIONES_VARIABLES_REGLA = [
                ["ninguna", "Sin regla automática"],
                ["temp_aire", "Temperatura del Aire"],
                ["humedad_aire", "Humedad del Aire"],
                ["temp_agua", "Temperatura del Agua"],
                ["ph", "Nivel de pH"],
                ["ec", "Conductividad EC"],
                ["tds", "Sólidos Disueltos TDS"],
                ["nivel_agua", "Nivel de Agua"]
            ];

            const OPCIONES_ENCENDER = [
                ["menor_min", "Baja del mínimo configurado"],
                ["mayor_max", "Supera el máximo configurado"],
                ["fuera_rango", "Sale del rango normal"],
                ["dentro_rango", "Está dentro del rango normal"],
                ["menor_valor", "Es menor que un valor"],
                ["mayor_valor", "Es mayor que un valor"]
            ];

            const OPCIONES_APAGAR = [
                ["en_rango", "Vuelve al rango normal"],
                ["inverso_encendido", "Deja de cumplirse la condición de encendido"],
                ["mayor_igual_max", "Alcanza o supera el máximo"],
                ["menor_igual_min", "Baja o alcanza el mínimo"],
                ["mayor_igual_valor", "Es mayor o igual a un valor"],
                ["menor_igual_valor", "Es menor o igual a un valor"]
            ];

            function construirOpcionesHtml(lista, valorActual) {
                return lista
                    .map(([val, txt]) => `<option value="${val}"${val === valorActual ? " selected" : ""}>${txt}</option>`)
                    .join("");
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
                    const regla = canalObj.reglaAuto || {};
                    const varGuardada = regla.variable || "ninguna";
                    const encGuardado = regla.encenderCuando || "menor_min";
                    const apaGuardado = regla.apagarCuando || "en_rango";
                    const umbEncGuardado = regla.umbralEncendido != null ? String(regla.umbralEncendido) : "";
                    const umbApaGuardado = regla.umbralApagado != null ? String(regla.umbralApagado) : "";

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
                        <div class="bloque-regla-auto" ${esAutomatico ? "" : "hidden"}>
                            <div class="fila-condicion-regla">
                                <label for="regla-var-${canalObj.canal}" class="etiqueta-campo">Regla automática</label>
                                <select id="regla-var-${canalObj.canal}" class="campo-control">
                                    ${construirOpcionesHtml(OPCIONES_VARIABLES_REGLA, varGuardada)}
                                </select>
                            </div>
                            <div class="detalle-regla-auto" id="detalle-regla-${canalObj.canal}" ${varGuardada === "ninguna" ? "hidden" : ""}>
                                <div class="fila-condicion-regla">
                                    <label for="regla-enc-${canalObj.canal}" class="etiqueta-campo">Encender si</label>
                                    <select id="regla-enc-${canalObj.canal}" class="campo-control">
                                        ${construirOpcionesHtml(OPCIONES_ENCENDER, encGuardado)}
                                    </select>
                                    <input
                                        type="number"
                                        step="any"
                                        id="regla-umb-enc-${canalObj.canal}"
                                        class="campo-control input-umbral-regla"
                                        placeholder="Valor de encendido"
                                        value="${umbEncGuardado}"
                                        ${encGuardado.endsWith("_valor") ? "" : "hidden"}
                                    />
                                </div>
                                <div class="fila-condicion-regla">
                                    <label for="regla-apa-${canalObj.canal}" class="etiqueta-campo">Apagar si</label>
                                    <select id="regla-apa-${canalObj.canal}" class="campo-control">
                                        ${construirOpcionesHtml(OPCIONES_APAGAR, apaGuardado)}
                                    </select>
                                    <input
                                        type="number"
                                        step="any"
                                        id="regla-umb-apa-${canalObj.canal}"
                                        class="campo-control input-umbral-regla"
                                        placeholder="Valor de apagado"
                                        value="${umbApaGuardado}"
                                        ${apaGuardado.endsWith("_valor") ? "" : "hidden"}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                id="btn-guardar-regla-${canalObj.canal}"
                                class="btn-modal btn-modal-activar btn-guardar-regla"
                                ${varGuardada === "ninguna" ? "hidden" : ""}
                            >
                                Guardar Regla
                            </button>
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

                    const selVar = card.querySelector(`#regla-var-${canalObj.canal}`);
                    const detRegla = card.querySelector(`#detalle-regla-${canalObj.canal}`);
                    const selEnc = card.querySelector(`#regla-enc-${canalObj.canal}`);
                    const inpUmbEnc = card.querySelector(`#regla-umb-enc-${canalObj.canal}`);
                    const selApa = card.querySelector(`#regla-apa-${canalObj.canal}`);
                    const inpUmbApa = card.querySelector(`#regla-umb-apa-${canalObj.canal}`);
                    const btnGuardarRegla = card.querySelector(`#btn-guardar-regla-${canalObj.canal}`);

                    const actualizarVisibilidadRegla = () => {
                        const esNinguna = selVar.value === "ninguna";
                        detRegla.hidden = esNinguna;
                        inpUmbEnc.hidden = esNinguna || !selEnc.value.endsWith("_valor");
                        inpUmbApa.hidden = esNinguna || !selApa.value.endsWith("_valor");
                        btnGuardarRegla.hidden = esNinguna && varGuardada === "ninguna";
                        btnGuardarRegla.textContent = esNinguna ? "Quitar Regla" : "Guardar Regla";
                    };

                    selVar.addEventListener("change", actualizarVisibilidadRegla);
                    selEnc.addEventListener("change", actualizarVisibilidadRegla);
                    selApa.addEventListener("change", actualizarVisibilidadRegla);

                    btnGuardarRegla.addEventListener("click", async () => {
                        const variable = selVar.value;
                        const payload = { variable };
                        if (variable !== "ninguna") {
                            payload.encenderCuando = selEnc.value;
                            payload.apagarCuando = selApa.value;
                            if (selEnc.value.endsWith("_valor")) {
                                const vEnc = Number.parseFloat(inpUmbEnc.value);
                                if (!Number.isFinite(vEnc)) {
                                    mostrarToast("Ingresa un valor numérico válido para encender.");
                                    inpUmbEnc.focus();
                                    return;
                                }
                                payload.umbralEncendido = vEnc;
                            }
                            if (selApa.value.endsWith("_valor")) {
                                const vApa = Number.parseFloat(inpUmbApa.value);
                                if (!Number.isFinite(vApa)) {
                                    mostrarToast("Ingresa un valor numérico válido para apagar.");
                                    inpUmbApa.focus();
                                    return;
                                }
                                payload.umbralApagado = vApa;
                            }
                        }
                        try {
                            const actualizado = await window.AxionApi.put(`/reles/${canalObj.canal}/regla`, payload);
                            canalObj.reglaAuto = actualizado.reglaAuto || payload;
                            canalObj.encendido = Boolean(actualizado.encendido);
                            renderizarTarjetasCanales();
                            mostrarToast(
                                variable === "ninguna"
                                    ? `Regla eliminada del Canal ${canalObj.canal}.`
                                    : `Regla automática guardada para el Canal ${canalObj.canal}.`
                            );
                        } catch (err) {
                            mostrarToast(err.message || "Error al guardar la regla automática.");
                        }
                    });

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
                for (let i = 1; i <= TOTAL_CANALES_RELES; i++) {
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
                const GPIOS_RESERVADOS_S3 = new Set([
                    0, 3, 19, 20, 22, 23, 24, 25,
                    26, 27, 28, 29, 30, 31, 32,
                    33, 34, 35, 36, 37, 45, 46
                ]);

                formTecnico.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    limpiarErrorTecnico();

                    const nuevosPines = {};
                    const usados = new Set();

                    for (let i = 1; i <= TOTAL_CANALES_RELES; i++) {
                        const val = (document.getElementById(`pin-rele-${i}`)?.value || "").trim();
                        if (!val) {
                            mostrarErrorTecnico(`Indica el pin GPIO para el Relé ${i}.`);
                            return;
                        }
                        const limpio = val.toUpperCase().replace(/^GPIO\s*/, "").trim();
                        if (!/^\d+$/.test(limpio)) {
                            mostrarErrorTecnico(`Formato inválido en Relé ${i}: "${val}". Usa ej. GPIO 16.`);
                            return;
                        }
                        const numGpio = Number.parseInt(limpio, 10);
                        if (numGpio < 1 || numGpio > 48 || GPIOS_RESERVADOS_S3.has(numGpio)) {
                            mostrarErrorTecnico(`GPIO ${numGpio} está reservado en el ESP32-S3.`);
                            return;
                        }
                        const clave = `GPIO ${numGpio}`;
                        if (usados.has(clave)) {
                            mostrarErrorTecnico(`El pin "${clave}" está duplicado. Cada relé requiere un GPIO único.`);
                            return;
                        }
                        usados.add(clave);
                        nuevosPines[i] = clave;
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

                for (let i = 1; i <= TOTAL_CANALES_RELES; i++) {
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
            pollingRelesTimer = setInterval(refrescarSilenciosoDesdeBackend, 5000);
            window.addEventListener("focus", refrescarSilenciosoDesdeBackend);
            document.addEventListener("dashboard:actualizarLecturas", refrescarSilenciosoDesdeBackend);
        })();
    } finally {
        document.addEventListener = __origDocAdd;
        window.addEventListener = __origWinAdd;
        window.MutationObserver = __OrigMO;
    }

    return () => {
        if (pollingRelesTimer) clearInterval(pollingRelesTimer);
        __docListeners.forEach(([t, fn, opts]) => document.removeEventListener(t, fn, opts));
        __winListeners.forEach(([t, fn, opts]) => window.removeEventListener(t, fn, opts));
        __observers.forEach((obs) => obs.disconnect());
    };
}
