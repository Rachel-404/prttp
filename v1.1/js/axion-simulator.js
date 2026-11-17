(function (global) {
    const INTERVALO_MS = 3000;
    const COOLDOWN_ALERTA_MS = 15000;
    const CLAVE_ALERTAS = "axion_proto_alertas";

    let timerId = null;
    let streamActivo = true;
    let modoForzado = "normal"; // "normal" | "ph_critico" | "nivel_bajo" | "pt100_desconectada"
    const ultimoCooldownPorSensor = {};

    const NOMINALES = {
        ec: 1210,
        ph: 6.1,
        nivel: 84.5,
        tempAgua: 21.5,
        dhtTemp: 22.8,
        dhtHum: 66
    };

    function fluctuar(centro, amplitud, decimales) {
        const delta = (Math.random() * 2 - 1) * amplitud;
        const val = centro + delta;
        return decimales > 0 ? Number(val.toFixed(decimales)) : Math.round(val);
    }

    function leerCacheSeguro(clave, defecto = {}) {
        if (global.AxionCache && typeof global.AxionCache.leerDeCache === "function") {
            return global.AxionCache.leerDeCache(clave, defecto);
        }
        try {
            const raw = localStorage.getItem(`axion_proto_${clave}`);
            return raw ? { ...defecto, ...JSON.parse(raw) } : { ...defecto };
        } catch (e) {
            return { ...defecto };
        }
    }

    function evaluarUmbral(valor, min, max) {
        if (!Number.isFinite(valor) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
            return "Normal";
        }
        if (valor < min || valor > max) {
            return "Crítico";
        }
        const margen = (max - min) * 0.05;
        if (valor <= min + margen || valor >= max - margen) {
            return "Advertencia";
        }
        return "Normal";
    }

    function mostrarToastSimulador(mensaje, nivel = "critico") {
        let toast = document.getElementById("axion-sim-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "axion-sim-toast";
            toast.className = "axion-sim-toast";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            document.body.appendChild(toast);
        }
        toast.dataset.nivel = nivel;
        toast.textContent = mensaje;
        toast.hidden = false;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.hidden = true;
        }, 4000);
    }

    function registrarAlertaEnHeader(claveSensor, nivel, titulo, detalle) {
        const ahora = Date.now();
        if (ultimoCooldownPorSensor[claveSensor] && ahora - ultimoCooldownPorSensor[claveSensor] < COOLDOWN_ALERTA_MS) {
            return;
        }
        ultimoCooldownPorSensor[claveSensor] = ahora;

        try {
            const raw = localStorage.getItem(CLAVE_ALERTAS);
            const lista = raw ? JSON.parse(raw) : [];
            const nuevaAlerta = {
                id: `sim-${claveSensor}-${ahora}`,
                nivel: nivel === "Crítico" ? "critico" : "advertencia",
                titulo,
                detalle,
                tiempo: "Ahora",
                leida: false,
                urlDestino:
                    claveSensor === "ph"
                        ? "views/sensores/ph/index.html"
                        : claveSensor === "tempAgua"
                          ? "views/sensores/nivel-temperatura/index.html?tab=temperatura"
                          : claveSensor === "nivel"
                            ? "views/sensores/nivel-temperatura/index.html"
                            : "index.html"
            };
            const actualizada = [nuevaAlerta, ...(Array.isArray(lista) ? lista : [])].slice(0, 12);
            localStorage.setItem(CLAVE_ALERTAS, JSON.stringify(actualizada));
            global.dispatchEvent(new CustomEvent("axion:alertasActualizadas", { detail: actualizada }));
        } catch (e) {
            console.warn("Simulador: no se pudo registrar alerta en caché:", e);
        }

        mostrarToastSimulador(`${titulo}: ${detalle}`, nivel === "Crítico" ? "critico" : "advertencia");
    }

    function generarTrama() {
        const cfgEc = leerCacheSeguro("ec", { activo: true, minNormal: 800, maxNormal: 1800 });
        const cfgPh = leerCacheSeguro("ph", { activo: true, minNormal: 5.5, maxNormal: 6.5 });
        const cfgNivel = leerCacheSeguro("nivel_agua", { activo: true, minNormal: 20, maxNormal: 90 });
        const cfgTemp = leerCacheSeguro("temp_agua", { activo: true, minNormal: 18.0, maxNormal: 24.0 });
        const cfgDht = leerCacheSeguro("dht22", { activo: true, tempMin: 18.0, tempMax: 28.0, humMin: 50, humMax: 80 });

        let valEc = fluctuar(NOMINALES.ec, 30, 0);
        let valPh = fluctuar(NOMINALES.ph, 0.15, 2);
        let valNivel = fluctuar(NOMINALES.nivel, 1.5, 0);
        let valTemp = fluctuar(NOMINALES.tempAgua, 0.3, 1);
        let tempEnLinea = cfgTemp.activo !== false;

        if (modoForzado === "ph_critico") {
            valPh = Number((Number(cfgPh.maxNormal || 6.5) + 0.65).toFixed(2));
        } else if (modoForzado === "nivel_bajo") {
            valNivel = Math.max(0, Number(cfgNivel.minNormal || 20) + 1);
        } else if (modoForzado === "pt100_desconectada") {
            tempEnLinea = false;
            valTemp = null;
        }

        const trama = {
            timestamp: new Date().toISOString(),
            ec: cfgEc.activo !== false ? { valor: valEc, enLinea: true } : { enLinea: false },
            ph: cfgPh.activo !== false ? { valor: valPh, enLinea: true } : { enLinea: false },
            nivel: cfgNivel.activo !== false
                ? { valor: valNivel, litros: Math.round((valNivel / 100) * 412), enLinea: true }
                : { enLinea: false },
            tempAgua: tempEnLinea ? { valor: valTemp, enLinea: true } : { valor: null, enLinea: false },
            dht22: cfgDht.activo !== false
                ? {
                      temperatura: fluctuar(NOMINALES.dhtTemp, 0.4, 1),
                      humedad: fluctuar(NOMINALES.dhtHum, 2, 0),
                      enLinea: true
                  }
                : { enLinea: false },
            esp32: {
                conectado: true,
                segundosDesdeActualizacion: 1
            }
        };

        // Evaluación automática de umbrales sobre sensores activos
        if (trama.ec.enLinea) {
            const estEc = evaluarUmbral(valEc, Number(cfgEc.minNormal), Number(cfgEc.maxNormal));
            if (estEc === "Crítico") {
                registrarAlertaEnHeader("ec", estEc, "Conductividad EC fuera de rango", `Lectura: ${valEc} µS/cm`);
            }
        }
        if (trama.ph.enLinea) {
            const estPh = evaluarUmbral(valPh, Number(cfgPh.minNormal), Number(cfgPh.maxNormal));
            if (estPh === "Crítico") {
                registrarAlertaEnHeader("ph", estPh, "pH RS485 fuera de umbral", `Lectura: ${valPh.toFixed(2)} pH (Rango: ${cfgPh.minNormal} - ${cfgPh.maxNormal})`);
            }
        }
        if (trama.nivel.enLinea) {
            const estNivel = evaluarUmbral(valNivel, Number(cfgNivel.minNormal), Number(cfgNivel.maxNormal));
            if (estNivel === "Crítico") {
                registrarAlertaEnHeader("nivel", estNivel, "Nivel de agua crítico", `Lectura: ${valNivel}%`);
            } else if (estNivel === "Advertencia" && modoForzado === "nivel_bajo") {
                registrarAlertaEnHeader("nivel", estNivel, "Nivel de agua próximo al mínimo", `Lectura: ${valNivel}%`);
            }
        }
        if (modoForzado === "pt100_desconectada") {
            registrarAlertaEnHeader("tempAgua", "Advertencia", "Desconexión temporal PT100", "Circuito abierto detectado en sonda RTD");
        } else if (trama.tempAgua.enLinea) {
            const estTemp = evaluarUmbral(valTemp, Number(cfgTemp.minNormal), Number(cfgTemp.maxNormal));
            if (estTemp === "Crítico") {
                registrarAlertaEnHeader("tempAgua", estTemp, "Temperatura del agua fuera de rango", `Lectura: ${valTemp} °C`);
            }
        }

        return trama;
    }

    function emitirTrama() {
        const trama = generarTrama();
        global.dispatchEvent(new CustomEvent("axion:telemetria", { detail: trama }));
        if (typeof global.actualizarDashboardAxion === "function") {
            global.actualizarDashboardAxion(trama);
        }
        return trama;
    }

    function iniciarStream() {
        if (timerId) clearInterval(timerId);
        streamActivo = true;
        timerId = setInterval(emitirTrama, INTERVALO_MS);
        actualizarUiPanel();
    }

    function pausarStream() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        streamActivo = false;
        actualizarUiPanel();
    }

    function inyectarEstilosPanel() {
        if (document.getElementById("axion-sim-styles")) return;
        const style = document.createElement("style");
        style.id = "axion-sim-styles";
        style.textContent = `
            .axion-sim-widget {
                position: fixed;
                left: 16px;
                bottom: 16px;
                z-index: 2200;
                font-family: inherit;
                font-size: calc(var(--font-size-base, 14px) - 2px);
            }
            .axion-sim-toggle {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 7px 12px;
                border-radius: 999px;
                border: 1px solid var(--border-color, #334155);
                background: var(--bg-card, #242d3b);
                color: var(--text-main, #f8fafc);
                font-family: inherit;
                font-size: inherit;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            }
            .axion-sim-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #22c55e;
            }
            .axion-sim-dot.pausado {
                background: #f59e0b;
            }
            .axion-sim-panel {
                margin-bottom: 8px;
                width: 260px;
                padding: 12px;
                border-radius: 10px;
                border: 1px solid var(--border-color, #334155);
                background: var(--bg-card, #242d3b);
                color: var(--text-main, #f8fafc);
                box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .axion-sim-panel[hidden] {
                display: none;
            }
            .axion-sim-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 6px;
                border-bottom: 1px solid var(--border-color, #334155);
                font-weight: 700;
            }
            .axion-sim-close {
                border: none;
                background: transparent;
                color: var(--text-muted, #94a3b8);
                cursor: pointer;
                font-weight: 700;
                font-family: inherit;
            }
            .axion-sim-btn {
                width: 100%;
                text-align: left;
                padding: 7px 10px;
                border-radius: 6px;
                border: 1px solid var(--border-color, #334155);
                background: var(--bg-main, #0f172a);
                color: var(--text-main, #f8fafc);
                font-family: inherit;
                font-size: inherit;
                font-weight: 600;
                cursor: pointer;
            }
            .axion-sim-btn:hover {
                border-color: var(--text-muted, #94a3b8);
            }
            .axion-sim-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                max-width: 380px;
                padding: 10px 14px;
                border-radius: 8px;
                border: 1px solid var(--border-color, #334155);
                border-left: 4px solid #ef4444;
                background: var(--bg-navbar, #1e293b);
                color: var(--text-main, #f8fafc);
                font-family: inherit;
                font-size: calc(var(--font-size-base, 14px) - 1px);
                font-weight: 600;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
                z-index: 2300;
            }
            .axion-sim-toast[data-nivel="advertencia"] {
                border-left-color: #f59e0b;
            }
        `;
        document.head.appendChild(style);
    }

    function actualizarUiPanel() {
        const dot = document.getElementById("axion-sim-dot");
        const btnStream = document.getElementById("axion-sim-btn-stream");
        if (dot) dot.classList.toggle("pausado", !streamActivo);
        if (btnStream) {
            btnStream.textContent = streamActivo ? "Pausar Stream (3 s)" : "Iniciar Stream (3 s)";
        }
    }

    function montarConsolaPruebas() {
        if (document.getElementById("axion-sim-widget")) return;
        inyectarEstilosPanel();

        const widget = document.createElement("aside");
        widget.id = "axion-sim-widget";
        widget.className = "axion-sim-widget";
        widget.setAttribute("aria-label", "Consola de pruebas de telemetría");

        widget.innerHTML = `
            <div id="axion-sim-panel" class="axion-sim-panel" hidden>
                <div class="axion-sim-header">
                    <span>Simulador ESP32-S3</span>
                    <button type="button" id="axion-sim-cerrar" class="axion-sim-close" aria-label="Ocultar consola">Ocultar</button>
                </div>
                <button type="button" id="axion-sim-btn-stream" class="axion-sim-btn">Pausar Stream (3 s)</button>
                <button type="button" data-sim-modo="normal" class="axion-sim-btn">Simular Operación Normal</button>
                <button type="button" data-sim-modo="ph_critico" class="axion-sim-btn">Forzar Alerta pH Alto (Crítico)</button>
                <button type="button" data-sim-modo="nivel_bajo" class="axion-sim-btn">Forzar Nivel Bajo (Advertencia)</button>
                <button type="button" data-sim-modo="pt100_desconectada" class="axion-sim-btn">Simular Desconexión PT100</button>
            </div>
            <button type="button" id="axion-sim-toggle" class="axion-sim-toggle" aria-expanded="false" aria-controls="axion-sim-panel">
                <span id="axion-sim-dot" class="axion-sim-dot" aria-hidden="true"></span>
                <span>Simulador IoT</span>
            </button>
        `;

        document.body.appendChild(widget);

        const panel = document.getElementById("axion-sim-panel");
        const btnToggle = document.getElementById("axion-sim-toggle");
        const btnCerrar = document.getElementById("axion-sim-cerrar");
        const btnStream = document.getElementById("axion-sim-btn-stream");

        btnToggle.addEventListener("click", () => {
            const abierto = !panel.hidden;
            panel.hidden = abierto;
            btnToggle.setAttribute("aria-expanded", abierto ? "false" : "true");
        });

        btnCerrar.addEventListener("click", () => {
            panel.hidden = true;
            btnToggle.setAttribute("aria-expanded", "false");
        });

        btnStream.addEventListener("click", () => {
            if (streamActivo) pausarStream();
            else {
                iniciarStream();
                emitirTrama();
            }
        });

        widget.querySelectorAll("[data-sim-modo]").forEach((btn) => {
            btn.addEventListener("click", () => {
                modoForzado = btn.dataset.simModo || "normal";
                emitirTrama();
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        montarConsolaPruebas();
        iniciarStream();
    });

    global.AxionSimulator = {
        iniciarStream,
        pausarStream,
        emitirTrama,
        establecerModo: (modo) => {
            modoForzado = modo || "normal";
            emitirTrama();
        }
    };
})(window);

