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

        Map<String, Object> estados = lectura.getEstadoSensores();
        if (sensorOperativo(estados, "ph")) {
            evaluarSensor(configs.get("ph"), lectura.getPh(), "pH fuera de umbral", "pH", "/sensores/ph");
        }
        if (sensorOperativo(estados, "tds")) {
            evaluarSensor(configs.get("ec"), lectura.getEcUsCm(), "Conductividad EC fuera de umbral", "µS/cm", "/sensores/ec");
        }
        if (sensorOperativo(estados, "pt100")) {
            evaluarSensor(configs.get("temp_agua"), lectura.getTempAguaC(), "Temperatura del Agua fuera de umbral", "°C", "/sensores/nivel-temperatura?tab=temperatura");
        }
        if (sensorOperativo(estados, "nivel")) {
            evaluarSensor(configs.get("nivel_agua"), lectura.getNivelPct(), "Nivel del Tanque fuera de umbral", "%", "/sensores/nivel-temperatura?tab=nivel");
        }
        if (sensorOperativo(estados, "dht22")) {
            SensorConfiguracion dhtCfg = configs.get("dht22");
            if (dhtCfg != null && dhtCfg.isActivo() && lectura.getTempAmbC() != null
                    && dhtCfg.getMinNormal() != null && dhtCfg.getMaxNormal() != null) {
                evaluarRango("dht22_temp", lectura.getTempAmbC(), dhtCfg.getMinNormal(), dhtCfg.getMaxNormal(),
                        "Temperatura Ambiental fuera de umbral", "°C", "/sensores/temperatura-humedad");
            }
            evaluarHumedadDht22(dhtCfg, lectura.getHumAmbPct());
        }
    }

    private boolean sensorOperativo(Map<String, Object> estados, String clave) {
        if (estados == null || !estados.containsKey(clave) || estados.get(clave) == null) {
            return true;
        }
        return "ok".equalsIgnoreCase(String.valueOf(estados.get(clave)).trim());
    }

    private void evaluarHumedadDht22(SensorConfiguracion cfg, Double hum) {
        if (cfg == null || !cfg.isActivo() || hum == null || cfg.getParametrosTecnicos() == null) {
            return;
        }
        Double humMin = toDouble(cfg.getParametrosTecnicos().get("humMin"));
        Double humMax = toDouble(cfg.getParametrosTecnicos().get("humMax"));
        if (humMin == null || humMax == null || humMin >= humMax) {
            return;
        }
        evaluarRango("dht22_hum", hum, humMin, humMax, "Humedad Ambiental fuera de umbral", "%", "/sensores/temperatura-humedad");
    }

    private Double toDouble(Object obj) {
        return obj instanceof Number n ? n.doubleValue() : null;
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
        evaluarRango(cfg.getModulo(), valor, cfg.getMinNormal(), cfg.getMaxNormal(), tituloBase, unidad, urlDestino);
    }

    private void evaluarRango(
            String modulo,
            double valor,
            double min,
            double max,
            String tituloBase,
            String unidad,
            String urlDestino) {
        double margen = Math.max(0.0001, max - min) * 0.05;

        String nivel = null;
        if (valor < min || valor > max) {
            nivel = "critico";
        } else if (valor <= min + margen || valor >= max - margen) {
            nivel = "advertencia";
        }

        if (nivel == null) return;

        // Evitar duplicados no leídos consecutivos para el mismo módulo y nivel
        if (alertaRepo.existsByModuloAndNivelAndLeidaFalse(modulo, nivel)) {
            return;
        }

        Alerta alerta = new Alerta();
        alerta.setNivel(nivel);
        alerta.setModulo(modulo);
        alerta.setTitulo(tituloBase);
        alerta.setDetalle(String.format("Lectura: %.2f %s · Rango: %.2f – %.2f %s", valor, unidad, min, max, unidad));
        alerta.setUrlDestino(urlDestino);
        alerta.setLeida(false);
        alerta.setCreadaEn(OffsetDateTime.now());

        alertaRepo.save(alerta);
    }
}
