(function (global) {
    const INTERVALO_MS = 3000;
    const CICLO_MS = 60000;
    const AMPLITUD_ONDA = 1.25;
    const COOLDOWN_ALERTA_MS = 15000;
    const CLAVE_ALERTAS = "axion_proto_alertas";

    let timerId = null;
    let streamActivo = true;
    let modoForzado = "normal"; // "normal" | "ph_critico" | "nivel_bajo" | "pt100_desconectada"
    const ultimoCooldownPorSensor = {};

    const DESFASES_RAD = {
        ec: 0.0,
        ph: 1.2,
        nivel: 2.4,
        pt100: 3.6,
        dht22: 4.8
    };

    function calcularOnda(progreso, desfaseRad = 0) {
        return AMPLITUD_ONDA * Math.sin(2 * Math.PI * progreso + desfaseRad);
    }

    function generarValorCiclico(min, max, onda, decimales = 1, minimoFisico = 0) {
        const minNum = Number(min);
        const maxNum = Number(max);
        if (!Number.isFinite(minNum) || !Number.isFinite(maxNum) || maxNum <= minNum) {
            return minimoFisico;
        }
        const centro = (minNum + maxNum) / 2;
        const semiRango = (maxNum - minNum) / 2;
        const raw = Math.max(minimoFisico, centro + onda * semiRango);
        return decimales > 0 ? Number(raw.toFixed(decimales)) : Math.round(raw);
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
                        : claveSensor === "pt100"
                            ? "views/sensores/nivel-temperatura/index.html?tab=temperatura"
                            : claveSensor === "nivel"
                                ? "views/sensores/nivel-temperatura/index.html"
                                : claveSensor === "dht22"
                                    ? "views/sensores/temperatura_humedad/temperatura_humedad.html"
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
        const cfgNivel = leerCacheSeguro("nivel_agua", { activo: true, minNormal: 20, maxNormal: 90, nivelMinCm: 15, nivelMaxCm: 140 });
        const cfgTemp = leerCacheSeguro("temp_agua", { activo: true, minNormal: 18.0, maxNormal: 24.0 });
        const cfgDht = leerCacheSeguro("dht22", { activo: true, tempMin: 18.0, tempMax: 28.0, humMin: 50, humMax: 80 });

        const progreso = (Date.now() % CICLO_MS) / CICLO_MS;

        const ecUs = generarValorCiclico(cfgEc.minNormal, cfgEc.maxNormal, calcularOnda(progreso, DESFASES_RAD.ec), 0, 0);
        const tdsPpm = Number((ecUs * 0.5).toFixed(1));
        let nivelPh = generarValorCiclico(cfgPh.minNormal, cfgPh.maxNormal, calcularOnda(progreso, DESFASES_RAD.ph), 2, 0);
        const nivelPct = generarValorCiclico(cfgNivel.minNormal, cfgNivel.maxNormal, calcularOnda(progreso, DESFASES_RAD.nivel), 1, 0);
        let nivelCm = Number(((nivelPct / 100) * 140).toFixed(1));
        let tempSol = generarValorCiclico(cfgTemp.minNormal, cfgTemp.maxNormal, calcularOnda(progreso, DESFASES_RAD.pt100), 1, 0);
        const tempAmb = generarValorCiclico(cfgDht.tempMin, cfgDht.tempMax, calcularOnda(progreso, DESFASES_RAD.dht22), 1, 0);
        const humAmb = generarValorCiclico(cfgDht.humMin, cfgDht.humMax, calcularOnda(progreso, DESFASES_RAD.dht22 + 0.6), 1, 0);

        let estadoPt100 = cfgTemp.activo !== false ? "ok" : "pausado";

        if (modoForzado === "ph_critico") {
            nivelPh = Number((Number(cfgPh.maxNormal || 6.5) + 0.65).toFixed(2));
        } else if (modoForzado === "nivel_bajo") {
            nivelCm = Math.max(0, Number(cfgNivel.nivelMinCm || 15) + 1);
        } else if (modoForzado === "pt100_desconectada") {
            estadoPt100 = "error";
        }

        const rssi = Math.round(-61 + 4 * Math.sin(2 * Math.PI * progreso));

        const trama = {
            ts: new Date().toISOString(),
            dispositivo_id: "ESP32_HIDRO_01",
            fw: "1.0.3",
            datos: {
                temperatura_amb: tempAmb,
                humedad_amb: humAmb,
                temperatura_solucion: tempSol,
                nivel_ph: nivelPh,
                tds_ppm: tdsPpm,
                nivel_tanque_cm: nivelCm
            },
            estado: {
                dht22: cfgDht.activo !== false ? "ok" : "pausado",
                pt100: estadoPt100,
                ph: cfgPh.activo !== false ? "ok" : "pausado",
                tds: cfgEc.activo !== false ? "ok" : "pausado",
                nivel: cfgNivel.activo !== false ? "ok" : "pausado"
            },
            rssi
        };

        if (trama.estado.tds === "ok") {
            const estEc = evaluarUmbral(ecUs, Number(cfgEc.minNormal), Number(cfgEc.maxNormal));
            if (estEc === "Crítico") {
                registrarAlertaEnHeader("ec", estEc, "Conductividad EC fuera de rango", `Lectura: ${ecUs} µS/cm`);
            }
        }
        if (trama.estado.ph === "ok") {
            const estPh = evaluarUmbral(nivelPh, Number(cfgPh.minNormal), Number(cfgPh.maxNormal));
            if (estPh === "Crítico") {
                registrarAlertaEnHeader("ph", estPh, "pH RS485 fuera de umbral", `Lectura: ${nivelPh.toFixed(2)} pH`);
            }
        }
        if (trama.estado.nivel === "ok") {
            const estNivel = evaluarUmbral(nivelPct, Number(cfgNivel.minNormal), Number(cfgNivel.maxNormal));
            if (estNivel === "Crítico") {
                registrarAlertaEnHeader("nivel", estNivel, "Nivel de agua crítico", `Lectura: ${Math.round(nivelPct)}%`);
            } else if (modoForzado === "nivel_bajo") {
                registrarAlertaEnHeader("nivel", "Advertencia", "Nivel de agua próximo al mínimo", `Lectura: ${nivelCm} cm`);
            }
        }
        if (modoForzado === "pt100_desconectada") {
            registrarAlertaEnHeader("pt100", "Advertencia", "Desconexión temporal PT100", "Circuito abierto detectado en sonda RTD");
        } else if (trama.estado.pt100 === "ok") {
            const estTemp = evaluarUmbral(tempSol, Number(cfgTemp.minNormal), Number(cfgTemp.maxNormal));
            if (estTemp === "Crítico") {
                registrarAlertaEnHeader("pt100", estTemp, "Temperatura del agua fuera de rango", `Lectura: ${tempSol} °C`);
            }
        }
        if (trama.estado.dht22 === "ok") {
            const estDhtT = evaluarUmbral(tempAmb, Number(cfgDht.tempMin), Number(cfgDht.tempMax));
            const estDhtH = evaluarUmbral(humAmb, Number(cfgDht.humMin), Number(cfgDht.humMax));
            if (estDhtT === "Crítico" || estDhtH === "Crítico") {
                registrarAlertaEnHeader("dht22", "Crítico", "Microclima DHT22 fuera de rango", `Aire: ${tempAmb} °C · Humedad: ${humAmb} %`);
            }
        }

        return trama;
    }

    function emitirTrama() {
        const trama = generarTrama();
        global.dispatchEvent(new CustomEvent("axion:telemetria", { detail: trama }));
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
            .axion-sim-widget { position: fixed; left: 16px; bottom: 16px; z-index: 2200; font-family: inherit; font-size: calc(var(--font-size-base, 14px) - 2px); }
            .axion-sim-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--border-color, #334155); background: var(--bg-card, #242d3b); color: var(--text-main, #f8fafc); font-family: inherit; font-size: inherit; font-weight: 700; cursor: pointer; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); }
            .axion-sim-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
            .axion-sim-dot.pausado { background: #f59e0b; }
            .axion-sim-panel { margin-bottom: 8px; width: 260px; padding: 12px; border-radius: 10px; border: 1px solid var(--border-color, #334155); background: var(--bg-card, #242d3b); color: var(--text-main, #f8fafc); box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; gap: 8px; }
            .axion-sim-panel[hidden] { display: none; }
            .axion-sim-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 6px; border-bottom: 1px solid var(--border-color, #334155); font-weight: 700; }
            .axion-sim-close { border: none; background: transparent; color: var(--text-muted, #94a3b8); cursor: pointer; font-weight: 700; font-family: inherit; }
            .axion-sim-btn { width: 100%; text-align: left; padding: 7px 10px; border-radius: 6px; border: 1px solid var(--border-color, #334155); background: var(--bg-main, #0f172a); color: var(--text-main, #f8fafc); font-family: inherit; font-size: inherit; font-weight: 600; cursor: pointer; }
            .axion-sim-btn:hover { border-color: var(--text-muted, #94a3b8); }
            .axion-sim-toast { position: fixed; bottom: 24px; right: 24px; max-width: 380px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color, #334155); border-left: 4px solid #ef4444; background: var(--bg-navbar, #1e293b); color: var(--text-main, #f8fafc); font-family: inherit; font-size: calc(var(--font-size-base, 14px) - 1px); font-weight: 600; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35); z-index: 2300; }
            .axion-sim-toast[data-nivel="advertencia"] { border-left-color: #f59e0b; }
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
        generarValorCiclico,
        establecerModo: (modo) => {
            modoForzado = modo || "normal";
            emitirTrama();
        }
    };
})(window);
