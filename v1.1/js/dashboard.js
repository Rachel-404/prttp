document.addEventListener("DOMContentLoaded", () => {
    // Configuración de rangos operativos de referencia para cada sensor del cultivo
    const CONFIG_SENSORES = {
        ec: {
            minNormal: 800,
            maxNormal: 1800,
            margenAdvertencia: 200,
            unidad: "µS/cm",
            decimales: 0,
            idValor: "valor-ec",
            idBadge: "badge-ec",
            idTextoBadge: "texto-badge-ec",
            idExtra: "extra-ec",
            formatearExtra: (valor) => `TDS Estimado: ${Math.round(valor * 0.5)} ppm`
        },
        ph: {
            minNormal: 5.5,
            maxNormal: 6.5,
            margenAdvertencia: 0.3,
            unidad: "pH",
            decimales: 2,
            idValor: "valor-ph",
            idBadge: "badge-ph",
            idTextoBadge: "texto-badge-ph",
            idExtra: "extra-ph"
        },
        nivel: {
            minNormal: 20,
            maxNormal: 90,
            margenAdvertencia: 5,
            unidad: "%",
            decimales: 0,
            idValor: "valor-nivel",
            idBadge: "badge-nivel",
            idTextoBadge: "texto-badge-nivel",
            idExtra: "extra-nivel",
            formatearExtra: (porcentaje, litros) =>
                `Volumen estimado: ${Number.isFinite(litros) ? Math.round(litros) : Math.round((porcentaje / 85) * 350)} Litros`
        },
        tempAgua: {
            minNormal: 18.0,
            maxNormal: 24.0,
            margenAdvertencia: 1.5,
            unidad: "°C",
            decimales: 1,
            idValor: "valor-temp-agua",
            idBadge: "badge-temp-agua",
            idTextoBadge: "texto-badge-temp-agua",
            idExtra: "extra-temp-agua"
        },
        tempLechuga: {
            minNormal: 15.0,
            maxNormal: 25.0,
            margenAdvertencia: 2.0,
            unidad: "°C",
            decimales: 1,
            idValor: "valor-temp-lechuga",
            idBadge: "badge-temp-lechuga",
            idTextoBadge: "texto-badge-temp-lechuga",
            idExtra: "extra-temp-lechuga"
        }
    };

    // Estado en tiempo real del Dashboard
    const estadoDashboard = {
        ec: { valor: 1200, enLinea: true },
        ph: { valor: 6.1, enLinea: true },
        nivel: { valor: 85, litros: 350, enLinea: true },
        tempAgua: { valor: 21.5, enLinea: true },
        tempLechuga: { valor: 22.3, enLinea: true },
        esp32: {
            conectado: true,
            wifiTexto: "Excelente (-58 dBm)",
            alimentacion: "5V USB-C",
            segundosDesdeActualizacion: 2
        }
    };

    /**
     * Evalúa el nivel de alerta del valor:
     * - "valor-normal" (Verde): valor dentro del rango normal [minNormal, maxNormal]
     * - "valor-advertencia" (Naranja): desviación moderada en zona de advertencia
     * - "valor-critico" (Rojo): nivel crítico o sin señal
     */
    function evaluarClaseColor(valor, cfg, enLinea) {
        if (!enLinea || !Number.isFinite(valor)) {
            return "valor-critico";
        }
        if (valor >= cfg.minNormal && valor <= cfg.maxNormal) {
            return "valor-normal";
        }
        const limiteInfCritico = cfg.minNormal - cfg.margenAdvertencia;
        const limiteSupCritico = cfg.maxNormal + cfg.margenAdvertencia;
        if (valor >= limiteInfCritico && valor <= limiteSupCritico) {
            return "valor-advertencia";
        }
        return "valor-critico";
    }

    function actualizarBadgeConexion(elBadge, elTexto, enLinea, textoConectado = "Normal") {
        if (!elBadge || !elTexto) return;
        elBadge.classList.toggle("conectado", Boolean(enLinea));
        elBadge.classList.toggle("sin-senal", !enLinea);
        elTexto.textContent = enLinea ? textoConectado : "Sin Señal";
    }

    function renderizarTarjetaSensor(clave) {
        const cfg = CONFIG_SENSORES[clave];
        const estado = estadoDashboard[clave];
        if (!cfg || !estado) return;

        const elValor = document.getElementById(cfg.idValor);
        const elBadge = document.getElementById(cfg.idBadge);
        const elTextoBadge = document.getElementById(cfg.idTextoBadge);
        const elExtra = document.getElementById(cfg.idExtra);

        actualizarBadgeConexion(elBadge, elTextoBadge, estado.enLinea, "Normal");

        if (elValor) {
            const claseColor = evaluarClaseColor(estado.valor, cfg, estado.enLinea);
            elValor.classList.remove("valor-normal", "valor-advertencia", "valor-critico");
            elValor.classList.add(claseColor);

            if (!estado.enLinea || !Number.isFinite(estado.valor)) {
                elValor.textContent = `-- ${cfg.unidad}`;
            } else {
                const numeroFormateado =
                    cfg.decimales > 0 ? estado.valor.toFixed(cfg.decimales) : String(Math.round(estado.valor));
                elValor.textContent = `${numeroFormateado} ${cfg.unidad}`;
            }
        }

        if (elExtra && typeof cfg.formatearExtra === "function" && estado.enLinea && Number.isFinite(estado.valor)) {
            elExtra.textContent = cfg.formatearExtra(estado.valor, estado.litros);
        }
    }

    function renderizarMicrocontrolador() {
        const esp = estadoDashboard.esp32;
        const elBadge = document.getElementById("badge-esp32");
        const elTextoBadge = document.getElementById("texto-badge-esp32");
        const elWifi = document.getElementById("wifi-esp32");
        const elAlimentacion = document.getElementById("alimentacion-esp32");
        const elActualizacion = document.getElementById("actualizacion-esp32");

        actualizarBadgeConexion(elBadge, elTextoBadge, esp.conectado, "Conectado");

        if (elWifi) {
            elWifi.textContent = esp.conectado ? esp.wifiTexto : "Sin conexión";
        }
        if (elAlimentacion) {
            elAlimentacion.textContent = esp.alimentacion;
        }
        if (elActualizacion) {
            const seg = Math.max(0, Math.round(esp.segundosDesdeActualizacion));
            elActualizacion.textContent = seg === 1 ? "Hace 1 segundo" : `Hace ${seg} segundos`;
        }
    }

    function renderizarTodo() {
        Object.keys(CONFIG_SENSORES).forEach(renderizarTarjetaSensor);
        renderizarMicrocontrolador();
    }

    /**
     * Permite actualizar cualquier tarjeta en tiempo real desde WebSocket/MQTT o eventos:
     * Ejemplo:
     * window.actualizarDashboardAxion({
     *   ph: { valor: 5.55, enLinea: true }, // Naranja (advertencia)
     *   ec: { valor: 2100, enLinea: true }, // Rojo (crítico)
     *   nivel: { valor: 85, litros: 350, enLinea: false } // Sin Señal (rojo)
     * })
     */
    function actualizarDashboardAxion(nuevosDatos = {}) {
        Object.keys(CONFIG_SENSORES).forEach((clave) => {
            if (nuevosDatos[clave] && typeof nuevosDatos[clave] === "object") {
                estadoDashboard[clave] = {
                    ...estadoDashboard[clave],
                    ...nuevosDatos[clave]
                };
            }
        });

        if (nuevosDatos.esp32 && typeof nuevosDatos.esp32 === "object") {
            estadoDashboard.esp32 = {
                ...estadoDashboard.esp32,
                ...nuevosDatos.esp32
            };
        }

        renderizarTodo();
    }

    window.actualizarDashboardAxion = actualizarDashboardAxion;

    document.addEventListener("dashboard:actualizarLecturas", (e) => {
        if (e.detail) actualizarDashboardAxion(e.detail);
    });

    // Sincronización del estado de los 6 relés desde localStorage / módulo reles.js
    const CLAVE_RELES_ESTADO = "axion_reles_estado";
    const ESTADOS_RELES_DEFAULT = [
        { canal: 1, nombre: "Electrobomba 1 (Recirculación Principal)", encendido: true },
        { canal: 2, nombre: "Electrobomba 2 (Dosificación / Oxigenación)", encendido: false },
        { canal: 3, nombre: "Electrobomba 3 (Llenado / Auxiliar)", encendido: false },
        { canal: 4, nombre: "Reflector (Iluminación del Cultivo)", encendido: true },
        { canal: 5, nombre: "Canal Reserva 1 (Disponible)", encendido: false },
        { canal: 6, nombre: "Canal Reserva 2 (Disponible)", encendido: false }
    ];

    function renderizarEquiposDashboard() {
        let canales = ESTADOS_RELES_DEFAULT;
        try {
            const raw = localStorage.getItem(CLAVE_RELES_ESTADO);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.canales) && parsed.canales.length === 6) {
                    canales = parsed.canales;
                }
            }
        } catch (err) {
            console.warn("No se pudo leer el estado de relés:", err);
        }

        canales.forEach((item) => {
            const badge = document.getElementById(`dash-estado-rele-${item.canal}`);
            const fila = document.querySelector(`.item-equipo[data-canal="${item.canal}"] .nombre-equipo`);
            if (fila && item.nombre) {
                fila.textContent = `${item.canal}. ${item.nombre}`;
            }
            if (!badge) return;
            const activo = Boolean(item.encendido);
            badge.classList.toggle("encendido", activo);
            badge.classList.toggle("apagado", !activo);
            const txt = badge.querySelector(".texto-estado-equipo");
            if (txt) txt.textContent = activo ? "Encendido" : "Apagado";
        });
    }

    window.addEventListener("storage", (e) => {
        if (e.key === CLAVE_RELES_ESTADO) renderizarEquiposDashboard();
    });

    renderizarEquiposDashboard();
    renderizarTodo();
});
