package com.axion.hidroponia.service;

import com.axion.hidroponia.model.Alerta;
import com.axion.hidroponia.model.SensorConfiguracion;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.AlertaRepository;
import com.axion.hidroponia.repository.SensorConfiguracionRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Map;

@Service
public class AlertEvaluationService {

    private final SensorConfiguracionRepository sensorRepo;
    private final AlertaRepository alertaRepo;

    public AlertEvaluationService(
            SensorConfiguracionRepository sensorRepo,
            AlertaRepository alertaRepo) {
        this.sensorRepo = sensorRepo;
        this.alertaRepo = alertaRepo;
    }

    public void evaluarYNotificar(TelemetriaLectura lectura) {
        Map<String, SensorConfiguracion> configs = sensorRepo.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(SensorConfiguracion::getModulo, s -> s));

        evaluarSensor(configs.get("ph"), lectura.getPh(), "pH RS485 fuera de umbral", "pH", "/sensores/ph");
        evaluarSensor(configs.get("ec"), lectura.getEcUsCm(), "Conductividad EC fuera de umbral", "µS/cm", "/sensores/ec");
        evaluarSensor(configs.get("temp_agua"), lectura.getTempAguaC(), "Temperatura del Agua fuera de umbral", "°C", "/sensores/nivel-temperatura?tab=temperatura");
        evaluarSensor(configs.get("nivel_agua"), lectura.getNivelPct(), "Nivel del Tanque fuera de umbral", "%", "/sensores/nivel-temperatura?tab=nivel");
        evaluarSensor(configs.get("dht22"), lectura.getTempAmbC(), "Temperatura Ambiental fuera de umbral", "°C", "/sensores/temperatura-humedad");
    }

    private void evaluarSensor(
            SensorConfiguracion cfg,
            Double valor,
            String tituloBase,
            String unidad,
            String urlDestino) {
        if (cfg == null || !cfg.isActivo() || valor == null || cfg.getMinNormal() == null || cfg.getMaxNormal() == null) {
            return;
        }
        double min = cfg.getMinNormal();
        double max = cfg.getMaxNormal();
        double margen = Math.max(0.0001, max - min) * 0.05;

        String nivel = null;
        if (valor < min || valor > max) {
            nivel = "critico";
        } else if (valor <= min + margen || valor >= max - margen) {
            nivel = "advertencia";
        }

        if (nivel == null) return;

        // Evitar duplicados no leídos consecutivos para el mismo módulo y nivel
        if (alertaRepo.existsByModuloAndNivelAndLeidaFalse(cfg.getModulo(), nivel)) {
            return;
        }

        Alerta alerta = new Alerta();
        alerta.setNivel(nivel);
        alerta.setModulo(cfg.getModulo());
        alerta.setTitulo(tituloBase);
        alerta.setDetalle(String.format("Lectura: %.2f %s (Rango: %.2f – %.2f %s)", valor, unidad, min, max, unidad));
        alerta.setUrlDestino(urlDestino);
        alerta.setLeida(false);
        alerta.setCreadaEn(OffsetDateTime.now());

        alertaRepo.save(alerta);
    }
}
