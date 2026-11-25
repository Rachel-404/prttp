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

    let toastTimer = null;
    let escaneoWifiTimer = null;

    try {
        (function () {
            const DEVICE_ID = "ESP32_HIDRO_01";

            const elEstadoRed = document.getElementById("nodo-estado-red");
            const elAlimentacion = document.getElementById("nodo-alimentacion");
            const elFirmware = document.getElementById("nodo-firmware");
            const elPsram = document.getElementById("nodo-psram");

            const inputSsid = document.getElementById("nodo-ssid");
            const inputWifiPass = document.getElementById("nodo-wifi-pass");
            const selectIp = document.getElementById("nodo-asignacion-ip");
            const grupoIpEstatica = document.getElementById("grupo-ip-estatica");
            const inputIpLocal = document.getElementById("nodo-ip-local");
            const inputMascara = document.getElementById("nodo-mascara");
            const inputGateway = document.getElementById("nodo-gateway");
            const inputDns = document.getElementById("nodo-dns");
            const inputServerUrl = document.getElementById("nodo-server-url");
            const inputUsuario = document.getElementById("nodo-usuario");
            const inputPassTransporte = document.getElementById("nodo-pass-transporte");
            const btnEscanearWifi = document.getElementById("btn-escanear-wifi");
            const estadoEscaneoWifi = document.getElementById("estado-escaneo-wifi");
            const listaRedesWifi = document.getElementById("lista-redes-wifi");

            const inputMuestreo = document.getElementById("nodo-muestreo");

            const formConectividad = document.getElementById("form-conectividad-nodo");
            const formBuffer = document.getElementById("form-buffer-nodo");
            const formPinout = document.getElementById("form-pinout-nodo");
            const btnForzarSync = document.getElementById("btn-forzar-sync");
            const btnValidarPinout = document.getElementById("btn-validar-pinout");
            const toast = document.getElementById("toast-nodo-maestro");

            function mostrarToast(mensaje) {
                if (!toast) return;
                toast.textContent = mensaje;
                toast.hidden = false;
                if (toastTimer) clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    toast.hidden = true;
                }, 3500);
            }

            function renderizarRedesWifi(redes) {
                if (!listaRedesWifi) return;
                listaRedesWifi.innerHTML = "";
                if (!Array.isArray(redes) || redes.length === 0) {
                    listaRedesWifi.hidden = true;
                    return;
                }
                listaRedesWifi.hidden = false;
                redes.forEach((red) => {
                    const ssid = String(red.ssid || "").trim();
                    if (!ssid) return;
                    const rssi = red.rssi != null ? `${red.rssi} dBm` : "-- dBm";
                    const segura = red.segura !== undefined
                        ? Boolean(red.segura)
                        : !String(red.seguridad || "").toLowerCase().includes("abierta");

                    const itemBtn = document.createElement("button");
                    itemBtn.type = "button";
                    itemBtn.className = "campo-control";
                    itemBtn.style.display = "flex";
                    itemBtn.style.justifyContent = "space-between";
                    itemBtn.style.alignItems = "center";
                    itemBtn.style.cursor = "pointer";
                    itemBtn.style.textAlign = "left";

                    const spanNombre = document.createElement("span");
                    spanNombre.innerHTML = `<strong>${ssid.replace(/</g, "&lt;")}</strong>`;

                    const spanMeta = document.createElement("span");
                    spanMeta.textContent = `${rssi} · ${segura ? "🔒 Segura" : "🔓 Abierta"}`;

                    itemBtn.appendChild(spanNombre);
                    itemBtn.appendChild(spanMeta);

                    itemBtn.addEventListener("click", () => {
                        if (inputSsid) inputSsid.value = ssid;
                        if (inputWifiPass) {
                            inputWifiPass.value = "";
                            inputWifiPass.focus();
                        }
                        mostrarToast(`Red "${ssid}" seleccionada. Ingresa la contraseña y guarda.`);
                    });

                    listaRedesWifi.appendChild(itemBtn);
                });
            }

            function renderizarTablaPinout(pinout) {
                const tbodyPinout = document.querySelector("#form-pinout-nodo tbody");
                if (!tbodyPinout || !Array.isArray(pinout) || pinout.length === 0) return;

                tbodyPinout.textContent = "";
                pinout.forEach((pin) => {
                    const tr = document.createElement("tr");

                    const tdGpio = document.createElement("td");
                    const strong = document.createElement("strong");
                    strong.textContent = pin.gpio || "";
                    tdGpio.appendChild(strong);

                    const tdInterfaz = document.createElement("td");
                    tdInterfaz.textContent = pin.interfaz || "";

                    const tdModulo = document.createElement("td");
                    tdModulo.textContent = pin.modulo || "";

                    const tdEstado = document.createElement("td");
                    const estadoTexto = String(pin.estado || "Normal").trim();
                    const estLower = estadoTexto.toLowerCase();
                    let claseEstado = "estado-normal";
                    if (estLower.includes("pendiente") || estLower.includes("advertencia")) {
                        claseEstado = "estado-advertencia";
                    } else if (estLower.includes("bloqueado") || estLower.includes("critico") || estLower.includes("crítico") || estLower.includes("error")) {
                        claseEstado = "estado-critico";
                    }

                    const spanEstado = document.createElement("span");
                    spanEstado.className = `celda-estado ${claseEstado}`;
                    const punto = document.createElement("span");
                    punto.className = "punto-estado";
                    punto.setAttribute("aria-hidden", "true");
                    const spanTexto = document.createElement("span");
                    spanTexto.textContent = estadoTexto;
                    spanEstado.appendChild(punto);
                    spanEstado.appendChild(spanTexto);
                    tdEstado.appendChild(spanEstado);

                    tr.appendChild(tdGpio);
                    tr.appendChild(tdInterfaz);
                    tr.appendChild(tdModulo);
                    tr.appendChild(tdEstado);
                    tbodyPinout.appendChild(tr);
                });
            }

            function aplicarModoIpUi(modo) {
                const esEstatica = modo === "estatica";
                [inputIpLocal, inputMascara, inputGateway, inputDns].forEach((el) => {
                    if (!el) return;
                    el.readOnly = !esEstatica;
                    el.style.opacity = esEstatica ? "1" : "0.75";
                });
                if (grupoIpEstatica) grupoIpEstatica.hidden = false;
            }

            function asignarSiNoEditando(el, valor) {
                if (!el || valor == null || valor === "") return;
                if (document.activeElement !== el) {
                    el.value = valor;
                }
            }

            async function cargarDesdeBackend(incluirRedesWifi = true) {
                if (!window.AxionApi) return;
                try {
                    const disp = await window.AxionApi.get(`/nodo-maestro/${DEVICE_ID}`);
                    if (!disp) return;
                    if (Array.isArray(disp.pinout) && disp.pinout.length > 0) {
                        renderizarTablaPinout(disp.pinout);
                    }

                    if (elEstadoRed) {
                        elEstadoRed.textContent = disp.conectado
                            ? `Conectado${disp.rssi != null ? ` · ${disp.rssi} dBm` : ""}`
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

                    const red = disp.configRed || {};
                    asignarSiNoEditando(inputSsid, red.ssid);
                    if (selectIp && red.asignacionIp && document.activeElement !== selectIp) {
                        selectIp.value = red.asignacionIp;
                    }
                    aplicarModoIpUi(selectIp ? selectIp.value : (red.asignacionIp || "dhcp"));
                    asignarSiNoEditando(inputIpLocal, red.ipLocal);
                    asignarSiNoEditando(inputMascara, red.mascara);
                    asignarSiNoEditando(inputGateway, red.gateway);
                    asignarSiNoEditando(inputDns, red.dns);
                    if (inputServerUrl && red.serverUrl) inputServerUrl.value = red.serverUrl;
                    if (inputUsuario) {
                        inputUsuario.value = red.usuario || disp.id || DEVICE_ID;
                    }

                    const buf = disp.configBuffer || {};
                    if (inputMuestreo && (buf.muestreoSeg || buf.envioSeg) && document.activeElement !== inputMuestreo) {
                        const val = Math.min(3600, Math.max(15, Number(buf.muestreoSeg || buf.envioSeg) || 300));
                        inputMuestreo.value = String(val);
                    }

                    if (incluirRedesWifi) {
                        const wifiRes = await window.AxionApi.get(`/nodo-maestro/${DEVICE_ID}/wifi/redes`).catch(() => null);
                        const redes = Array.isArray(wifiRes?.redes) ? wifiRes.redes : [];
                        if (redes.length > 0) {
                            renderizarRedesWifi(redes);
                            if (estadoEscaneoWifi) {
                                estadoEscaneoWifi.textContent = `${redes.length} red(es) encontrada(s). Haz clic en una para seleccionarla.`;
                            }
                        }
                    }
                } catch (err) {
                    if (incluirRedesWifi) {
                        mostrarToast(err.message || "No se pudo cargar la configuración del controlador desde el backend.");
                    }
                }
            }

            if (selectIp) {
                selectIp.addEventListener("change", () => {
                    aplicarModoIpUi(selectIp.value);
                });
            }

            document.addEventListener("dashboard:actualizarLecturas", () => {
                cargarDesdeBackend(false);
            });

            if (btnEscanearWifi) {
                btnEscanearWifi.addEventListener("click", async () => {
                    if (!window.AxionApi) return;
                    if (escaneoWifiTimer) {
                        clearInterval(escaneoWifiTimer);
                        escaneoWifiTimer = null;
                    }

                    btnEscanearWifi.disabled = true;
                    if (estadoEscaneoWifi) estadoEscaneoWifi.textContent = "Solicitando escaneo al ESP32-S3...";

                    try {
                        const prev = await window.AxionApi.get(`/nodo-maestro/${DEVICE_ID}/wifi/redes`).catch(() => ({}));
                        const marcaPrevia = prev?.actualizadoEn || "";
                        await window.AxionApi.post(`/nodo-maestro/${DEVICE_ID}/wifi/escanear`);

                        if (estadoEscaneoWifi) estadoEscaneoWifi.textContent = "Escaneando redes cercanas...";
                        let intentos = 0;
                        escaneoWifiTimer = setInterval(async () => {
                            intentos += 1;
                            try {
                                const res = await window.AxionApi.get(`/nodo-maestro/${DEVICE_ID}/wifi/redes`);
                                const actualizado = res?.actualizadoEn && res.actualizadoEn !== marcaPrevia;
                                if (actualizado || intentos >= 7) {
                                    clearInterval(escaneoWifiTimer);
                                    escaneoWifiTimer = null;
                                    btnEscanearWifi.disabled = false;
                                    const redes = Array.isArray(res?.redes) ? res.redes : [];
                                    renderizarRedesWifi(redes);
                                    if (estadoEscaneoWifi) {
                                        estadoEscaneoWifi.textContent = redes.length > 0
                                            ? `${redes.length} red(es) encontrada(s). Haz clic en una para seleccionarla.`
                                            : "El ESP32-S3 aún no reportó redes. Verifica que esté encendido.";
                                    }
                                }
                            } catch {
                                if (intentos >= 7) {
                                    clearInterval(escaneoWifiTimer);
                                    escaneoWifiTimer = null;
                                    btnEscanearWifi.disabled = false;
                                    if (estadoEscaneoWifi) estadoEscaneoWifi.textContent = "No se pudo obtener la lista de redes.";
                                }
                            }
                        }, 2000);
                    } catch (err) {
                        btnEscanearWifi.disabled = false;
                        if (estadoEscaneoWifi) estadoEscaneoWifi.textContent = "";
                        mostrarToast(err.message || "Error al solicitar escaneo Wi-Fi.");
                    }
                });
            }

            if (formConectividad) {
                formConectividad.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const wifiPass = (inputWifiPass?.value || "").trim();
                    const passTransporte = (inputPassTransporte?.value || "").trim();
                    const payloadConectividad = {
                        ssid: (inputSsid?.value || "").trim(),
                        asignacionIp: selectIp?.value || "dhcp",
                        protocolo: "http"
                    };

                    if (payloadConectividad.asignacionIp === "estatica") {
                        payloadConectividad.ipLocal = (inputIpLocal?.value || "").trim();
                        payloadConectividad.mascara = (inputMascara?.value || "").trim();
                        payloadConectividad.gateway = (inputGateway?.value || "").trim();
                        payloadConectividad.dns = (inputDns?.value || "").trim();
                    }

                    if (wifiPass && wifiPass !== "********") {
                        payloadConectividad.password = wifiPass;
                    }
                    if (passTransporte && passTransporte !== "********") {
                        payloadConectividad.passTransporte = passTransporte;
                    }

                    if (!payloadConectividad.ssid) {
                        mostrarToast("Completa el SSID de la red Wi-Fi.");
                        return;
                    }

                    try {
                        await window.AxionApi.put(`/nodo-maestro/${DEVICE_ID}/conectividad`, payloadConectividad);
                        if (inputWifiPass) inputWifiPass.value = "";
                        mostrarToast("Configuración de conectividad enviada al ESP32-S3.");
                    } catch (err) {
                        mostrarToast(err.message || "Error al guardar la configuración de conectividad.");
                    }
                });
            }

            if (formBuffer) {
                formBuffer.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const muestreoSeg = Number(inputMuestreo?.value || 300);
                    if (!Number.isFinite(muestreoSeg) || muestreoSeg < 15 || muestreoSeg > 3600) {
                        mostrarToast("La frecuencia de muestreo debe estar entre 15 s y 3600 s.");
                        return;
                    }
                    const payloadBuffer = {
                        muestreoSeg,
                        envioSeg: muestreoSeg
                    };

                    try {
                        await window.AxionApi.put(`/nodo-maestro/${DEVICE_ID}/buffer`, payloadBuffer);
                        mostrarToast("Cadencia de muestreo HTTP guardada en el ESP32-S3.");
                    } catch (err) {
                        mostrarToast(err.message || "Error al guardar la cadencia de muestreo.");
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
        if (toastTimer) clearTimeout(toastTimer);
        if (escaneoWifiTimer) clearInterval(escaneoWifiTimer);
        __docListeners.forEach(([t, fn, opts]) => document.removeEventListener(t, fn, opts));
        __winListeners.forEach(([t, fn, opts]) => window.removeEventListener(t, fn, opts));
        __observers.forEach((obs) => obs.disconnect());
    };
}
