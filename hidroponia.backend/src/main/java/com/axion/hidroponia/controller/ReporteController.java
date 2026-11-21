package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.SistemaPreferencias;
import com.axion.hidroponia.model.TelemetriaLectura;
import com.axion.hidroponia.repository.SistemaPreferenciasRepository;
import com.axion.hidroponia.repository.TelemetriaLecturaRepository;
import com.axion.hidroponia.service.AuditService;
import com.axion.hidroponia.service.ReporteExportService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class ReporteController {

    private final TelemetriaLecturaRepository telemetriaRepo;
    private final SistemaPreferenciasRepository prefsRepo;
    private final ReporteExportService exportService;
    private final AuditService auditService;

    public ReporteController(
            TelemetriaLecturaRepository telemetriaRepo,
            SistemaPreferenciasRepository prefsRepo,
            ReporteExportService exportService,
            AuditService auditService) {
        this.telemetriaRepo = telemetriaRepo;
        this.prefsRepo = prefsRepo;
        this.exportService = exportService;
        this.auditService = auditService;
    }

    @GetMapping("/reportes/historial")
    public Page<TelemetriaLectura> obtenerHistorial(
            @RequestParam(required = false) OffsetDateTime inicio,
            @RequestParam(required = false) OffsetDateTime fin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {
        OffsetDateTime fFin = fin != null ? fin : OffsetDateTime.now();
        OffsetDateTime fIni = inicio != null ? inicio : fFin.minusDays(7);
        return telemetriaRepo.findByTsBetweenOrderByTsDesc(fIni, fFin, PageRequest.of(page, size));
    }

    @GetMapping("/reportes/exportar")
    public ResponseEntity<byte[]> exportar(
            @RequestParam(required = false) OffsetDateTime inicio,
            @RequestParam(required = false) OffsetDateTime fin) {
        OffsetDateTime fFin = fin != null ? fin : OffsetDateTime.now();
        OffsetDateTime fIni = inicio != null ? inicio : fFin.minusDays(7);
        List<TelemetriaLectura> lecturas = telemetriaRepo.findByTsBetweenOrderByTsAsc(fIni, fFin);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=axion_reporte.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(exportService.generarXlsx(lecturas));
    }

    @GetMapping("/respaldos/politica")
    public SistemaPreferencias obtenerPolitica() {
        return prefsRepo.findById(1).orElseGet(SistemaPreferencias::new);
    }

    @PutMapping("/respaldos/politica")
    public SistemaPreferencias actualizarPolitica(@RequestBody SistemaPreferencias req) {
        SistemaPreferencias prefs = prefsRepo.findById(1).orElseGet(SistemaPreferencias::new);
        prefs.setId(1);
        if (req.getBackupFrecuencia() != null) prefs.setBackupFrecuencia(req.getBackupFrecuencia());
        if (req.getBackupFormato() != null) prefs.setBackupFormato(req.getBackupFormato());
        if (req.getDiasRetencion() != null) prefs.setDiasRetencion(req.getDiasRetencion());
        if (req.getAccionVencimiento() != null) prefs.setAccionVencimiento(req.getAccionVencimiento());
        if (req.getConfigRespaldos() != null) {
            java.util.Map<String, Object> merged = new java.util.HashMap<>(
                    prefs.getConfigRespaldos() != null ? prefs.getConfigRespaldos() : java.util.Map.of()
            );
            merged.putAll(req.getConfigRespaldos());
            prefs.setConfigRespaldos(merged);
        }
        prefs.setActualizadoEn(OffsetDateTime.now());
        SistemaPreferencias guardado = prefsRepo.save(prefs);

        auditService.registrar("Respaldos y Retención", "Política de Respaldo y Retención", "Anterior",
                guardado.getDiasRetencion() + " días (" + guardado.getBackupFrecuencia() + ")");
        return guardado;
    }

    @PostMapping("/respaldos/ejecutar")
    public Map<String, Object> ejecutarRespaldoManual(@RequestBody(required = false) Map<String, Object> body) {
        String canal = body != null && body.get("canal") != null ? String.valueOf(body.get("canal")) : "manual";
        String destino = body != null && body.get("destino") != null ? String.valueOf(body.get("destino")) : "";
        OffsetDateTime ahora = OffsetDateTime.now();

        if ("drive".equalsIgnoreCase(canal)) {
            SistemaPreferencias prefs = prefsRepo.findById(1).orElseGet(SistemaPreferencias::new);
            java.util.Map<String, Object> cfg = new java.util.HashMap<>(
                    prefs.getConfigRespaldos() != null ? prefs.getConfigRespaldos() : java.util.Map.of()
            );
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> driveMap = cfg.get("drive") instanceof java.util.Map<?, ?> m
                    ? new java.util.HashMap<>((java.util.Map<String, Object>) m)
                    : new java.util.HashMap<>();
            driveMap.put("ultimoRespaldo", ahora.toString());
            cfg.put("drive", driveMap);
            prefs.setConfigRespaldos(cfg);
            prefs.setActualizadoEn(ahora);
            prefsRepo.save(prefs);
        }

        String detalle = destino.isBlank() ? canal : canal + " -> " + destino;
        auditService.registrar("Respaldos y Retención", "Respaldo Manual", "N/A", detalle);
        return Map.of(
                "mensaje", "Respaldo manual ejecutado correctamente.",
                "canal", canal,
                "ejecutadoEn", ahora.toString()
        );
    }

    @PostMapping("/respaldos/depurar")
    public Map<String, Object> depurarAntiguos() {
        int dias = prefsRepo.findById(1).map(SistemaPreferencias::getDiasRetencion).orElse(365);
        int eliminados = telemetriaRepo.deleteOlderThan(OffsetDateTime.now().minusDays(dias));
        auditService.registrar("Respaldos y Retención", "Depuración Manual", "Anterior", eliminados + " lecturas depuradas");
        return Map.of("mensaje", "Depuración completada.", "eliminados", eliminados);
    }
}
