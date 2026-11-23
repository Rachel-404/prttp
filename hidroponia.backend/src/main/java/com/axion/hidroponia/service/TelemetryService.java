package com.axion.hidroponia.service;

import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.model.SensorConfiguracion;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.repository.SensorConfiguracionRepository;
import com.axion.hidroponia.repository.TelemetriaLecturaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
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

    @Transactional
    public void registrarHeartbeat(String dispositivoId) {
        String id = (dispositivoId != null && !dispositivoId.isBlank()) ? dispositivoId.trim() : "ESP32_HIDRO_01";
        Dispositivo disp = dispositivoRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispositivo no encontrado: " + id));
        OffsetDateTime ahora = OffsetDateTime.now();
        disp.setConectado(true);
        disp.setUltimoHeartbeat(ahora);
        disp.setActualizadoEn(ahora);
        dispositivoRepo.save(disp);
    }

    @Transactional
    public TelemetriaLectura procesarTrama(Map<String, Object> trama) {
        if (trama == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La trama de telemetría no puede ser nula");
        }
        OffsetDateTime fechaRecoleccion = parsearTimestampObligatorio(trama.get("ts"));

        Object rawId = trama.get("dispositivo_id");
        String dispositivoId = (rawId != null && !String.valueOf(rawId).isBlank() && !"null".equalsIgnoreCase(String.valueOf(rawId).trim()))
                ? String.valueOf(rawId).trim()
                : "ESP32_HIDRO_01";
        Dispositivo disp = dispositivoRepo.findById(dispositivoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispositivo no encontrado: " + dispositivoId));

        Map<String, Object> datos = extraerMapaSeguro(trama.get("datos"));
        Map<String, Object> estado = extraerMapaSeguro(trama.get("estado"));

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
        lectura.setNivelPct(toDouble(datos.get("nivel_tanque_pct")));
        lectura.setRssi(trama.get("rssi") instanceof Number n ? n.intValue() : -60);
        lectura.setEstadoSensores(estado);

        TelemetriaLectura guardada = telemetriaRepo.save(lectura);

        Object fwObj = trama.get("fw");
        String fw = fwObj != null ? String.valueOf(fwObj).trim() : "";

        OffsetDateTime ahora = OffsetDateTime.now();
        disp.setConectado(true);
        disp.setRssi(guardada.getRssi());
        if (!fw.isBlank() && !"null".equalsIgnoreCase(fw)) {
            disp.setFirmware(fw);
        }
        disp.setUltimoHeartbeat(ahora);
        disp.setActualizadoEn(ahora);
        dispositivoRepo.save(disp);

        alertEvaluationService.evaluarYNotificar(guardada);
        return guardada;
    }

    private Map<String, Object> extraerMapaSeguro(Object raw) {
        if (!(raw instanceof Map<?, ?> rawMap)) {
            return Map.of();
        }
        Map<String, Object> resultado = new LinkedHashMap<>();
        rawMap.forEach((k, v) -> {
            if (k != null) {
                resultado.put(String.valueOf(k), v);
            }
        });
        return resultado;
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
