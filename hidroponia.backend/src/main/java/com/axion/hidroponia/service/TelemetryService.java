package com.axion.hidroponia.service;

import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.model.ReleCanal;
import com.axion.hidroponia.model.SensorConfiguracion;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.repository.ReleCanalRepository;
import com.axion.hidroponia.repository.SensorConfiguracionRepository;
import com.axion.hidroponia.repository.TelemetriaLecturaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TelemetryService {

    private final DispositivoRepository dispositivoRepo;
    private final SensorConfiguracionRepository sensorRepo;
    private final TelemetriaLecturaRepository telemetriaRepo;
    private final ReleCanalRepository releRepo;
    private final DeviceCommandService commandService;
    private final AlertEvaluationService alertEvaluationService;

    public TelemetryService(
            DispositivoRepository dispositivoRepo,
            SensorConfiguracionRepository sensorRepo,
            TelemetriaLecturaRepository telemetriaRepo,
            ReleCanalRepository releRepo,
            DeviceCommandService commandService,
            AlertEvaluationService alertEvaluationService) {
        this.dispositivoRepo = dispositivoRepo;
        this.sensorRepo = sensorRepo;
        this.telemetriaRepo = telemetriaRepo;
        this.releRepo = releRepo;
        this.commandService = commandService;
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

    private boolean sensorOperativo(Map<String, Object> estados, String clave) {
        if (estados == null || !estados.containsKey(clave) || estados.get(clave) == null) {
            return true;
        }
        return "ok".equalsIgnoreCase(String.valueOf(estados.get(clave)).trim());
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

        if (sensorOperativo(estado, "ph")) {
            lectura.setPh(toDouble(datos.get("nivel_ph")));
        }
        if (sensorOperativo(estado, "tds")) {
            lectura.setEcUsCm(toDouble(datos.get("ec_us_cm")));
            lectura.setTdsPpm(toDouble(datos.get("tds_ppm")));

            if (lectura.getEcUsCm() == null && lectura.getTdsPpm() != null) {
                double k = obtenerKValueEc();
                lectura.setEcUsCm(Math.round((lectura.getTdsPpm() / k) * 100.0) / 100.0);
            } else if (lectura.getTdsPpm() == null && lectura.getEcUsCm() != null) {
                lectura.setTdsPpm(Math.round(lectura.getEcUsCm() * obtenerKValueEc() * 100.0) / 100.0);
            }
        }
        if (sensorOperativo(estado, "pt100")) {
            lectura.setTempAguaC(toDouble(datos.get("temperatura_solucion")));
        }
        if (sensorOperativo(estado, "dht22")) {
            lectura.setTempAmbC(toDouble(datos.get("temperatura_amb")));
            lectura.setHumAmbPct(toDouble(datos.get("humedad_amb")));
        }
        if (sensorOperativo(estado, "nivel")) {
            lectura.setNivelCm(toDouble(datos.get("nivel_tanque_cm")));
            lectura.setNivelPct(toDouble(datos.get("nivel_tanque_pct")));
        }

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
        sincronizarConfigNodoDesdeTrama(disp, extraerMapaSeguro(trama.get("nodo")));
        disp.setUltimoHeartbeat(ahora);
        disp.setActualizadoEn(ahora);
        dispositivoRepo.save(disp);

        alertEvaluationService.evaluarYNotificar(guardada);
        evaluarModoAutomaticoReles(dispositivoId, guardada);
        return guardada;
    }

    private void sincronizarConfigNodoDesdeTrama(Dispositivo disp, Map<String, Object> nodo) {
        if (nodo.isEmpty()) return;

        Map<String, Object> red = new HashMap<>(disp.getConfigRed() != null ? disp.getConfigRed() : Map.of());
        for (String clave : List.of("ssid", "asignacionIp", "ipLocal", "mascara", "gateway", "dns", "serverUrl")) {
            Object val = nodo.get(clave);
            if (val != null) {
                String txt = String.valueOf(val).trim();
                if (!txt.isEmpty() && !"null".equalsIgnoreCase(txt)) {
                    red.put(clave, txt);
                }
            }
        }
        red.remove("brokerUrl");
        red.remove("endpoint");
        red.remove("habilitarTls");
        red.put("usuario", disp.getId());
        disp.setConfigRed(red);

        Double envioSeg = toDouble(nodo.get("envioSeg"));
        if (envioSeg != null && envioSeg >= 15 && envioSeg <= 3600) {
            int seg = (int) Math.round(envioSeg);
            Map<String, Object> buf = new HashMap<>(disp.getConfigBuffer() != null ? disp.getConfigBuffer() : Map.of());
            buf.put("muestreoSeg", seg);
            buf.put("envioSeg", seg);
            disp.setConfigBuffer(buf);
        }
    }

    public void recalcularModoAutomaticoReles(String dispositivoId) {
        String id = (dispositivoId != null && !dispositivoId.isBlank()) ? dispositivoId.trim() : "ESP32_HIDRO_01";
        Dispositivo disp = dispositivoRepo.findById(id).orElse(null);
        if (disp == null || !disp.isConectado()) {
            return;
        }
        telemetriaRepo.findTopByDispositivoIdOrderByTsDesc(id)
                .ifPresent(ultima -> evaluarModoAutomaticoReles(id, ultima));
    }

    private record ContextoVariable(Double valor, Double min, Double max, boolean disponible) {}

    private void evaluarModoAutomaticoReles(String dispositivoId, TelemetriaLectura lectura) {
        if (lectura == null) {
            return;
        }
        List<ReleCanal> reles = releRepo.findAllByOrderByCanalAsc();
        if (reles.isEmpty() || !"automatico".equalsIgnoreCase(reles.get(0).getModoOperacion())) {
            return;
        }

        Map<String, SensorConfiguracion> configs = sensorRepo.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(SensorConfiguracion::getModulo, s -> s));

        OffsetDateTime ahora = OffsetDateTime.now();
        for (ReleCanal r : reles) {
            Map<String, Object> regla = r.getReglaAuto();
            if (regla == null || regla.isEmpty()) {
                continue;
            }
            String variable = String.valueOf(regla.getOrDefault("variable", "ninguna")).trim();
            if (variable.isEmpty() || "ninguna".equalsIgnoreCase(variable)) {
                continue;
            }

            ContextoVariable ctx = obtenerContextoVariable(variable, lectura, configs);
            if (!ctx.disponible() || ctx.valor() == null) {
                continue;
            }

            String encenderCuando = String.valueOf(regla.getOrDefault("encenderCuando", "menor_min")).trim();
            String apagarCuando = String.valueOf(regla.getOrDefault("apagarCuando", "en_rango")).trim();
            Double umbralEnc = toDouble(regla.get("umbralEncendido"));
            Double umbralApa = toDouble(regla.get("umbralApagado"));

            Boolean cumpleEnc = evaluarCondicionEncendido(encenderCuando, ctx, umbralEnc);
            if (cumpleEnc == null) {
                continue;
            }
            Boolean cumpleApa = evaluarCondicionApagado(apagarCuando, ctx, umbralApa, cumpleEnc);
            if (cumpleApa == null) {
                continue;
            }

            boolean deseado = r.isEncendido();
            if (!r.isEncendido() && cumpleEnc) {
                deseado = true;
            } else if (r.isEncendido() && cumpleApa && !cumpleEnc) {
                deseado = false;
            }

            if (r.isEncendido() != deseado) {
                r.setEncendido(deseado);
                r.setActualizadoEn(ahora);
                releRepo.save(r);
                commandService.encolarComando(dispositivoId, "SET_RELE", Map.of("canal", r.getCanal(), "encendido", deseado));
            }
        }
    }

    private ContextoVariable obtenerContextoVariable(
            String variable,
            TelemetriaLectura lectura,
            Map<String, SensorConfiguracion> configs) {
        Map<String, Object> est = lectura.getEstadoSensores();
        return switch (variable) {
            case "ph" -> {
                SensorConfiguracion c = configs.get("ph");
                boolean ok = c != null && c.isActivo() && sensorOperativo(est, "ph") && lectura.getPh() != null;
                yield new ContextoVariable(lectura.getPh(), c != null ? c.getMinNormal() : null, c != null ? c.getMaxNormal() : null, ok);
            }
            case "ec" -> {
                SensorConfiguracion c = configs.get("ec");
                boolean ok = c != null && c.isActivo() && sensorOperativo(est, "tds") && lectura.getEcUsCm() != null;
                yield new ContextoVariable(lectura.getEcUsCm(), c != null ? c.getMinNormal() : null, c != null ? c.getMaxNormal() : null, ok);
            }
            case "tds" -> {
                SensorConfiguracion c = configs.get("ec");
                boolean ok = c != null && c.isActivo() && sensorOperativo(est, "tds") && lectura.getTdsPpm() != null;
                Map<String, Object> p = c != null && c.getParametrosTecnicos() != null ? c.getParametrosTecnicos() : Map.of();
                Double minTds = toDouble(p.get("tdsMin"));
                Double maxTds = toDouble(p.get("tdsMax"));
                if (minTds == null && c != null && c.getMinNormal() != null) minTds = c.getMinNormal() * 0.5;
                if (maxTds == null && c != null && c.getMaxNormal() != null) maxTds = c.getMaxNormal() * 0.5;
                yield new ContextoVariable(lectura.getTdsPpm(), minTds, maxTds, ok);
            }
            case "temp_agua" -> {
                SensorConfiguracion c = configs.get("temp_agua");
                boolean ok = c != null && c.isActivo() && sensorOperativo(est, "pt100") && lectura.getTempAguaC() != null;
                yield new ContextoVariable(lectura.getTempAguaC(), c != null ? c.getMinNormal() : null, c != null ? c.getMaxNormal() : null, ok);
            }
            case "temp_aire" -> {
                SensorConfiguracion c = configs.get("dht22");
                boolean ok = c != null && c.isActivo() && sensorOperativo(est, "dht22") && lectura.getTempAmbC() != null;
                Map<String, Object> p = c != null && c.getParametrosTecnicos() != null ? c.getParametrosTecnicos() : Map.of();
                Double minT = toDouble(p.get("tempMin")) != null ? toDouble(p.get("tempMin")) : (c != null ? c.getMinNormal() : null);
                Double maxT = toDouble(p.get("tempMax")) != null ? toDouble(p.get("tempMax")) : (c != null ? c.getMaxNormal() : null);
                yield new ContextoVariable(lectura.getTempAmbC(), minT, maxT, ok);
            }
            case "humedad_aire" -> {
                SensorConfiguracion c = configs.get("dht22");
                boolean ok = c != null && c.isActivo() && sensorOperativo(est, "dht22") && lectura.getHumAmbPct() != null;
                Map<String, Object> p = c != null && c.getParametrosTecnicos() != null ? c.getParametrosTecnicos() : Map.of();
                yield new ContextoVariable(lectura.getHumAmbPct(), toDouble(p.get("humMin")), toDouble(p.get("humMax")), ok);
            }
            case "nivel_agua" -> {
                SensorConfiguracion c = configs.get("nivel_agua");
                boolean ok = c != null && c.isActivo() && sensorOperativo(est, "nivel") && lectura.getNivelPct() != null;
                yield new ContextoVariable(lectura.getNivelPct(), c != null ? c.getMinNormal() : null, c != null ? c.getMaxNormal() : null, ok);
            }
            default -> new ContextoVariable(null, null, null, false);
        };
    }

    private Boolean evaluarCondicionEncendido(String cond, ContextoVariable ctx, Double umbral) {
        double v = ctx.valor();
        return switch (cond) {
            case "menor_min" -> ctx.min() != null ? (v < ctx.min()) : null;
            case "mayor_max" -> ctx.max() != null ? (v > ctx.max()) : null;
            case "fuera_rango" -> (ctx.min() != null && ctx.max() != null) ? (v < ctx.min() || v > ctx.max()) : null;
            case "dentro_rango" -> (ctx.min() != null && ctx.max() != null) ? (v >= ctx.min() && v <= ctx.max()) : null;
            case "menor_valor" -> umbral != null ? (v < umbral) : null;
            case "mayor_valor" -> umbral != null ? (v > umbral) : null;
            default -> null;
        };
    }

    private Boolean evaluarCondicionApagado(String cond, ContextoVariable ctx, Double umbral, boolean cumpleEncendido) {
        double v = ctx.valor();
        return switch (cond) {
            case "en_rango" -> (ctx.min() != null && ctx.max() != null) ? (v >= ctx.min() && v <= ctx.max()) : null;
            case "inverso_encendido" -> !cumpleEncendido;
            case "mayor_igual_max" -> ctx.max() != null ? (v >= ctx.max()) : null;
            case "menor_igual_min" -> ctx.min() != null ? (v <= ctx.min()) : null;
            case "mayor_igual_valor" -> umbral != null ? (v >= umbral) : null;
            case "menor_igual_valor" -> umbral != null ? (v <= umbral) : null;
            default -> null;
        };
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
