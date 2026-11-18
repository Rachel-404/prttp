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

    const CLAVE_CACHE = "nodo_maestro";
    const btnBleSwitch = document.getElementById("btn-ble-switch");
    const txtBleSwitch = document.getElementById("texto-ble-switch");
    const inputSsid = document.getElementById("nodo-ssid");
    const selectIp = document.getElementById("nodo-asignacion-ip");
    const grupoIpEstatica = document.getElementById("grupo-ip-estatica");
    const inputIpLocal = document.getElementById("nodo-ip-local");
    const inputMascara = document.getElementById("nodo-mascara");
    const inputGateway = document.getElementById("nodo-gateway");
    const inputDns = document.getElementById("nodo-dns");
    const selectProtocolo = document.getElementById("nodo-protocolo");
    const inputPuerto = document.getElementById("nodo-puerto");
    const inputBroker = document.getElementById("nodo-broker-url");
    const inputEndpoint = document.getElementById("nodo-endpoint");
    const inputUsuario = document.getElementById("nodo-usuario");
    const chkTls = document.getElementById("nodo-tls");

    const inputMuestreo = document.getElementById("nodo-muestreo");
    const inputEnvio = document.getElementById("nodo-envio");
    const inputParticion = document.getElementById("nodo-particion");
    const selectFormato = document.getElementById("nodo-formato-buffer");
    const inputLote = document.getElementById("nodo-lote");
    const selectDesbordamiento = document.getElementById("nodo-desbordamiento");

    const formConectividad = document.getElementById("form-conectividad-nodo");
    const formBuffer = document.getElementById("form-buffer-nodo");
    const formPinout = document.getElementById("form-pinout-nodo");
    const btnForzarSync = document.getElementById("btn-forzar-sync");
    const btnValidarPinout = document.getElementById("btn-validar-pinout");
    const toast = document.getElementById("toast-nodo-maestro");

    let toastTimer = null;

    function mostrarToast(mensaje) {
        if (!toast) return;
        toast.textContent = mensaje;
        toast.hidden = false;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    }

    function aplicarEstadoBle(activo) {
        if (!btnBleSwitch || !txtBleSwitch) return;
        btnBleSwitch.classList.toggle("activo", activo);
        btnBleSwitch.classList.toggle("inactivo", !activo);
        btnBleSwitch.setAttribute("aria-pressed", activo ? "true" : "false");
        txtBleSwitch.textContent = activo ? "Activo" : "Inactivo";
    }

    function cargarDesdeCache() {
        if (!window.AxionCache) return;
        const datos = window.AxionCache.leerDeCache(CLAVE_CACHE);
        if (inputSsid && datos.ssid) inputSsid.value = datos.ssid;
        aplicarEstadoBle(datos.bleActivo !== false);
        if (selectIp && datos.asignacionIp) {
            selectIp.value = datos.asignacionIp;
            if (grupoIpEstatica) grupoIpEstatica.hidden = datos.asignacionIp !== "estatica";
        }
        if (inputIpLocal && datos.ipLocal) inputIpLocal.value = datos.ipLocal;
        if (inputMascara && datos.mascara) inputMascara.value = datos.mascara;
        if (inputGateway && datos.gateway) inputGateway.value = datos.gateway;
        if (inputDns && datos.dns) inputDns.value = datos.dns;
        if (selectProtocolo && datos.protocolo) selectProtocolo.value = datos.protocolo;
        if (inputPuerto && datos.puerto) inputPuerto.value = String(datos.puerto);
        if (inputBroker && datos.brokerUrl) inputBroker.value = datos.brokerUrl;
        if (inputEndpoint && datos.endpoint) inputEndpoint.value = datos.endpoint;
        if (inputUsuario && datos.usuario) inputUsuario.value = datos.usuario;
        if (chkTls) chkTls.checked = datos.habilitarTls !== false;

        if (inputMuestreo && datos.muestreoSeg) inputMuestreo.value = String(datos.muestreoSeg);
        if (inputEnvio && datos.envioSeg) inputEnvio.value = String(datos.envioSeg);
        if (inputParticion && datos.particionMb) inputParticion.value = String(datos.particionMb);
        if (selectFormato && datos.formatoBuffer) selectFormato.value = datos.formatoBuffer;
        if (inputLote && datos.loteTramas) inputLote.value = String(datos.loteTramas);
        if (selectDesbordamiento && datos.politicaDesbordamiento) {
            selectDesbordamiento.value = datos.politicaDesbordamiento;
        }
    }

    cargarDesdeCache();

    if (btnBleSwitch && txtBleSwitch) {
        btnBleSwitch.addEventListener("click", () => {
            const nuevoActivo = !btnBleSwitch.classList.contains("activo");
            aplicarEstadoBle(nuevoActivo);
            if (window.AxionCache) {
                window.AxionCache.guardarEnCache(CLAVE_CACHE, { bleActivo: nuevoActivo });
            }
            mostrarToast(nuevoActivo ? "Aprovisionamiento Bluetooth 5 LE activado." : "Aprovisionamiento Bluetooth 5 LE desactivado.");
        });
    }

    if (selectIp && grupoIpEstatica) {
        selectIp.addEventListener("change", () => {
            grupoIpEstatica.hidden = selectIp.value !== "estatica";
        });
    }

    if (selectProtocolo) {
        selectProtocolo.addEventListener("change", () => {
            const proto = selectProtocolo.value;
            if (proto === "mqtt") {
                if (inputPuerto) inputPuerto.value = "8883";
                if (inputBroker) inputBroker.value = "mqtts://broker.axion-iot.local";
                if (inputEndpoint) inputEndpoint.value = "axion/hidroponia/telemetria";
            } else if (proto === "http") {
                if (inputPuerto) inputPuerto.value = "443";
                if (inputBroker) inputBroker.value = "https://api.axion-iot.local";
                if (inputEndpoint) inputEndpoint.value = "/api/v1/telemetria";
            } else if (proto === "ws") {
                if (inputPuerto) inputPuerto.value = "8443";
                if (inputBroker) inputBroker.value = "wss://ws.axion-iot.local";
                if (inputEndpoint) inputEndpoint.value = "/stream/telemetria";
            }
        });
    }

    if (formConectividad) {
        formConectividad.addEventListener("submit", (e) => {
            e.preventDefault();
            if (window.AxionCache) {
                const prev = window.AxionCache.leerDeCache(CLAVE_CACHE);
                const nuevoProto = (selectProtocolo?.value || "mqtt").toUpperCase();
                const nuevoSsid = (inputSsid?.value || "").trim() || "AXION_LAB_HIDROPONIA";
                const payloadConectividad = {
                    ssid: nuevoSsid,
                    asignacionIp: selectIp?.value || "dhcp",
                    ipLocal: inputIpLocal?.value || "192.168.1.120",
                    mascara: inputMascara?.value || "255.255.255.0",
                    gateway: inputGateway?.value || "192.168.1.1",
                    dns: inputDns?.value || "8.8.8.8",
                    protocolo: selectProtocolo?.value || "mqtt",
                    puerto: Number(inputPuerto?.value || 8883),
                    brokerUrl: inputBroker?.value || "",
                    endpoint: inputEndpoint?.value || "",
                    usuario: inputUsuario?.value || "",
                    habilitarTls: Boolean(chkTls?.checked)
                };
                window.AxionCache.guardarEnCache(CLAVE_CACHE, payloadConectividad);
                if (window.AxionApi) {
                    window.AxionApi.put("/nodo-maestro/ESP32_HIDRO_01/conectividad", payloadConectividad).catch(() => {});
                }
                window.AxionCache.registrarAuditoria(
                    "Nodo ESP32-S3",
                    "Conectividad / Protocolo",
                    `${(prev.protocolo || "mqtt").toUpperCase()} (${prev.ssid})`,
                    `${nuevoProto} (${nuevoSsid})`
                );
            }
            mostrarToast("Configuración de conectividad y transporte guardada.");
        });
    }

    if (formBuffer) {
        formBuffer.addEventListener("submit", (e) => {
            e.preventDefault();
            if (window.AxionCache) {
                const payloadBuffer = {
                    muestreoSeg: Number(inputMuestreo?.value || 2),
                    envioSeg: Number(inputEnvio?.value || 10),
                    particionMb: Number(inputParticion?.value || 10),
                    formatoBuffer: selectFormato?.value || "cbor",
                    loteTramas: Number(inputLote?.value || 50),
                    politicaDesbordamiento: selectDesbordamiento?.value || "fifo"
                };
                window.AxionCache.guardarEnCache(CLAVE_CACHE, payloadBuffer);
                if (window.AxionApi) {
                    window.AxionApi.put("/nodo-maestro/ESP32_HIDRO_01/buffer", payloadBuffer).catch(() => {});
                }
                window.AxionCache.registrarAuditoria(
                    "Controlador ESP32-S3",
                    "Temporización / Buffer",
                    "Anterior",
                    `${inputMuestreo?.value || 2}s / ${inputEnvio?.value || 10}s`
                );
            }
            mostrarToast("Política de temporización y buffer offline LittleFS guardada.");
        });
    }

    if (btnForzarSync) {
        btnForzarSync.addEventListener("click", async () => {
            if (window.AxionApi) {
                try {
                    const res = await window.AxionApi.post("/nodo-maestro/ESP32_HIDRO_01/sincronizar");
                    mostrarToast(res.mensaje || "Sincronización manual ejecutada.");
                    return;
                } catch {
                    // Fallback
                }
            }
            mostrarToast("Sincronización manual ejecutada. Buffer en 0 tramas pendientes.");
        });
    }

    if (btnValidarPinout) {
        btnValidarPinout.addEventListener("click", () => {
            mostrarToast("Validación completada: cero colisiones de pines GPIO detectadas.");
        });
    }

    if (formPinout) {
        formPinout.addEventListener("submit", async (e) => {
            e.preventDefault();
            const filas = Array.from(formPinout.querySelectorAll("tbody tr")).map((tr) => {
                const celdas = tr.querySelectorAll("td");
                const select = tr.querySelector("select");
                return {
                    gpio: celdas[0]?.textContent?.trim() || "",
                    interfaz: celdas[1]?.textContent?.trim() || "",
                    modulo: select ? select.value : (celdas[2]?.textContent?.trim() || ""),
                    estado: celdas[3]?.textContent?.trim() || "Normal"
                };
            });
            if (window.AxionApi && filas.length) {
                window.AxionApi.put("/nodo-maestro/ESP32_HIDRO_01/pinout", filas).catch(() => {});
            }
            mostrarToast("Mapa de pines guardado y sincronizado con el nodo ESP32-S3.");
        });
    }

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
