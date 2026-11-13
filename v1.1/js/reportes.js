document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_BACKUP_CORREO = "axion_reportes_backup_correo";
    const CLAVE_BACKUP_DRIVE = "axion_reportes_backup_drive";
    const REGISTROS_POR_PAGINA = 8;

    const VARIABLES_CONFIG = {
        ph: {
            nombre: "pH del Agua",
            unidad: "pH",
            decimales: 2,
            base: 6.1,
            amplitud: 0.35,
            minNormal: 5.8,
            maxNormal: 6.5,
            margenAdv: 0.25,
            color: "#16a34a"
        },
        ec: {
            nombre: "Conductividad Eléctrica",
            unidad: "µS/cm",
            decimales: 0,
            base: 1250,
            amplitud: 240,
            minNormal: 1000,
            maxNormal: 1600,
            margenAdv: 200,
            color: "#f59e0b"
        },
        tempAgua: {
            nombre: "Temperatura del Agua",
            unidad: "°C",
            decimales: 1,
            base: 21.5,
            amplitud: 2.2,
            minNormal: 18.0,
            maxNormal: 24.0,
            margenAdv: 1.5,
            color: "#64748b"
        },
        tempAmbiente: {
            nombre: "Temperatura Ambiente",
            unidad: "°C",
            decimales: 1,
            base: 23.0,
            amplitud: 4.5,
            minNormal: 16.0,
            maxNormal: 28.0,
            margenAdv: 2.0,
            color: "#ef4444"
        },
        humedad: {
            nombre: "Humedad Relativa",
            unidad: "%",
            decimales: 0,
            base: 66,
            amplitud: 14,
            minNormal: 50,
            maxNormal: 80,
            margenAdv: 6,
            color: "#eab308"
        },
        nivelAgua: {
            nombre: "Nivel de Agua",
            unidad: "%",
            decimales: 0,
            base: 82,
            amplitud: 16,
            minNormal: 40,
            maxNormal: 95,
            margenAdv: 15,
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
        intervalo: "1h",
        variables: ["ph", "ec", "tempAgua"],
        registros: [],
        etiquetasGrafica: [],
        seriesGrafica: [],
        paginaActual: 1
    };

    // Estado persistente de Pestaña 2
    const estadoBackupCorreo = {
        activo: true,
        correo: "admin@universidad.edu",
        frecuencia: "semanal",
        formato: "xlsx"
    };

    const estadoBackupDrive = {
        conectado: true,
        cuenta: "admin@universidad.edu",
        ruta: "/AXION-IOT/Respaldos_Hidroponia/",
        frecuencia: "24h",
        ultimoRespaldo: "Hoy a las 00:00 hrs"
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

    function cargarEstadosBackup() {
        try {
            const correoRaw = localStorage.getItem(CLAVE_BACKUP_CORREO);
            if (correoRaw) Object.assign(estadoBackupCorreo, JSON.parse(correoRaw));
            const driveRaw = localStorage.getItem(CLAVE_BACKUP_DRIVE);
            if (driveRaw) Object.assign(estadoBackupDrive, JSON.parse(driveRaw));
        } catch (err) {
            console.warn("No se pudo restaurar configuración de respaldos:", err);
        }
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
        if (valor >= cfg.minNormal && valor <= cfg.maxNormal) {
            return { etiqueta: "Normal", clase: "estado-normal" };
        }
        if (valor >= cfg.minNormal - cfg.margenAdv && valor <= cfg.maxNormal + cfg.margenAdv) {
            return { etiqueta: "Advertencia", clase: "estado-advertencia" };
        }
        return { etiqueta: "Crítico", clase: "estado-critico" };
    }

    function generarDatosHistoricos() {
        const inicio = new Date(estadoHistorial.fechaInicio);
        const fin = new Date(estadoHistorial.fechaFin);
        const totalPuntos = 12;
        const spanMs = Math.max(fin.getTime() - inicio.getTime(), 60 * 60 * 1000);
        const pasoMs = spanMs / (totalPuntos - 1);

        const etiquetas = [];
        const series = estadoHistorial.variables.map((clave) => ({
            clave,
            cfg: VARIABLES_CONFIG[clave],
            valores: []
        }));
        const registros = [];

        for (let i = 0; i < totalPuntos; i++) {
            const marca = new Date(inicio.getTime() + i * pasoMs);
            const etiquetaCorta =
                estadoHistorial.intervalo === "1d"
                    ? marca.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })
                    : marca.toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            etiquetas.push(etiquetaCorta);

            series.forEach((serie, idx) => {
                const { cfg } = serie;
                const onda = Math.sin((i + 1) * 0.65 + idx * 1.1) * cfg.amplitud;
                const sesgo = i === 8 && idx === 0 ? cfg.amplitud * 1.35 : 0;
                const valorBruto = cfg.base + onda + sesgo;
                const valorNum = Number(valorBruto.toFixed(cfg.decimales));
                serie.valores.push(valorNum);

                const estado = obtenerEstadoLectura(valorNum, cfg);
                registros.push({
                    fechaHora: formatearFechaLegible(marca),
                    variable: cfg.nombre,
                    valorTexto: `${valorNum.toFixed(cfg.decimales)} ${cfg.unidad}`,
                    estadoEtiqueta: estado.etiqueta,
                    estadoClase: estado.clase
                });
            });
        }

        // Orden descendente para mostrar primero los registros más recientes
        registros.reverse();
        estadoHistorial.etiquetasGrafica = etiquetas;
        estadoHistorial.seriesGrafica = series;
        estadoHistorial.registros = registros;
        estadoHistorial.paginaActual = 1;
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

    function descargarArchivoCsv(nombreArchivo) {
        const encabezados = ["Fecha/Hora", "Variable", "Valor", "Estado"];
        const filas = estadoHistorial.registros.map((r) => [r.fechaHora, r.variable, r.valorTexto, r.estadoEtiqueta]);
        const contenido = [encabezados, ...filas]
            .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
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

        if (!formFiltros || !inputInicio || !inputFin || !selectIntervalo) return;

        inputInicio.value = estadoHistorial.fechaInicio;
        inputFin.value = estadoHistorial.fechaFin;
        selectIntervalo.value = estadoHistorial.intervalo;
        checkboxes.forEach((chk) => {
            chk.checked = estadoHistorial.variables.includes(chk.value);
        });

        if (estadoHistorial.registros.length === 0) {
            generarDatosHistoricos();
        }
        renderizarGraficaHistorial();
        renderizarTablaPaginada();

        formFiltros.addEventListener("submit", (event) => {
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
            estadoHistorial.intervalo = selectIntervalo.value;
            estadoHistorial.variables = seleccionadas;

            generarDatosHistoricos();
            renderizarGraficaHistorial();
            renderizarTablaPaginada();
            mostrarToast("Consulta histórica actualizada.");
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
                const formato = btn.dataset.formato || "CSV";
                const fechaSello = new Date().toISOString().slice(0, 10);
                const ext = formato.toLowerCase();
                const nombreArchivo = `axion_reporte_${fechaSello}.${ext}`;

                abrirModal({
                    titulo: `Generar Reporte ${formato}`,
                    mensaje: `Se preparará el archivo "${nombreArchivo}" con ${estadoHistorial.registros.length} registros históricos del intervalo seleccionado.`,
                    textoAceptar: "Generar y Descargar",
                    claseBoton: "btn-modal-activar",
                    mostrarCancelar: true,
                    onAceptar: () => {
                        if (formato === "CSV") {
                            descargarArchivoCsv(nombreArchivo);
                        }
                        mostrarToast(`Reporte ${formato} generado: ${nombreArchivo}`);
                    }
                });
            });
        });
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

        if (!formCorreo || !formDrive) return;

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

        btnEstadoCorreo.addEventListener("click", () => {
            const pausar = estadoBackupCorreo.activo;
            abrirModal({
                titulo: pausar ? "¿Pausar envío automático por correo?" : "¿Reactivar envío automático por correo?",
                mensaje: pausar
                    ? "Se suspenderán los envíos programados al correo institucional hasta que vuelvas a activarlos."
                    : "Se reanudará el envío programado de reportes al correo institucional configurado.",
                claseBoton: pausar ? "btn-modal-pausar" : "btn-modal-activar",
                onAceptar: () => {
                    estadoBackupCorreo.activo = !pausar;
                    localStorage.setItem(CLAVE_BACKUP_CORREO, JSON.stringify(estadoBackupCorreo));
                    actualizarBadgeCorreo(btnEstadoCorreo, txtEstadoCorreo, estadoBackupCorreo.activo);
                    mostrarToast(estadoBackupCorreo.activo ? "Envío automático por correo activado." : "Envío automático por correo pausado.");
                }
            });
        });

        formCorreo.addEventListener("submit", (event) => {
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
            localStorage.setItem(CLAVE_BACKUP_CORREO, JSON.stringify(estadoBackupCorreo));
            mostrarToast("Programación de envío por correo guardada.");
        });

        btnEnviarAhora.addEventListener("click", () => {
            const correo = inputCorreo.value.trim() || estadoBackupCorreo.correo;
            const formato = selectFmtCorreo.value.toUpperCase();
            abrirModal({
                titulo: "¿Enviar copia de respaldo ahora?",
                mensaje: `Se enviará una copia inmediata en formato ${formato} a la dirección ${correo}.`,
                textoAceptar: "Enviar Copia",
                claseBoton: "btn-modal-activar",
                onAceptar: () => {
                    mostrarToast(`Copia en formato ${formato} enviada a ${correo}.`);
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
                onAceptar: () => {
                    estadoBackupDrive.conectado = !desconectar;
                    localStorage.setItem(CLAVE_BACKUP_DRIVE, JSON.stringify(estadoBackupDrive));
                    actualizarBadgeDrive(btnEstadoDrive, txtEstadoDrive, estadoBackupDrive.conectado);
                    mostrarToast(estadoBackupDrive.conectado ? "Google Drive conectado." : "Google Drive desconectado.");
                }
            });
        });

        formDrive.addEventListener("submit", (event) => {
            event.preventDefault();
            errorDrive.hidden = true;
            const ruta = inputRutaDrive.value.trim();
            if (!ruta || !ruta.startsWith("/")) {
                errorDrive.textContent = "La ruta de destino en Drive debe iniciar con '/'.";
                errorDrive.hidden = false;
                return;
            }
            estadoBackupDrive.ruta = ruta;
            estadoBackupDrive.frecuencia = selectFrecDrive.value;
            localStorage.setItem(CLAVE_BACKUP_DRIVE, JSON.stringify(estadoBackupDrive));
            mostrarToast("Configuración de Google Drive guardada.");
        });

        btnRespaldarDrive.addEventListener("click", () => {
            const ruta = inputRutaDrive.value.trim() || estadoBackupDrive.ruta;
            abrirModal({
                titulo: "¿Respaldar en Google Drive ahora?",
                mensaje: `Se cargará una copia completa de los registros históricos en "${ruta}".`,
                textoAceptar: "Iniciar Respaldo",
                claseBoton: "btn-modal-activar",
                onAceptar: () => {
                    const hora = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
                    estadoBackupDrive.ultimoRespaldo = `Hoy a las ${hora} hrs`;
                    localStorage.setItem(CLAVE_BACKUP_DRIVE, JSON.stringify(estadoBackupDrive));
                    if (txtUltimoDrive) {
                        txtUltimoDrive.textContent = `Último respaldo exitoso: ${estadoBackupDrive.ultimoRespaldo}`;
                    }
                    mostrarToast("Respaldo en Google Drive completado.");
                }
            });
        });
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
                const resp = await fetch(archivoVista, { cache: "no-store" });
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
    inicializarFechasPorDefecto();
    cargarEstadosBackup();

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
});

