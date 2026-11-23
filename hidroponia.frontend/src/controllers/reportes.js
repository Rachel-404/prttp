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

    const REGISTROS_POR_PAGINA = 8;

    const VARIABLES_CONFIG = {
        ph: {
            nombre: "pH del Agua",
            unidad: "pH",
            decimales: 2,
            minNormal: 5.5,
            maxNormal: 6.5,
            color: "#16a34a"
        },
        ec: {
            nombre: "Conductividad Eléctrica",
            unidad: "µS/cm",
            decimales: 0,
            minNormal: 800,
            maxNormal: 1800,
            color: "#f59e0b"
        },
        tempAgua: {
            nombre: "Temperatura del Agua",
            unidad: "°C",
            decimales: 1,
            minNormal: 18.0,
            maxNormal: 24.0,
            color: "#64748b"
        },
        tempAmbiente: {
            nombre: "Temperatura Ambiente",
            unidad: "°C",
            decimales: 1,
            minNormal: 18.0,
            maxNormal: 28.0,
            color: "#ef4444"
        },
        humedad: {
            nombre: "Humedad Relativa",
            unidad: "%",
            decimales: 0,
            minNormal: 50,
            maxNormal: 80,
            color: "#eab308"
        },
        nivelAgua: {
            nombre: "Nivel de Agua",
            unidad: "%",
            decimales: 0,
            minNormal: 20,
            maxNormal: 90,
            color: "#15803d"
        }
    };

    const contenedorPestana = document.getElementById("contenido-pestana-reportes");
    const botonesPestana = Array.from(document.querySelectorAll(".btn-pestana"));
    const modal = document.getElementById("modal-reportes-overlay");
    const modalTitulo = document.getElementById("modal-reportes-titulo");
    const modalMensaje = document.getElementById("modal-reportes-mensaje");
    const btnModalCancelar = document.getElementById("btn-modal-reportes-cancelar");
    const btnModalAceptar = document.getElementById("btn-modal-reportes-aceptar");
    const toastReportes = document.getElementById("toast-reportes");

    if (!contenedorPestana || botonesPestana.length === 0 || !modal) return;

    const cacheVistas = new Map();
    let pestanaActiva = "historial";
    let graficaHistorial = null;
    let accionModalPendiente = null;
    let toastTimer = null;

    // Estado persistente de filtros y registros en Pestaña 1
    const estadoHistorial = {
        fechaInicio: "",
        fechaFin: "",
        intervalo: "crudo",
        variables: ["ph", "ec", "tempAgua", "tempAmbiente", "humedad", "nivelAgua"],
        registros: [],
        etiquetasGrafica: [],
        seriesGrafica: [],
        paginaActual: 1
    };

    // Estado de Pestaña 2 (hidratado desde GET /api/v1/respaldos/politica)
    const estadoBackupCorreo = {
        activo: false,
        correo: "",
        frecuencia: "semanal",
        formato: "xlsx"
    };

    const estadoBackupDrive = {
        conectado: false,
        cuenta: "",
        ruta: "/AXION-IOT/Respaldos_Hidroponia/",
        frecuencia: "24h",
        ultimoRespaldo: "Sin respaldos registrados"
    };

    function formatearDatetimeLocal(fecha) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
    }

    function formatearFechaLegible(fecha) {
        return fecha.toLocaleString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function inicializarFechasPorDefecto() {
        const fin = new Date();
        fin.setHours(23, 59, 0, 0);
        const inicio = new Date(fin.getTime() - 6 * 24 * 60 * 60 * 1000);
        inicio.setHours(0, 0, 0, 0);
        estadoHistorial.fechaInicio = formatearDatetimeLocal(inicio);
        estadoHistorial.fechaFin = formatearDatetimeLocal(fin);
    }

    function mostrarToast(texto) {
        if (!toastReportes) return;
        toastReportes.textContent = texto;
        toastReportes.hidden = false;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastReportes.hidden = true;
        }, 3200);
    }

    function abrirModal({ titulo, mensaje, textoAceptar = "Aceptar", claseBoton = "btn-modal-activar", mostrarCancelar = true, onAceptar = null }) {
        accionModalPendiente = onAceptar;
        modalTitulo.textContent = titulo;
        modalMensaje.textContent = mensaje;
        btnModalAceptar.textContent = textoAceptar;
        btnModalAceptar.className = `btn-modal ${claseBoton}`;
        btnModalCancelar.hidden = !mostrarCancelar;
        modal.hidden = false;
        (mostrarCancelar ? btnModalCancelar : btnModalAceptar).focus();
    }

    function cerrarModal() {
        modal.hidden = true;
        accionModalPendiente = null;
    }

    function obtenerEstadoLectura(valor, cfg) {
        if (!Number.isFinite(valor) || !cfg) {
            return { etiqueta: "Crítico", clase: "estado-critico" };
        }
        if (valor < cfg.minNormal || valor > cfg.maxNormal) {
            return { etiqueta: "Crítico", clase: "estado-critico" };
        }
        const margen = Math.max(0.0001, cfg.maxNormal - cfg.minNormal) * 0.05;
        if (valor <= cfg.minNormal + margen || valor >= cfg.maxNormal - margen) {
            return { etiqueta: "Advertencia", clase: "estado-advertencia" };
        }
        return { etiqueta: "Normal", clase: "estado-normal" };
    }

    const CAMPO_LECTURA_POR_VARIABLE = {
        ph: "ph",
        ec: "ecUsCm",
        tempAgua: "tempAguaC",
        tempAmbiente: "tempAmbC",
        humedad: "humAmbPct",
        nivelAgua: "nivelPct"
    };

    const BUCKET_MS_POR_INTERVALO = {
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000
    };

    function agruparFilasPorIntervalo(filasAsc, intervalo) {
        const bucketMs = BUCKET_MS_POR_INTERVALO[intervalo] || 0;
        if (bucketMs <= 0 || filasAsc.length === 0) {
            return filasAsc;
        }

        const grupos = new Map();
        filasAsc.forEach((fila) => {
            const ms = new Date(fila.ts).getTime();
            if (!Number.isFinite(ms)) return;
            const claveBucket = Math.floor(ms / bucketMs) * bucketMs;
            if (!grupos.has(claveBucket)) {
                grupos.set(claveBucket, []);
            }
            grupos.get(claveBucket).push(fila);
        });

        const camposNumericos = Object.values(CAMPO_LECTURA_POR_VARIABLE);
        const resultado = [];
        grupos.forEach((items, claveBucket) => {
            const filaProm = { ts: new Date(claveBucket).toISOString() };
            camposNumericos.forEach((campo) => {
                let suma = 0;
                let cuenta = 0;
                items.forEach((it) => {
                    const v = it[campo];
                    if (typeof v === "number" && Number.isFinite(v)) {
                        suma += v;
                        cuenta += 1;
                    }
                });
                filaProm[campo] = cuenta > 0 ? suma / cuenta : null;
            });
            resultado.push(filaProm);
        });

        return resultado;
    }

    async function sincronizarUmbralesDesdeBackend() {
        if (!window.AxionApi) return;
        try {
            const resumen = await window.AxionApi.get("/dashboard/resumen");
            const sensores = Array.isArray(resumen?.sensores) ? resumen.sensores : [];
            sensores.forEach((s) => {
                const mod = String(s.modulo || "").toLowerCase();
                const minVal = Number(s.minNormal);
                const maxVal = Number(s.maxNormal);
                const tec = s.parametrosTecnicos && typeof s.parametrosTecnicos === "object" ? s.parametrosTecnicos : {};

                if (mod === "ph" && Number.isFinite(minVal) && Number.isFinite(maxVal)) {
                    VARIABLES_CONFIG.ph.minNormal = minVal;
                    VARIABLES_CONFIG.ph.maxNormal = maxVal;
                } else if (mod === "ec" && Number.isFinite(minVal) && Number.isFinite(maxVal)) {
                    VARIABLES_CONFIG.ec.minNormal = minVal;
                    VARIABLES_CONFIG.ec.maxNormal = maxVal;
                } else if (mod === "temp_agua" && Number.isFinite(minVal) && Number.isFinite(maxVal)) {
                    VARIABLES_CONFIG.tempAgua.minNormal = minVal;
                    VARIABLES_CONFIG.tempAgua.maxNormal = maxVal;
                } else if (mod === "nivel_agua" && Number.isFinite(minVal) && Number.isFinite(maxVal)) {
                    VARIABLES_CONFIG.nivelAgua.minNormal = minVal;
                    VARIABLES_CONFIG.nivelAgua.maxNormal = maxVal;
                } else if (mod === "dht22") {
                    const tMin = Number.isFinite(Number(tec.tempMin)) ? Number(tec.tempMin) : minVal;
                    const tMax = Number.isFinite(Number(tec.tempMax)) ? Number(tec.tempMax) : maxVal;
                    if (Number.isFinite(tMin) && Number.isFinite(tMax)) {
                        VARIABLES_CONFIG.tempAmbiente.minNormal = tMin;
                        VARIABLES_CONFIG.tempAmbiente.maxNormal = tMax;
                    }
                    const hMin = Number(tec.humMin);
                    const hMax = Number(tec.humMax);
                    if (Number.isFinite(hMin) && Number.isFinite(hMax)) {
                        VARIABLES_CONFIG.humedad.minNormal = hMin;
                        VARIABLES_CONFIG.humedad.maxNormal = hMax;
                    }
                }
            });
        } catch (err) {
            console.warn("No se pudieron sincronizar los umbrales reales para reportes:", err);
        }
    }

    async function cargarDatosHistoricosReales() {
        await sincronizarUmbralesDesdeBackend();
        const inicioIso = new Date(estadoHistorial.fechaInicio).toISOString();
        const finIso = new Date(estadoHistorial.fechaFin).toISOString();

        const series = estadoHistorial.variables.map((clave) => ({
            clave,
            cfg: VARIABLES_CONFIG[clave],
            valores: []
        }));

        if (!window.AxionApi) {
            estadoHistorial.etiquetasGrafica = [];
            estadoHistorial.seriesGrafica = series;
            estadoHistorial.registros = [];
            estadoHistorial.paginaActual = 1;
            return;
        }

        try {
            const resp = await window.AxionApi.get(
                `/reportes/historial?inicio=${encodeURIComponent(inicioIso)}&fin=${encodeURIComponent(finIso)}&page=0&size=500`
            );
            const crudasDesc = Array.isArray(resp?.content) ? resp.content : [];
            const crudasAsc = [...crudasDesc].reverse();
            const filasAsc = agruparFilasPorIntervalo(crudasAsc, estadoHistorial.intervalo);
            const filasDesc = [...filasAsc].reverse();

            const etiquetas = [];
            filasAsc.forEach((fila) => {
                const marca = new Date(fila.ts);
                const etiquetaCorta =
                    estadoHistorial.intervalo === "1d"
                        ? marca.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })
                        : marca.toLocaleString("es-PE", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit"
                          });
                etiquetas.push(etiquetaCorta);

                series.forEach((serie) => {
                    const campo = CAMPO_LECTURA_POR_VARIABLE[serie.clave];
                    const raw = campo ? fila[campo] : null;
                    if (typeof raw === "number" && Number.isFinite(raw)) {
                        serie.valores.push(Number(raw.toFixed(serie.cfg.decimales)));
                    } else {
                        serie.valores.push(null);
                    }
                });
            });

            const registros = [];
            filasDesc.forEach((fila) => {
                const marca = new Date(fila.ts);
                series.forEach((serie) => {
                    const campo = CAMPO_LECTURA_POR_VARIABLE[serie.clave];
                    const raw = campo ? fila[campo] : null;
                    if (typeof raw !== "number" || !Number.isFinite(raw)) return;
                    const valorNum = Number(raw.toFixed(serie.cfg.decimales));
                    const estado = obtenerEstadoLectura(valorNum, serie.cfg);
                    registros.push({
                        fechaHora: formatearFechaLegible(marca),
                        variable: serie.cfg.nombre,
                        valorTexto: `${valorNum.toFixed(serie.cfg.decimales)} ${serie.cfg.unidad}`,
                        estadoEtiqueta: estado.etiqueta,
                        estadoClase: estado.clase
                    });
                });
            });

            estadoHistorial.etiquetasGrafica = etiquetas;
            estadoHistorial.seriesGrafica = series;
            estadoHistorial.registros = registros;
            estadoHistorial.paginaActual = 1;
        } catch {
            estadoHistorial.etiquetasGrafica = [];
            estadoHistorial.seriesGrafica = series;
            estadoHistorial.registros = [];
            estadoHistorial.paginaActual = 1;
            mostrarToast("No se pudo obtener el historial desde el servidor.");
        }
    }

    function obtenerColoresTemaGrafica() {
        const esClaro = document.body.classList.contains("tema-claro");
        return {
            texto: esClaro ? "#334155" : "#d6d6d6",
            grilla: esClaro ? "rgba(51, 65, 85, 0.14)" : "rgba(148, 163, 184, 0.16)",
            fondoTooltip: esClaro ? "#ffffff" : "#1e293b",
            textoTooltip: esClaro ? "#1e293b" : "#f8fafc",
            bordeTooltip: esClaro ? "#cbd5e1" : "#334155"
        };
    }

    function renderizarGraficaHistorial() {
        const canvas = document.getElementById("grafica-historial-reportes");
        if (!canvas || typeof Chart === "undefined") return;

        if (graficaHistorial) {
            graficaHistorial.destroy();
            graficaHistorial = null;
        }

        const tema = obtenerColoresTemaGrafica();
        const usarDobleEje = estadoHistorial.seriesGrafica.some((s) => s.clave === "ec") && estadoHistorial.seriesGrafica.length > 1;

        const datasets = estadoHistorial.seriesGrafica.map((serie) => ({
            label: `${serie.cfg.nombre} (${serie.cfg.unidad})`,
            data: serie.valores,
            yAxisID: usarDobleEje && serie.clave === "ec" ? "y1" : "y",
            borderColor: serie.cfg.color,
            backgroundColor: serie.cfg.color,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: false
        }));

        const scales = {
            x: {
                ticks: { color: tema.texto, maxRotation: 0, autoSkip: true },
                grid: { color: tema.grilla }
            },
            y: {
                type: "linear",
                position: "left",
                ticks: { color: tema.texto },
                grid: { color: tema.grilla }
            }
        };

        if (usarDobleEje) {
            scales.y1 = {
                type: "linear",
                position: "right",
                ticks: { color: tema.texto },
                grid: { drawOnChartArea: false }
            };
        }

        if (typeof Chart.getChart === "function") {
            const previa = Chart.getChart(canvas);
            if (previa) previa.destroy();
        }

        graficaHistorial = new Chart(canvas, {
            type: "line",
            data: {
                labels: estadoHistorial.etiquetasGrafica,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        labels: { color: tema.texto, usePointStyle: true, boxWidth: 10 }
                    },
                    tooltip: {
                        backgroundColor: tema.fondoTooltip,
                        titleColor: tema.textoTooltip,
                        bodyColor: tema.textoTooltip,
                        borderColor: tema.bordeTooltip,
                        borderWidth: 1
                    }
                },
                scales
            }
        });
    }

    function renderizarTablaPaginada() {
        const tbody = document.getElementById("tbody-registros-historial");
        const infoPag = document.getElementById("info-paginacion-historial");
        const resumen = document.getElementById("resumen-consulta-historial");
        const btnAnt = document.getElementById("btn-pagina-anterior");
        const btnSig = document.getElementById("btn-pagina-siguiente");

        if (!tbody || !infoPag || !btnAnt || !btnSig) return;

        const totalRegistros = estadoHistorial.registros.length;
        const totalPaginas = Math.max(1, Math.ceil(totalRegistros / REGISTROS_POR_PAGINA));
        estadoHistorial.paginaActual = Math.min(Math.max(1, estadoHistorial.paginaActual), totalPaginas);

        const inicio = (estadoHistorial.paginaActual - 1) * REGISTROS_POR_PAGINA;
        const visibles = estadoHistorial.registros.slice(inicio, inicio + REGISTROS_POR_PAGINA);

        tbody.innerHTML = "";
        visibles.forEach((reg) => {
            const tr = document.createElement("tr");

            const tdFecha = document.createElement("td");
            tdFecha.textContent = reg.fechaHora;

            const tdVar = document.createElement("td");
            tdVar.textContent = reg.variable;

            const tdVal = document.createElement("td");
            tdVal.textContent = reg.valorTexto;

            const tdEst = document.createElement("td");
            const spanEst = document.createElement("span");
            spanEst.className = `celda-estado ${reg.estadoClase}`;
            const punto = document.createElement("span");
            punto.className = "punto-estado";
            punto.setAttribute("aria-hidden", "true");
            const textoEst = document.createElement("span");
            textoEst.textContent = reg.estadoEtiqueta;
            spanEst.append(punto, textoEst);
            tdEst.appendChild(spanEst);

            tr.append(tdFecha, tdVar, tdVal, tdEst);
            tbody.appendChild(tr);
        });

        infoPag.textContent = `Página ${estadoHistorial.paginaActual} de ${totalPaginas} (${totalRegistros} registros)`;
        if (resumen) {
            resumen.textContent = `${totalRegistros} registros consultados (${estadoHistorial.variables.length} variables)`;
        }
        btnAnt.disabled = estadoHistorial.paginaActual <= 1;
        btnSig.disabled = estadoHistorial.paginaActual >= totalPaginas;
    }

    function inicializarEventosHistorial() {
        const formFiltros = document.getElementById("form-filtros-historial");
        const inputInicio = document.getElementById("filtro-fecha-inicio");
        const inputFin = document.getElementById("filtro-fecha-fin");
        const selectIntervalo = document.getElementById("filtro-intervalo");
        const errorFiltros = document.getElementById("error-filtros-historial");
        const checkboxes = Array.from(document.querySelectorAll('input[name="variables"]'));
        const btnAnt = document.getElementById("btn-pagina-anterior");
        const btnSig = document.getElementById("btn-pagina-siguiente");
        const btnsExportar = Array.from(document.querySelectorAll(".btn-exportar-formato"));
        const btnSuperponer = document.getElementById("btn-superponer-lecturas");

        if (!formFiltros || !inputInicio || !inputFin) return;

        inputInicio.value = estadoHistorial.fechaInicio;
        inputFin.value = estadoHistorial.fechaFin;
        if (selectIntervalo) selectIntervalo.value = estadoHistorial.intervalo;
        checkboxes.forEach((chk) => {
            chk.checked = estadoHistorial.variables.includes(chk.value);
        });

        cargarDatosHistoricosReales().then(() => {
            renderizarGraficaHistorial();
            renderizarTablaPaginada();
        });

        if (selectIntervalo) {
            selectIntervalo.addEventListener("change", async () => {
                estadoHistorial.intervalo = selectIntervalo.value;
                await cargarDatosHistoricosReales();
                renderizarGraficaHistorial();
                renderizarTablaPaginada();
            });
        }

        formFiltros.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (errorFiltros) {
                errorFiltros.hidden = true;
                errorFiltros.textContent = "";
            }

            const inicioMs = Date.parse(inputInicio.value);
            const finMs = Date.parse(inputFin.value);
            const seleccionadas = checkboxes.filter((c) => c.checked).map((c) => c.value);

            if (!Number.isFinite(inicioMs) || !Number.isFinite(finMs) || inicioMs >= finMs) {
                if (errorFiltros) {
                    errorFiltros.textContent = "La fecha y hora de inicio debe ser anterior a la fecha y hora de fin.";
                    errorFiltros.hidden = false;
                }
                return;
            }

            if (seleccionadas.length === 0) {
                if (errorFiltros) {
                    errorFiltros.textContent = "Selecciona al menos una variable del cultivo para consultar.";
                    errorFiltros.hidden = false;
                }
                return;
            }

            estadoHistorial.fechaInicio = inputInicio.value;
            estadoHistorial.fechaFin = inputFin.value;
            if (selectIntervalo) estadoHistorial.intervalo = selectIntervalo.value;
            estadoHistorial.variables = seleccionadas;

            await cargarDatosHistoricosReales();
            renderizarGraficaHistorial();
            renderizarTablaPaginada();
            mostrarToast("Consulta histórica actualizada desde PostgreSQL.");
        });

        if (btnAnt) {
            btnAnt.addEventListener("click", () => {
                if (estadoHistorial.paginaActual > 1) {
                    estadoHistorial.paginaActual -= 1;
                    renderizarTablaPaginada();
                }
            });
        }

        if (btnSig) {
            btnSig.addEventListener("click", () => {
                const totalPaginas = Math.max(1, Math.ceil(estadoHistorial.registros.length / REGISTROS_POR_PAGINA));
                if (estadoHistorial.paginaActual < totalPaginas) {
                    estadoHistorial.paginaActual += 1;
                    renderizarTablaPaginada();
                }
            });
        }

        btnsExportar.forEach((btn) => {
            btn.addEventListener("click", () => {
                const fechaSello = new Date().toISOString().slice(0, 10);
                const nombreArchivo = `axion_reporte_${fechaSello}.xlsx`;

                abrirModal({
                    titulo: "Generar Reporte Excel",
                    mensaje: `Se generará el archivo "${nombreArchivo}" con los registros históricos del intervalo seleccionado.`,
                    textoAceptar: "Generar y Descargar",
                    claseBoton: "btn-modal-activar",
                    mostrarCancelar: true,
                    onAceptar: async () => {
                        if (!window.AxionApi) {
                            mostrarToast("Cliente API no disponible.");
                            return;
                        }
                        try {
                            const inicioIso = new Date(estadoHistorial.fechaInicio).toISOString();
                            const finIso = new Date(estadoHistorial.fechaFin).toISOString();
                            await window.AxionApi.download(
                                `/reportes/exportar?inicio=${encodeURIComponent(inicioIso)}&fin=${encodeURIComponent(finIso)}`,
                                nombreArchivo
                            );
                            mostrarToast(`Reporte Excel descargado: ${nombreArchivo}`);
                        } catch {
                            mostrarToast("No se pudo descargar el reporte Excel desde el servidor.");
                        }
                    }
                });
            });
        });

        if (btnSuperponer) {
            btnSuperponer.addEventListener("click", async () => {
                const inputCsv = document.getElementById("input-bitacora-csv");
                const elDiff = document.getElementById("metrica-diff-media");
                const elRmse = document.getElementById("metrica-rmse");
                const elBland = document.getElementById("metrica-bland-altman");

                const archivo = inputCsv?.files?.[0];
                if (!archivo) {
                    mostrarToast("Selecciona primero un archivo CSV de bitácora manual.");
                    return;
                }
                const seriePh = estadoHistorial.seriesGrafica.find((s) => s.clave === "ph") || estadoHistorial.seriesGrafica[0];
                const valoresIot = (seriePh?.valores || []).filter((v) => typeof v === "number" && Number.isFinite(v));
                if (valoresIot.length === 0) {
                    mostrarToast("No hay lecturas IoT en el rango actual para contrastar.");
                    return;
                }

                try {
                    const texto = await archivo.text();
                    const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    const manuales = [];
                    lineas.forEach((linea) => {
                        const cols = linea.split(/[,;]/).map((c) => c.trim());
                        const num = Number.parseFloat(cols[cols.length - 1]);
                        if (Number.isFinite(num)) manuales.push(num);
                    });
                    const n = Math.min(manuales.length, valoresIot.length);
                    if (n === 0) {
                        mostrarToast("El archivo CSV no contiene valores numéricos válidos.");
                        return;
                    }
                    const diffs = [];
                    for (let i = 0; i < n; i++) diffs.push(valoresIot[i] - manuales[i]);
                    const mediaDiff = diffs.reduce((a, b) => a + b, 0) / n;
                    const rmse = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / n);
                    const varianza = diffs.reduce((a, b) => a + (b - mediaDiff) ** 2, 0) / n;
                    const sd = Math.sqrt(varianza);
                    const dentroLimites = diffs.filter((d) => Math.abs(d - mediaDiff) <= 1.96 * sd).length;
                    const pctBland = (dentroLimites / n) * 100;

                    if (elDiff) elDiff.textContent = `${mediaDiff.toFixed(3)} ${seriePh.cfg.unidad}`;
                    if (elRmse) elRmse.textContent = rmse.toFixed(3);
                    if (elBland) {
                        elBland.textContent = `${pctBland.toFixed(1)} % dentro de límites (${n} muestras)`;
                        elBland.classList.add("valor-metrica-normal");
                    }
                    mostrarToast(`Contraste calculado sobre ${n} pares de lecturas.`);
                } catch {
                    mostrarToast("No se pudo procesar el archivo CSV seleccionado.");
                }
            });
        }
    }

    function actualizarBadgeCorreo(btn, txt, activo) {
        if (!btn || !txt) return;
        btn.classList.toggle("activo", activo);
        btn.classList.toggle("inactivo", !activo);
        btn.setAttribute("aria-pressed", activo ? "true" : "false");
        txt.textContent = activo ? "Activo" : "Pausado";
    }

    function actualizarBadgeDrive(btn, txt, conectado) {
        if (!btn || !txt) return;
        btn.classList.toggle("activo", conectado);
        btn.classList.toggle("inactivo", !conectado);
        btn.setAttribute("aria-pressed", conectado ? "true" : "false");
        txt.textContent = conectado ? "Conectado" : "Desconectado";
    }

    function inicializarEventosRespaldos() {
        const btnEstadoCorreo = document.getElementById("btn-estado-backup-correo");
        const txtEstadoCorreo = document.getElementById("txt-estado-backup-correo");
        const formCorreo = document.getElementById("form-backup-correo");
        const inputCorreo = document.getElementById("backup-correo-destino");
        const selectFrecCorreo = document.getElementById("backup-correo-frecuencia");
        const selectFmtCorreo = document.getElementById("backup-correo-formato");
        const btnEnviarAhora = document.getElementById("btn-enviar-copia-ahora");
        const errorCorreo = document.getElementById("error-backup-correo");

        const btnEstadoDrive = document.getElementById("btn-estado-backup-drive");
        const txtEstadoDrive = document.getElementById("txt-estado-backup-drive");
        const formDrive = document.getElementById("form-backup-drive");
        const inputCuentaDrive = document.getElementById("backup-drive-cuenta");
        const inputRutaDrive = document.getElementById("backup-drive-ruta");
        const selectFrecDrive = document.getElementById("backup-drive-frecuencia");
        const txtUltimoDrive = document.getElementById("texto-ultimo-respaldo-drive");
        const btnRespaldarDrive = document.getElementById("btn-respaldar-drive-ahora");
        const errorDrive = document.getElementById("error-backup-drive");

        const formRetencion = document.getElementById("form-politica-retencion");
        const selectRetFrec = document.getElementById("retencion-frecuencia");
        const selectRetFmt = document.getElementById("retencion-formato");
        const inputRetDias = document.getElementById("retencion-dias");
        const selectRetAccion = document.getElementById("retencion-accion");
        const btnDepurarManual = document.getElementById("btn-depurar-manual");

        if (!formCorreo || !formDrive) return;

        function sincronizarVistaRespaldos() {
            actualizarBadgeCorreo(btnEstadoCorreo, txtEstadoCorreo, estadoBackupCorreo.activo);
            inputCorreo.value = estadoBackupCorreo.correo;
            selectFrecCorreo.value = estadoBackupCorreo.frecuencia;
            selectFmtCorreo.value = estadoBackupCorreo.formato;

            actualizarBadgeDrive(btnEstadoDrive, txtEstadoDrive, estadoBackupDrive.conectado);
            inputCuentaDrive.value = estadoBackupDrive.cuenta;
            inputRutaDrive.value = estadoBackupDrive.ruta;
            selectFrecDrive.value = estadoBackupDrive.frecuencia;
            if (txtUltimoDrive) {
                txtUltimoDrive.textContent = `Último respaldo exitoso: ${estadoBackupDrive.ultimoRespaldo}`;
            }
        }

        async function guardarPoliticaEnBackend(extraPayload = {}) {
            return window.AxionApi.put("/respaldos/politica", {
                backupFrecuencia: selectRetFrec?.value || "diario",
                backupFormato: selectRetFmt?.value || "zip",
                diasRetencion: Math.min(1825, Math.max(30, Number.parseInt(inputRetDias?.value || "365", 10) || 365)),
                accionVencimiento: selectRetAccion?.value || "archivar",
                configRespaldos: {
                    correo: estadoBackupCorreo,
                    drive: estadoBackupDrive
                },
                ...extraPayload
            });
        }

        async function cargarPoliticaDesdeBackend() {
            if (!window.AxionApi) return;
            try {
                const pol = await window.AxionApi.get("/respaldos/politica");
                if (!pol) return;
                if (selectRetFrec && pol.backupFrecuencia) selectRetFrec.value = pol.backupFrecuencia;
                if (selectRetFmt && pol.backupFormato) selectRetFmt.value = pol.backupFormato;
                if (inputRetDias && pol.diasRetencion) inputRetDias.value = String(pol.diasRetencion);
                if (selectRetAccion && pol.accionVencimiento) selectRetAccion.value = pol.accionVencimiento;

                const cfg = pol.configRespaldos || {};
                if (cfg.correo) Object.assign(estadoBackupCorreo, cfg.correo);
                if (cfg.drive) {
                    Object.assign(estadoBackupDrive, cfg.drive);
                    if (cfg.drive.ultimoRespaldo && !Number.isNaN(Date.parse(cfg.drive.ultimoRespaldo))) {
                        estadoBackupDrive.ultimoRespaldo = formatearFechaLegible(new Date(cfg.drive.ultimoRespaldo));
                    }
                }
                sincronizarVistaRespaldos();
            } catch (err) {
                mostrarToast(err.message || "No se pudo cargar la política de respaldos desde el servidor.");
            }
        }

        sincronizarVistaRespaldos();
        cargarPoliticaDesdeBackend();

        btnEstadoCorreo.addEventListener("click", () => {
            const pausar = estadoBackupCorreo.activo;
            abrirModal({
                titulo: pausar ? "¿Pausar envío automático por correo?" : "¿Reactivar envío automático por correo?",
                mensaje: pausar
                    ? "Se suspenderán los envíos programados al correo institucional hasta que vuelvas a activarlos."
                    : "Se reanudará el envío programado de reportes al correo institucional configurado.",
                claseBoton: pausar ? "btn-modal-pausar" : "btn-modal-activar",
                onAceptar: async () => {
                    estadoBackupCorreo.activo = !pausar;
                    try {
                        await guardarPoliticaEnBackend();
                        actualizarBadgeCorreo(btnEstadoCorreo, txtEstadoCorreo, estadoBackupCorreo.activo);
                        mostrarToast(estadoBackupCorreo.activo ? "Envío automático por correo activado." : "Envío automático por correo pausado.");
                    } catch (err) {
                        estadoBackupCorreo.activo = pausar;
                        mostrarToast(err.message || "No se pudo actualizar el estado del respaldo por correo.");
                    }
                }
            });
        });

        formCorreo.addEventListener("submit", async (event) => {
            event.preventDefault();
            errorCorreo.hidden = true;
            const correo = inputCorreo.value.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                errorCorreo.textContent = "Ingresa un correo institucional válido.";
                errorCorreo.hidden = false;
                return;
            }
            estadoBackupCorreo.correo = correo;
            estadoBackupCorreo.frecuencia = selectFrecCorreo.value;
            estadoBackupCorreo.formato = selectFmtCorreo.value;
            try {
                await guardarPoliticaEnBackend();
                mostrarToast("Programación de envío por correo guardada.");
            } catch (err) {
                mostrarToast(err.message || "Error al guardar la configuración de correo.");
            }
        });

        btnEnviarAhora.addEventListener("click", () => {
            const correo = inputCorreo.value.trim() || estadoBackupCorreo.correo;
            const formato = selectFmtCorreo.value.toUpperCase();
            abrirModal({
                titulo: "¿Enviar copia de respaldo ahora?",
                mensaje: `Se ejecutará una copia inmediata en formato ${formato} hacia ${correo}.`,
                textoAceptar: "Enviar Copia",
                claseBoton: "btn-modal-activar",
                onAceptar: async () => {
                    try {
                        const res = await window.AxionApi.post("/respaldos/ejecutar", {
                            canal: "correo",
                            destino: correo,
                            formato
                        });
                        mostrarToast(res.mensaje || `Respaldo registrado para ${correo}.`);
                    } catch (err) {
                        mostrarToast(err.message || "No se pudo ejecutar el respaldo manual.");
                    }
                }
            });
        });

        btnEstadoDrive.addEventListener("click", () => {
            const desconectar = estadoBackupDrive.conectado;
            abrirModal({
                titulo: desconectar ? "¿Desconectar Google Drive institucional?" : "¿Reconectar Google Drive institucional?",
                mensaje: desconectar
                    ? "Se detendrá la sincronización automática hacia la carpeta de Google Drive."
                    : "Se restablecerá la sincronización automática hacia la carpeta de Google Drive configurada.",
                claseBoton: desconectar ? "btn-modal-pausar" : "btn-modal-activar",
                onAceptar: async () => {
                    estadoBackupDrive.conectado = !desconectar;
                    try {
                        await guardarPoliticaEnBackend();
                        actualizarBadgeDrive(btnEstadoDrive, txtEstadoDrive, estadoBackupDrive.conectado);
                        mostrarToast(estadoBackupDrive.conectado ? "Google Drive conectado." : "Google Drive desconectado.");
                    } catch (err) {
                        estadoBackupDrive.conectado = desconectar;
                        mostrarToast(err.message || "No se pudo actualizar el estado de Google Drive.");
                    }
                }
            });
        });

        formDrive.addEventListener("submit", async (event) => {
            event.preventDefault();
            errorDrive.hidden = true;
            const ruta = inputRutaDrive.value.trim();
            if (!ruta || !ruta.startsWith("/")) {
                errorDrive.textContent = "La ruta de destino en Drive debe iniciar con '/'.";
                errorDrive.hidden = false;
                return;
            }
            estadoBackupDrive.cuenta = inputCuentaDrive.value.trim();
            estadoBackupDrive.ruta = ruta;
            estadoBackupDrive.frecuencia = selectFrecDrive.value;
            try {
                await guardarPoliticaEnBackend();
                mostrarToast("Configuración de Google Drive guardada.");
            } catch (err) {
                mostrarToast(err.message || "Error al guardar la configuración de Google Drive.");
            }
        });

        btnRespaldarDrive.addEventListener("click", () => {
            const ruta = inputRutaDrive.value.trim() || estadoBackupDrive.ruta;
            abrirModal({
                titulo: "¿Respaldar en Google Drive ahora?",
                mensaje: `Se registrará un respaldo completo de los datos históricos en "${ruta}".`,
                textoAceptar: "Iniciar Respaldo",
                claseBoton: "btn-modal-activar",
                onAceptar: async () => {
                    try {
                        const res = await window.AxionApi.post("/respaldos/ejecutar", {
                            canal: "drive",
                            destino: ruta
                        });
                        const fechaRes = res.ejecutadoEn ? formatearFechaLegible(new Date(res.ejecutadoEn)) : "Reciente";
                        estadoBackupDrive.ultimoRespaldo = fechaRes;
                        if (txtUltimoDrive) {
                            txtUltimoDrive.textContent = `Último respaldo exitoso: ${estadoBackupDrive.ultimoRespaldo}`;
                        }
                        mostrarToast(res.mensaje || "Respaldo en Google Drive completado.");
                    } catch (err) {
                        mostrarToast(err.message || "No se pudo ejecutar el respaldo en Drive.");
                    }
                }
            });
        });

        if (formRetencion) {
            formRetencion.addEventListener("submit", async (e) => {
                e.preventDefault();
                const dias = Math.min(1825, Math.max(30, Number.parseInt(inputRetDias?.value || "365", 10) || 365));
                if (inputRetDias) inputRetDias.value = String(dias);
                try {
                    await guardarPoliticaEnBackend({ diasRetencion: dias });
                    mostrarToast("Política de retención y respaldos guardada.");
                } catch (err) {
                    mostrarToast(err.message || "Error al guardar la política de retención.");
                }
            });
        }

        if (btnDepurarManual) {
            btnDepurarManual.addEventListener("click", async () => {
                try {
                    const res = await window.AxionApi.post("/respaldos/depurar");
                    mostrarToast(`Depuración completada: ${res.eliminados ?? 0} registros vencidos eliminados.`);
                } catch (err) {
                    mostrarToast(err.message || "Error al ejecutar la depuración manual.");
                }
            });
        }
    }

    async function cargarVistaPestana(boton) {
        const tabId = boton.dataset.tab;
        const archivoVista = boton.dataset.view;
        if (!tabId || !archivoVista) return;

        pestanaActiva = tabId;
        botonesPestana.forEach((b) => {
            const activa = b === boton;
            b.classList.toggle("activa", activa);
            b.setAttribute("aria-selected", activa ? "true" : "false");
        });
        contenedorPestana.setAttribute("aria-labelledby", boton.id);

        if (graficaHistorial) {
            graficaHistorial.destroy();
            graficaHistorial = null;
        }

        try {
            let html = cacheVistas.get(archivoVista);
            if (!html) {
                const resp = await fetch(`/views/reportes/${archivoVista}`, { cache: "no-store" });
                if (!resp.ok) throw new Error(`No se pudo cargar ${archivoVista}`);
                html = await resp.text();
                cacheVistas.set(archivoVista, html);
            }
            contenedorPestana.innerHTML = html;

            if (tabId === "historial") {
                inicializarEventosHistorial();
            } else if (tabId === "respaldos") {
                inicializarEventosRespaldos();
            }
        } catch (err) {
            console.error(err);
            contenedorPestana.innerHTML = '<div class="card"><div class="cuerpo-card"><p class="mensaje-error-form">No se pudo cargar la vista seleccionada.</p></div></div>';
        }
    }

    // Inicialización global
    const esAdmin = Boolean(window.AxionAuth && window.AxionAuth.esAdministrador());
    const btnTabRespaldos = document.getElementById("tab-respaldos");
    const tituloModulo = document.querySelector(".titulo-modulo-reportes h1");
    if (!esAdmin) {
        if (btnTabRespaldos) btnTabRespaldos.hidden = true;
        if (tituloModulo) tituloModulo.textContent = "Reportes e Investigación";
    }

    inicializarFechasPorDefecto();

    botonesPestana.forEach((boton) => {
        boton.addEventListener("click", () => {
            if (boton.dataset.tab === pestanaActiva && contenedorPestana.innerHTML.trim() !== "") return;
            cargarVistaPestana(boton);
        });
    });

    btnModalCancelar.addEventListener("click", cerrarModal);
    btnModalAceptar.addEventListener("click", () => {
        const cb = accionModalPendiente;
        cerrarModal();
        if (typeof cb === "function") cb();
    });
    modal.addEventListener("click", (event) => {
        if (event.target === modal) cerrarModal();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) cerrarModal();
    });

    // Actualizar colores de la gráfica al cambiar entre modo oscuro y modo claro
    const observadorTema = new MutationObserver(() => {
        if (pestanaActiva === "historial" && graficaHistorial) {
            renderizarGraficaHistorial();
        }
    });
    observadorTema.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // Cargar pestaña 1 por defecto ("Historial y Exportación")
    const tabInicial = botonesPestana.find((b) => b.dataset.tab === "historial") || botonesPestana[0];
    if (tabInicial) cargarVistaPestana(tabInicial);

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
