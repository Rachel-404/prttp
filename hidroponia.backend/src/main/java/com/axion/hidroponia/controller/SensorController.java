package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.SensorConfiguracion;
import com.axion.hidroponia.repository.SensorConfiguracionRepository;
import com.axion.hidroponia.service.AuditService;
import com.axion.hidroponia.service.MqttService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sensores")
public class SensorController {

    private final SensorConfiguracionRepository sensorRepo;
    private final AuditService auditService;
    private final MqttService mqttService;

    public SensorController(
            SensorConfiguracionRepository sensorRepo,
            AuditService auditService,
            MqttService mqttService) {
        this.sensorRepo = sensorRepo;
        this.auditService = auditService;
        this.mqttService = mqttService;
    }

    public record ControlSensorRequest(Boolean activo, Integer frecuenciaSeg, Double minNormal, Double maxNormal) {}

    @GetMapping("/{modulo}")
    public SensorConfiguracion obtenerSensor(@PathVariable String modulo) {
        return sensorRepo.findById(modulo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sensor no encontrado: " + modulo));
    }

    @PutMapping("/{modulo}/control")
    public SensorConfiguracion actualizarControl(
            @PathVariable String modulo,
            @RequestBody ControlSensorRequest req) {
        SensorConfiguracion cfg = obtenerSensor(modulo);

        if ("dht22".equals(modulo) && req.frecuenciaSeg() != null && req.frecuenciaSeg() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El periodo mínimo de muestreo del DHT22 es 2 segundos");
        }
        if (req.minNormal() != null && req.maxNormal() != null && req.minNormal() >= req.maxNormal()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El umbral mínimo debe ser menor que el máximo");
        }

        String valorPrevio = String.format("%s–%s (%ds)", cfg.getMinNormal(), cfg.getMaxNormal(), cfg.getFrecuenciaSeg());
        if (req.activo() != null) cfg.setActivo(req.activo());
        if (req.frecuenciaSeg() != null) cfg.setFrecuenciaSeg(req.frecuenciaSeg());
        if (req.minNormal() != null) cfg.setMinNormal(req.minNormal());
        if (req.maxNormal() != null) cfg.setMaxNormal(req.maxNormal());
        cfg.setActualizadoEn(OffsetDateTime.now());

        SensorConfiguracion guardado = sensorRepo.save(cfg);
        auditService.registrar(cfg.getNombre(), "Límites y Muestreo", valorPrevio,
                String.format("%s–%s (%ds)", guardado.getMinNormal(), guardado.getMaxNormal(), guardado.getFrecuenciaSeg()));
        mqttService.publicarComando("CONFIG_SENSOR", Map.of("modulo", modulo, "config", guardado));
        return guardado;
    }

    @PutMapping("/{modulo}/tecnico")
    public SensorConfiguracion actualizarTecnico(
            @PathVariable String modulo,
            @RequestBody Map<String, Object> parametros) {
        SensorConfiguracion cfg = obtenerSensor(modulo);
        Map<String, Object> merged = new HashMap<>(cfg.getParametrosTecnicos() != null ? cfg.getParametrosTecnicos() : Map.of());
        merged.putAll(parametros);
        cfg.setParametrosTecnicos(merged);
        cfg.setActualizadoEn(OffsetDateTime.now());

        SensorConfiguracion guardado = sensorRepo.save(cfg);
        auditService.registrar(cfg.getNombre(), "Parámetros Técnicos", "Anterior", "Actualizado");
        mqttService.publicarComando("CONFIG_TECNICA_SENSOR", Map.of("modulo", modulo, "parametros", merged));
        return guardado;
    }

    @PostMapping("/ph/calibrar")
    public Map<String, Object> calibrarPh(@RequestBody Map<String, Object> body) {
        SensorConfiguracion cfg = obtenerSensor("ph");
        Map<String, Object> params = new HashMap<>(cfg.getParametrosTecnicos());
        params.put("estandar", "NIST");
        params.putAll(body);
        cfg.setParametrosTecnicos(params);
        cfg.setActualizadoEn(OffsetDateTime.now());
        sensorRepo.save(cfg);

        auditService.registrar("pH RS485", "Calibración NIST", "Anterior", String.valueOf(body));
        mqttService.publicarComando("CALIBRAR_PH", body);
        return Map.of("mensaje", "Calibración de pH enviada al controlador ESP32-S3.");
    }

    @PostMapping("/ec/calibrar")
    public Map<String, Object> calibrarEc(@RequestBody Map<String, Object> body) {
        SensorConfiguracion cfg = obtenerSensor("ec");
        Map<String, Object> params = new HashMap<>(cfg.getParametrosTecnicos());
        params.putAll(body);
        cfg.setParametrosTecnicos(params);
        cfg.setActualizadoEn(OffsetDateTime.now());
        sensorRepo.save(cfg);

        auditService.registrar("Conductividad / TDS", "Calibración EC", "Anterior", String.valueOf(body));
        mqttService.publicarComando("CALIBRAR_EC", body);
        return Map.of("mensaje", "Calibración de conductividad enviada al controlador ESP32-S3.");
    }

    @PostMapping("/nivel_agua/cero")
    public Map<String, Object> calibrarCeroNivel(@RequestBody Map<String, Object> body) {
        SensorConfiguracion cfg = obtenerSensor("nivel_agua");
        Map<String, Object> params = new HashMap<>(cfg.getParametrosTecnicos());
        params.putAll(body);
        cfg.setParametrosTecnicos(params);
        cfg.setActualizadoEn(OffsetDateTime.now());
        sensorRepo.save(cfg);

        auditService.registrar("Nivel y Temperatura", "Calibración Cero LMP633", "Anterior", String.valueOf(body));
        mqttService.publicarComando("CALIBRAR_CERO_NIVEL", body);
        return Map.of("mensaje", "Calibración de punto cero registrada.");
    }
}
