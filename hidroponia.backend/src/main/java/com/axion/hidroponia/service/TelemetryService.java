package com.axion.hidroponia.service;

import com.axion.hidroponia.model.SensorConfiguracion;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.repository.SensorConfiguracionRepository;
import com.axion.hidroponia.repository.TelemetriaLecturaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Map;

@Service
public class TelemetryService {

    private final DispositivoRepository dispositivoRepo;
    private final SensorConfiguracionRepository sensorRepo;
    private final TelemetriaLecturaRepository telemetriaRepo;
    private final AlertEvaluationService alertEvaluationService;

    public TelemetryService(
            DispositivoRepository dispositivoRepo,
            SensorConfiguracionRepository sensorRepo,
            TelemetriaLecturaRepository telemetriaRepo,
            AlertEvaluationService alertEvaluationService) {
        this.dispositivoRepo = dispositivoRepo;
        this.sensorRepo = sensorRepo;
        this.telemetriaRepo = telemetriaRepo;
        this.alertEvaluationService = alertEvaluationService;
    }

    @SuppressWarnings("unchecked")
    public TelemetriaLectura procesarTrama(Map<String, Object> trama) {
        OffsetDateTime fechaRecoleccion = parsearTimestampObligatorio(trama.get("ts"));

        String dispositivoId = String.valueOf(trama.getOrDefault("dispositivo_id", "ESP32_HIDRO_01"));
        Map<String, Object> datos = (Map<String, Object>) trama.getOrDefault("datos", Map.of());
        Map<String, Object> estado = (Map<String, Object>) trama.getOrDefault("estado", Map.of());

        TelemetriaLectura lectura = new TelemetriaLectura();
        lectura.setTs(fechaRecoleccion);
        lectura.setDispositivoId(dispositivoId);
        lectura.setPh(toDouble(datos.get("nivel_ph")));
        lectura.setEcUsCm(toDouble(datos.get("ec_us_cm")));
        lectura.setTdsPpm(toDouble(datos.get("tds_ppm")));

        if (lectura.getEcUsCm() == null && lectura.getTdsPpm() != null) {
            double k = obtenerKValueEc();
            lectura.setEcUsCm(Math.round((lectura.getTdsPpm() / k) * 100.0) / 100.0);
        } else if (lectura.getTdsPpm() == null && lectura.getEcUsCm() != null) {
            lectura.setTdsPpm(Math.round(lectura.getEcUsCm() * obtenerKValueEc() * 100.0) / 100.0);
        }

        lectura.setTempAguaC(toDouble(datos.get("temperatura_solucion")));
        lectura.setTempAmbC(toDouble(datos.get("temperatura_amb")));
        lectura.setHumAmbPct(toDouble(datos.get("humedad_amb")));
        lectura.setNivelCm(toDouble(datos.get("nivel_tanque_cm")));
        lectura.setNivelPct(toDouble(datos.getOrDefault("nivel_tanque_pct", 85.0)));
        lectura.setRssi(trama.get("rssi") instanceof Number n ? n.intValue() : -60);
        lectura.setEstadoSensores(estado);

        TelemetriaLectura guardada = telemetriaRepo.save(lectura);

        Object fwObj = trama.get("fw");
        String fw = fwObj != null ? String.valueOf(fwObj).trim() : "";

        dispositivoRepo.findById(dispositivoId).ifPresent(disp -> {
            disp.setConectado(true);
            disp.setRssi(guardada.getRssi());
            if (!fw.isBlank() && !"null".equalsIgnoreCase(fw)) {
                disp.setFirmware(fw);
            }
            disp.setUltimoHeartbeat(OffsetDateTime.now());
            disp.setActualizadoEn(OffsetDateTime.now());
            dispositivoRepo.save(disp);
        });

        alertEvaluationService.evaluarYNotificar(guardada);
        return guardada;
    }

    private double obtenerKValueEc() {
        return sensorRepo.findById("ec")
                .map(SensorConfiguracion::getParametrosTecnicos)
                .map(p -> toDouble(p.get("kValue")))
                .filter(v -> v != null && v > 0)
                .orElse(0.5);
    }

    private OffsetDateTime parsearTimestampObligatorio(Object rawTs) {
        if (rawTs == null) {
            return OffsetDateTime.now();
        }
        String texto = String.valueOf(rawTs).trim();
        if (texto.isEmpty()) {
            return OffsetDateTime.now();
        }
        try {
            return OffsetDateTime.parse(texto);
        } catch (DateTimeParseException e) {
            return OffsetDateTime.now();
        }
    }

    private Double toDouble(Object obj) {
        return obj instanceof Number n ? n.doubleValue() : null;
    }
}
