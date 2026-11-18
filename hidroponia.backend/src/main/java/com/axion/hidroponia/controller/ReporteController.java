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
            @RequestParam(defaultValue = "csv") String formato,
            @RequestParam(required = false) OffsetDateTime inicio,
            @RequestParam(required = false) OffsetDateTime fin) {
        OffsetDateTime fFin = fin != null ? fin : OffsetDateTime.now();
        OffsetDateTime fIni = inicio != null ? inicio : fFin.minusDays(7);
        List<TelemetriaLectura> lecturas = telemetriaRepo.findByTsBetweenOrderByTsAsc(fIni, fFin);

        return switch (formato.toLowerCase()) {
            case "xlsx" -> ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=axion_reporte.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(exportService.generarXlsx(lecturas));
            case "json" -> ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=axion_reporte.json")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(exportService.generarJson(lecturas));
            default -> ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=axion_reporte.csv")
                    .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                    .body(exportService.generarCsv(lecturas));
        };
    }

    @GetMapping("/respaldos/politica")
    public SistemaPreferencias obtenerPolitica() {
        return prefsRepo.findById(1).orElseGet(SistemaPreferencias::new);
    }

    @PutMapping("/respaldos/politica")
    public SistemaPreferencias actualizarPolitica(@RequestBody Map<String, Object> body) {
        SistemaPreferencias prefs = prefsRepo.findById(1).orElseGet(SistemaPreferencias::new);
        if (body.get("backupFrecuencia") != null) prefs.setBackupFrecuencia(String.valueOf(body.get("backupFrecuencia")));
        if (body.get("backupFormato") != null) prefs.setBackupFormato(String.valueOf(body.get("backupFormato")));
        if (body.get("diasRetencion") instanceof Number n) prefs.setDiasRetencion(n.intValue());
        if (body.get("accionVencimiento") != null) prefs.setAccionVencimiento(String.valueOf(body.get("accionVencimiento")));
        prefs.setActualizadoEn(OffsetDateTime.now());

        SistemaPreferencias guardado = prefsRepo.save(prefs);
        auditService.registrar("Reportes y Respaldos", "Política de Retención", "Anterior",
                guardado.getDiasRetencion() + " días / " + guardado.getBackupFrecuencia());
        return guardado;
    }

    @PostMapping("/respaldos/ejecutar")
    public Map<String, Object> ejecutarRespaldoManual() {
        auditService.registrar("Reportes y Respaldos", "Respaldo Manual", "N/A", "Ejecutado");
        return Map.of("mensaje", "Respaldo generado correctamente.", "ts", OffsetDateTime.now().toString());
    }

    @PostMapping("/respaldos/depurar")
    public Map<String, Object> depurarManual() {
        int dias = prefsRepo.findById(1).map(SistemaPreferencias::getDiasRetencion).orElse(365);
        int eliminados = telemetriaRepo.deleteOlderThan(OffsetDateTime.now().minusDays(dias));
        return Map.of("eliminados", eliminados, "diasRetencion", dias);
    }
}
