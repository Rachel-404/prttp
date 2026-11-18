package com.axion.hidroponia.service;

import com.axion.hidroponia.model.Alerta;
import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.model.SistemaPreferencias;
import com.axion.hidroponia.repository.AlertaRepository;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.repository.SistemaPreferenciasRepository;
import com.axion.hidroponia.repository.TelemetriaLecturaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class ScheduledTasksService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledTasksService.class);

    private final DispositivoRepository dispositivoRepo;
    private final AlertaRepository alertaRepo;
    private final TelemetriaLecturaRepository telemetriaRepo;
    private final SistemaPreferenciasRepository prefsRepo;
    private final SimpMessagingTemplate messagingTemplate;

    public ScheduledTasksService(
            DispositivoRepository dispositivoRepo,
            AlertaRepository alertaRepo,
            TelemetriaLecturaRepository telemetriaRepo,
            SistemaPreferenciasRepository prefsRepo,
            SimpMessagingTemplate messagingTemplate) {
        this.dispositivoRepo = dispositivoRepo;
        this.alertaRepo = alertaRepo;
        this.telemetriaRepo = telemetriaRepo;
        this.prefsRepo = prefsRepo;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Watchdog de conectividad del ESP32-S3 cada 30 segundos.
     */
    @Scheduled(fixedDelay = 30000)
    public void verificarHeartbeatDispositivos() {
        List<Dispositivo> dispositivos = dispositivoRepo.findAll();
        OffsetDateTime ahora = OffsetDateTime.now();

        for (Dispositivo disp : dispositivos) {
            if (disp.getUltimoHeartbeat() == null) continue;
            int envioSeg = 10;
            if (disp.getConfigBuffer() != null && disp.getConfigBuffer().get("envioSeg") instanceof Number n) {
                envioSeg = n.intValue();
            }
            OffsetDateTime limite = ahora.minusSeconds(Math.max(30, envioSeg * 3L));
            if (disp.isConectado() && disp.getUltimoHeartbeat().isBefore(limite)) {
                disp.setConectado(false);
                dispositivoRepo.save(disp);

                if (!alertaRepo.existsByModuloAndNivelAndLeidaFalse("nodo_maestro", "critico")) {
                    Alerta alerta = new Alerta();
                    alerta.setNivel("critico");
                    alerta.setModulo("nodo_maestro");
                    alerta.setTitulo("Pérdida de enlace con " + disp.getId());
                    alerta.setDetalle("El nodo maestro ESP32-S3 no ha reportado telemetría reciente.");
                    alerta.setUrlDestino("/nodo-maestro");
                    alerta.setLeida(false);
                    alerta.setCreadaEn(ahora);
                    Alerta guardada = alertaRepo.save(alerta);
                    messagingTemplate.convertAndSend("/topic/alertas", guardada);
                }
            }
        }
    }

    /**
     * Depuración automática según política de retención (diario a las 02:00 AM).
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void ejecutarPoliticaRetencion() {
        int dias = prefsRepo.findById(1)
                .map(SistemaPreferencias::getDiasRetencion)
                .orElse(365);
        OffsetDateTime fechaLimite = OffsetDateTime.now().minusDays(dias);
        int eliminados = telemetriaRepo.deleteOlderThan(fechaLimite);
        if (eliminados > 0) {
            log.info("Política de retención ({} días): {} lecturas depuradas.", dias, eliminados);
        }
    }
}
