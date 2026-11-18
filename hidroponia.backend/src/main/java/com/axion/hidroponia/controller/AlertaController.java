package com.axion.hidroponia.controller;

import com.axion.hidroponia.model.Alerta;
import com.axion.hidroponia.repository.AlertaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/alertas")
public class AlertaController {

    private final AlertaRepository alertaRepo;

    public AlertaController(AlertaRepository alertaRepo) {
        this.alertaRepo = alertaRepo;
    }

    @GetMapping
    public List<Alerta> listarAlertas() {
        return alertaRepo.findTop20ByOrderByCreadaEnDesc();
    }

    @PatchMapping("/{id}/leer")
    public Alerta marcarComoLeida(@PathVariable Long id) {
        Alerta alerta = alertaRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alerta no encontrada"));
        alerta.setLeida(true);
        return alertaRepo.save(alerta);
    }

    @PatchMapping("/leer-todas")
    public Map<String, Object> marcarTodasLeidas() {
        List<Alerta> todas = alertaRepo.findAll();
        todas.forEach(a -> a.setLeida(true));
        alertaRepo.saveAll(todas);
        return Map.of("mensaje", "Todas las alertas marcadas como leídas.");
    }
}
