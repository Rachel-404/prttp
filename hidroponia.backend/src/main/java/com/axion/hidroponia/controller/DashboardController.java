package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.Dispositivo;
import com.axion.hidroponia.model.ReleCanal;
import com.axion.hidroponia.model.SensorConfiguracion;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.axion.hidroponia.repository.ReleCanalRepository;
import com.axion.hidroponia.repository.SensorConfiguracionRepository;
import com.axion.hidroponia.repository.TelemetriaLecturaRepository;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DispositivoRepository dispositivoRepo;
    private final SensorConfiguracionRepository sensorRepo;
    private final TelemetriaLecturaRepository telemetriaRepo;
    private final ReleCanalRepository releRepo;

    public DashboardController(
            DispositivoRepository dispositivoRepo,
            SensorConfiguracionRepository sensorRepo,
            TelemetriaLecturaRepository telemetriaRepo,
            ReleCanalRepository releRepo) {
        this.dispositivoRepo = dispositivoRepo;
        this.sensorRepo = sensorRepo;
        this.telemetriaRepo = telemetriaRepo;
        this.releRepo = releRepo;
    }

    @GetMapping("/resumen")
    public Map<String, Object> obtenerResumen(@RequestParam(defaultValue = "ESP32_HIDRO_01") String dispositivoId) {
        Dispositivo disp = dispositivoRepo.findById(dispositivoId).orElse(null);
        TelemetriaLectura ultima = telemetriaRepo.findTopByDispositivoIdOrderByTsDesc(dispositivoId).orElse(null);
        List<SensorConfiguracion> sensores = sensorRepo.findAll();
        List<ReleCanal> reles = releRepo.findAllByOrderByCanalAsc();

        Map<String, Object> dispositivoResumen = null;
        if (disp != null) {
            dispositivoResumen = new LinkedHashMap<>();
            dispositivoResumen.put("id", disp.getId());
            dispositivoResumen.put("nombre", disp.getNombre());
            dispositivoResumen.put("firmware", disp.getFirmware());
            dispositivoResumen.put("conectado", disp.isConectado());
            dispositivoResumen.put("rssi", disp.getRssi());
            dispositivoResumen.put("alimentacion", disp.getAlimentacion());
            dispositivoResumen.put("consumoMa", disp.getConsumoMa());
            dispositivoResumen.put("psramOcupadaPct", disp.getPsramOcupadaPct());
            dispositivoResumen.put("bufferTramas", disp.getBufferTramas());
            dispositivoResumen.put("ultimoHeartbeat", disp.getUltimoHeartbeat());
            dispositivoResumen.put("configBuffer", disp.getConfigBuffer());
            dispositivoResumen.put("actualizadoEn", disp.getActualizadoEn());
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("dispositivo", dispositivoResumen);
        resp.put("ultimaLectura", ultima);
        resp.put("sensores", sensores);
        resp.put("reles", reles);
        return resp;
    }

    @GetMapping("/tendencias")
    public Map<String, Object> obtenerTendencias(
            @RequestParam(defaultValue = "ph") String variable,
            @RequestParam(required = false) OffsetDateTime inicio,
            @RequestParam(required = false) OffsetDateTime fin) {

        OffsetDateTime fechaFin = fin != null ? fin : OffsetDateTime.now();
        OffsetDateTime fechaInicio = inicio != null ? inicio : fechaFin.minusHours(24);

        List<TelemetriaLectura> lecturas = telemetriaRepo.findByTsBetweenOrderByTsAsc(fechaInicio, fechaFin);
        List<Map<String, Object>> serie = new ArrayList<>();

        for (TelemetriaLectura l : lecturas) {
            Double valor = switch (variable) {
                case "ec" -> l.getEcUsCm();
                case "temp_agua" -> l.getTempAguaC();
                case "temp_ambiente" -> l.getTempAmbC();
                case "humedad_ambiente" -> l.getHumAmbPct();
                case "nivel_agua" -> l.getNivelPct();
                default -> l.getPh();
            };
            if (valor != null) {
                serie.add(Map.of("ts", l.getTs().toString(), "valor", valor));
            }
        }

        return Map.of(
                "variable", variable,
                "inicio", fechaInicio.toString(),
                "fin", fechaFin.toString(),
                "puntos", serie
        );
    }
}
