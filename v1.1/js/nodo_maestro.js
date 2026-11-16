document.addEventListener("DOMContentLoaded", () => {
    const btnBleSwitch = document.getElementById("btn-ble-switch");
    const txtBleSwitch = document.getElementById("texto-ble-switch");
    const selectIp = document.getElementById("nodo-asignacion-ip");
    const grupoIpEstatica = document.getElementById("grupo-ip-estatica");
    const selectProtocolo = document.getElementById("nodo-protocolo");
    const inputPuerto = document.getElementById("nodo-puerto");
    const inputBroker = document.getElementById("nodo-broker-url");
    const inputEndpoint = document.getElementById("nodo-endpoint");

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

    if (btnBleSwitch && txtBleSwitch) {
        btnBleSwitch.addEventListener("click", () => {
            const activo = btnBleSwitch.classList.contains("activo");
            btnBleSwitch.classList.toggle("activo", !activo);
            btnBleSwitch.classList.toggle("inactivo", activo);
            btnBleSwitch.setAttribute("aria-pressed", !activo ? "true" : "false");
            txtBleSwitch.textContent = !activo ? "Activo" : "Inactivo";
            mostrarToast(!activo ? "Aprovisionamiento Bluetooth 5 LE activado." : "Aprovisionamiento Bluetooth 5 LE desactivado.");
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
            mostrarToast("Configuración de conectividad y transporte guardada.");
        });
    }

    if (formBuffer) {
        formBuffer.addEventListener("submit", (e) => {
            e.preventDefault();
            mostrarToast("Política de temporización y buffer offline LittleFS guardada.");
        });
    }

    if (btnForzarSync) {
        btnForzarSync.addEventListener("click", () => {
            mostrarToast("Sincronización manual ejecutada. Buffer en 0 tramas pendientes.");
        });
    }

    if (btnValidarPinout) {
        btnValidarPinout.addEventListener("click", () => {
            mostrarToast("Validación completada: cero colisiones de pines GPIO detectadas.");
        });
    }

    if (formPinout) {
        formPinout.addEventListener("submit", (e) => {
            e.preventDefault();
            mostrarToast("Mapa de pines guardado y sincronizado con el nodo ESP32-S3.");
        });
    }
});

