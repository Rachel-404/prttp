package com.axion.hidroponia.service;

import com.axion.hidroponia.model.Alerta;
import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.model.ReleCanal;
import com.axion.hidroponia.model.SistemaPreferencias;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.AlertaRepository;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.repository.ReleCanalRepository;
import com.axion.hidroponia.repository.SistemaPreferenciasRepository;
import com.axion.hidroponia.repository.TelemetriaLecturaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
public class ScheduledTasksService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledTasksService.class);

    private final DispositivoRepository dispositivoRepo;
    private final AlertaRepository alertaRepo;
    private final TelemetriaLecturaRepository telemetriaRepo;
    private final SistemaPreferenciasRepository prefsRepo;
    private final ReleCanalRepository releRepo;
    private final ReporteExportService exportService;

    public ScheduledTasksService(
            DispositivoRepository dispositivoRepo,
            AlertaRepository alertaRepo,
            TelemetriaLecturaRepository telemetriaRepo,
            SistemaPreferenciasRepository prefsRepo,
            ReleCanalRepository releRepo,
            ReporteExportService exportService) {
        this.dispositivoRepo = dispositivoRepo;
        this.alertaRepo = alertaRepo;
        this.telemetriaRepo = telemetriaRepo;
        this.prefsRepo = prefsRepo;
        this.releRepo = releRepo;
        this.exportService = exportService;
    }

    private long obtenerUmbralWatchdogSeg(Dispositivo disp) {
        Map<String, Object> buf = disp.getConfigBuffer();
        if (buf != null) {
            Object raw = buf.get("envioSeg") != null ? buf.get("envioSeg") : buf.get("muestreoSeg");
            if (raw instanceof Number n && n.longValue() >= 15) {
                return Math.max(60L, n.longValue() * 3L);
            }
        }
        return 60L;
    }

    /**
     * Watchdog de conectividad del ESP32-S3 cada 15 segundos (límite dinámico: máx(60s, 3 * envioSeg)).
     */
    @Scheduled(fixedDelay = 15000)
    public void verificarHeartbeatDispositivos() {
        List<Dispositivo> dispositivos = dispositivoRepo.findAll();
        OffsetDateTime ahora = OffsetDateTime.now();

        for (Dispositivo disp : dispositivos) {
            long umbralSeg = obtenerUmbralWatchdogSeg(disp);
            OffsetDateTime limite = ahora.minusSeconds(umbralSeg);
            if (disp.isConectado()
                    && (disp.getUltimoHeartbeat() == null || disp.getUltimoHeartbeat().isBefore(limite))) {
                disp.setConectado(false);
                disp.setActualizadoEn(ahora);
                dispositivoRepo.save(disp);

                List<ReleCanal> reles = releRepo.findAllByOrderByCanalAsc();
                boolean huboCambios = false;
                for (ReleCanal r : reles) {
                    if (r.isEncendido()) {
                        r.setEncendido(false);
                        r.setActualizadoEn(ahora);
                        huboCambios = true;
                    }
                }
                if (huboCambios) {
                    releRepo.saveAll(reles);
                    log.warn("[FAIL-SAFE] Todos los relés apagados en BD por pérdida de enlace con {}", disp.getId());
                }

                if (!alertaRepo.existsByModuloAndNivelAndLeidaFalse("nodo_maestro", "critico")) {
                    Alerta alerta = new Alerta();
                    alerta.setNivel("critico");
                    alerta.setModulo("nodo_maestro");
                    alerta.setTitulo("Pérdida de enlace con " + disp.getId());
                    alerta.setDetalle("El nodo maestro ESP32-S3 no ha reportado actividad en los últimos " + umbralSeg + " segundos. Los relés fueron apagados por seguridad.");
                    alerta.setUrlDestino("/nodo-maestro");
                    alerta.setLeida(false);
                    alerta.setCreadaEn(ahora);
                    alertaRepo.save(alerta);
                }
            }
        }
    }

    /**
     * Depuración automática según política de retención (diario a las 02:00 AM).
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void ejecutarPoliticaRetencion() {
        SistemaPreferencias prefs = prefsRepo.findById(1).orElseGet(SistemaPreferencias::new);
        int dias = prefs.getDiasRetencion() != null ? prefs.getDiasRetencion() : 365;
        String accion = prefs.getAccionVencimiento() != null ? prefs.getAccionVencimiento() : "archivar";
        OffsetDateTime fechaLimite = OffsetDateTime.now().minusDays(dias);

        if ("archivar".equalsIgnoreCase(accion)) {
            try {
                List<TelemetriaLectura> antiguos = telemetriaRepo.findByTsBetweenOrderByTsAsc(
                        OffsetDateTime.now().minusYears(10), fechaLimite);
                if (!antiguos.isEmpty()) {
                    Path dir = Paths.get("respaldos_locales");
                    Files.createDirectories(dir);
                    Path archivo = dir.resolve("axion_archivo_retencion_" + OffsetDateTime.now().toEpochSecond() + ".xlsx");
                    Files.write(archivo, exportService.generarXlsx(antiguos));
                    log.info("Archivadas {} lecturas vencidas en {}", antiguos.size(), archivo);
                }
            } catch (Exception e) {
                log.warn("No se pudo archivar antes de depurar: {}. Se aborta el borrado preventivo.", e.getMessage());
                return;
            }
        }

        int eliminados = telemetriaRepo.deleteOlderThan(fechaLimite);
        if (eliminados > 0) {
            log.info("Política de retención ({} días): {} lecturas depuradas.", dias, eliminados);
        }
    }
}
