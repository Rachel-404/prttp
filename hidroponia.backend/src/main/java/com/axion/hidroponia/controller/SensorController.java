package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.SensorConfiguracion;
import com.axion.hidroponia.repository.SensorConfiguracionRepository;
import com.axion.hidroponia.service.AuditService;
import com.axion.hidroponia.service.DeviceCommandService;
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
    private final DeviceCommandService commandService;

    public SensorController(
            SensorConfiguracionRepository sensorRepo,
            AuditService auditService,
            DeviceCommandService commandService) {
        this.sensorRepo = sensorRepo;
        this.auditService = auditService;
        this.commandService = commandService;
    }

    public record ControlSensorRequest(Boolean activo, Double minNormal, Double maxNormal) {}

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

        Double effMin = req.minNormal() != null ? req.minNormal() : cfg.getMinNormal();
        Double effMax = req.maxNormal() != null ? req.maxNormal() : cfg.getMaxNormal();
        if (effMin != null && effMax != null) {
            if (!Double.isFinite(effMin) || !Double.isFinite(effMax) || effMin >= effMax) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El umbral mínimo debe ser menor que el máximo");
            }
            validarLimitesFisicosSensor(modulo, effMin, effMax);
        }

        String valorPrevio = String.format("%s–%s · %s", cfg.getMinNormal(), cfg.getMaxNormal(), cfg.isActivo() ? "activo" : "pausado");
        if (req.activo() != null) cfg.setActivo(req.activo());
        if (req.minNormal() != null) cfg.setMinNormal(req.minNormal());
        if (req.maxNormal() != null) cfg.setMaxNormal(req.maxNormal());
        cfg.setActualizadoEn(OffsetDateTime.now());

        SensorConfiguracion guardado = sensorRepo.save(cfg);
        auditService.registrar(cfg.getNombre(), "Umbrales y Estado", valorPrevio,
                String.format("%s–%s · %s", guardado.getMinNormal(), guardado.getMaxNormal(), guardado.isActivo() ? "activo" : "pausado"));
        commandService.encolarComando("CONFIG_SENSOR", Map.of("modulo", modulo, "activo", guardado.isActivo()));
        return guardado;
    }

    private void validarLimitesFisicosSensor(String modulo, double min, double max) {
        switch (modulo) {
            case "ph" -> {
                if (min < 0.0 || max > 14.0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rango físico del electrodo de pH H-101 es 0.00 a 14.00 pH");
                }
            }
            case "ec" -> {
                if (min < 0.0 || max > 2000.0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rango físico del sensor TDS Meter V1.0 es 0 a 2000 µS/cm");
                }
            }
            case "temp_agua" -> {
                if (min < 0.0 || max > 400.0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rango físico de la sonda PT100 es 0.0 a 400.0 °C");
                }
            }
            case "dht22" -> {
                if (min < -40.0 || max > 80.0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rango físico del sensor DHT22 es -40.0 a 80.0 °C");
                }
            }
            case "nivel_agua" -> {
                if (min < 0.0 || max > 100.0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Los umbrales normalizados de nivel deben estar entre 0% y 100%");
                }
            }
        }
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
        commandService.encolarComando("CONFIG_TECNICA_SENSOR", Map.of("modulo", modulo, "parametros", merged));
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

        auditService.registrar("Sensor pH Analógico", "Calibración Analógica", "Anterior", String.valueOf(body));
        commandService.encolarComando("CALIBRAR_PH", body);
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
        commandService.encolarComando("CALIBRAR_EC", body);
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
        commandService.encolarComando("CALIBRAR_CERO_NIVEL", body);
        return Map.of("mensaje", "Calibración de punto cero registrada.");
    }
}
