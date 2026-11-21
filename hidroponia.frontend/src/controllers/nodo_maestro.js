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
            const DEVICE_ID = "ESP32_HIDRO_01";

            const elEstadoRed = document.getElementById("nodo-estado-red");
            const elAlimentacion = document.getElementById("nodo-alimentacion");
            const elFirmware = document.getElementById("nodo-firmware");
            const elPsram = document.getElementById("nodo-psram");
            const elBufferTramas = document.getElementById("nodo-buffer-tramas");

            const inputSsid = document.getElementById("nodo-ssid");
            const selectIp = document.getElementById("nodo-asignacion-ip");
            const grupoIpEstatica = document.getElementById("grupo-ip-estatica");
            const inputIpLocal = document.getElementById("nodo-ip-local");
            const inputMascara = document.getElementById("nodo-mascara");
            const inputGateway = document.getElementById("nodo-gateway");
            const inputDns = document.getElementById("nodo-dns");
            const inputBroker = document.getElementById("nodo-broker-url");
            const inputEndpoint = document.getElementById("nodo-endpoint");
            const inputUsuario = document.getElementById("nodo-usuario");

            const inputMuestreo = document.getElementById("nodo-muestreo");
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

            async function cargarDesdeBackend() {
                if (!window.AxionApi) return;
                try {
                    const disp = await window.AxionApi.get(`/nodo-maestro/${DEVICE_ID}`);
                    if (!disp) return;

                    if (elEstadoRed) {
                        elEstadoRed.textContent = disp.conectado
                            ? `Conectado${disp.rssi != null ? ` (${disp.rssi} dBm)` : ""}`
                            : "Desconectado";
                        elEstadoRed.classList.toggle("valor-metrica-normal", Boolean(disp.conectado));
                    }
                    if (elAlimentacion) {
                        const alim = disp.alimentacion || "--";
                        const mA = disp.consumoMa != null ? ` · ${disp.consumoMa} mA` : "";
                        elAlimentacion.textContent = `${alim}${mA}`;
                    }
                    if (elFirmware) elFirmware.textContent = disp.firmware ? `v${disp.firmware}` : "--";
                    if (elPsram) elPsram.textContent = disp.psramOcupadaPct != null ? `${disp.psramOcupadaPct}% Ocupado` : "--";
                    if (elBufferTramas) elBufferTramas.textContent = `${disp.bufferTramas ?? 0} tramas`;

                    const red = disp.configRedMqtt || {};
                    if (inputSsid && red.ssid) inputSsid.value = red.ssid;
                    if (selectIp && red.asignacionIp) {
                        selectIp.value = red.asignacionIp;
                        if (grupoIpEstatica) grupoIpEstatica.hidden = red.asignacionIp !== "estatica";
                    }
                    if (inputIpLocal && red.ipLocal) inputIpLocal.value = red.ipLocal;
                    if (inputMascara && red.mascara) inputMascara.value = red.mascara;
                    if (inputGateway && red.gateway) inputGateway.value = red.gateway;
                    if (inputDns && red.dns) inputDns.value = red.dns;
                    if (inputBroker && red.brokerUrl) inputBroker.value = red.brokerUrl;
                    if (inputEndpoint && red.endpoint) inputEndpoint.value = red.endpoint;
                    if (inputUsuario && red.usuario) inputUsuario.value = red.usuario;

                    const buf = disp.configBuffer || {};
                    if (inputMuestreo && buf.muestreoSeg) {
                        const val = Math.min(3600, Math.max(300, Number(buf.muestreoSeg) || 300));
                        inputMuestreo.value = String(val);
                    }
                    if (inputParticion && buf.particionMb) inputParticion.value = String(buf.particionMb);
                    if (selectFormato && buf.formatoBuffer) selectFormato.value = buf.formatoBuffer;
                    if (inputLote && buf.loteTramas) inputLote.value = String(buf.loteTramas);
                    if (selectDesbordamiento && buf.politicaDesbordamiento) {
                        selectDesbordamiento.value = buf.politicaDesbordamiento;
                    }
                } catch (err) {
                    mostrarToast(err.message || "No se pudo cargar la configuración del controlador desde el backend.");
                }
            }

            if (selectIp && grupoIpEstatica) {
                selectIp.addEventListener("change", () => {
                    grupoIpEstatica.hidden = selectIp.value !== "estatica";
                });
            }

            if (formConectividad) {
                formConectividad.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const payloadConectividad = {
                        ssid: (inputSsid?.value || "").trim(),
                        asignacionIp: selectIp?.value || "dhcp",
                        ipLocal: (inputIpLocal?.value || "").trim(),
                        mascara: (inputMascara?.value || "").trim(),
                        gateway: (inputGateway?.value || "").trim(),
                        dns: (inputDns?.value || "").trim(),
                        protocolo: "http",
                        brokerUrl: (inputBroker?.value || "").trim(),
                        endpoint: (inputEndpoint?.value || "").trim(),
                        usuario: (inputUsuario?.value || DEVICE_ID).trim()
                    };

                    if (!payloadConectividad.ssid || !payloadConectividad.brokerUrl || !payloadConectividad.endpoint) {
                        mostrarToast("Completa el SSID, URL del backend y endpoint de telemetría.");
                        return;
                    }

                    try {
                        await window.AxionApi.put(`/nodo-maestro/${DEVICE_ID}/conectividad`, payloadConectividad);
                        mostrarToast("Configuración de conectividad y transporte guardada.");
                    } catch (err) {
                        mostrarToast(err.message || "Error al guardar la configuración de conectividad.");
                    }
                });
            }

            if (formBuffer) {
                formBuffer.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const muestreoSeg = Number(inputMuestreo?.value || 300);
                    if (!Number.isFinite(muestreoSeg) || muestreoSeg < 300 || muestreoSeg > 3600) {
                        mostrarToast("La frecuencia de muestreo debe estar entre 300 s y 3600 s.");
                        return;
                    }
                    const payloadBuffer = {
                        muestreoSeg,
                        envioSeg: muestreoSeg,
                        particionMb: Number(inputParticion?.value || 10),
                        formatoBuffer: selectFormato?.value || "cbor",
                        loteTramas: Number(inputLote?.value || 50),
                        politicaDesbordamiento: selectDesbordamiento?.value || "fifo"
                    };

                    try {
                        await window.AxionApi.put(`/nodo-maestro/${DEVICE_ID}/buffer`, payloadBuffer);
                        mostrarToast("Política de temporización y buffer offline guardada.");
                    } catch (err) {
                        mostrarToast(err.message || "Error al guardar la política de buffer.");
                    }
                });
            }

            if (btnForzarSync) {
                btnForzarSync.addEventListener("click", async () => {
                    try {
                        const res = await window.AxionApi.post(`/nodo-maestro/${DEVICE_ID}/sincronizar`);
                        mostrarToast(res.mensaje || "Orden de sincronización encolada para el ESP32-S3.");
                    } catch (err) {
                        mostrarToast(err.message || "No se pudo enviar la orden de sincronización.");
                    }
                });
            }

            if (btnValidarPinout && formPinout) {
                btnValidarPinout.addEventListener("click", () => {
                    const pinesVistos = new Set();
                    const colisiones = [];
                    formPinout.querySelectorAll("tbody tr").forEach((tr) => {
                        const texto = tr.querySelector("td")?.textContent || "";
                        const matches = texto.match(/\d+/g) || [];
                        matches.forEach((num) => {
                            if (pinesVistos.has(num)) colisiones.push(`GPIO ${num}`);
                            pinesVistos.add(num);
                        });
                    });
                    if (colisiones.length > 0) {
                        mostrarToast(`Colisión detectada en: ${[...new Set(colisiones)].join(", ")}.`);
                    } else {
                        mostrarToast(`Validación completada: ${pinesVistos.size} pines verificados sin colisiones.`);
                    }
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
                            estado: celdas[3]?.textContent?.trim() || "Asignado"
                        };
                    });
                    try {
                        await window.AxionApi.put(`/nodo-maestro/${DEVICE_ID}/pinout`, filas);
                        mostrarToast("Mapa de pines guardado y sincronizado con el nodo ESP32-S3.");
                    } catch (err) {
                        mostrarToast(err.message || "Error al guardar el mapa de pines.");
                    }
                });
            }

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
