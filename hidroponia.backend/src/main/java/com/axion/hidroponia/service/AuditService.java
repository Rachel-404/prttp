package com.axion.hidroponia.service;

import com.axion.hidroponia.model.AuditoriaCambio;
import com.axion.hidroponia.repository.AuditoriaCambioRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

@Service
public class AuditService {

    private final AuditoriaCambioRepository auditoriaRepo;

    public AuditService(AuditoriaCambioRepository auditoriaRepo) {
        this.auditoriaRepo = auditoriaRepo;
    }

    public void registrar(String modulo, String parametro, String valorAnterior, String valorNuevo) {
        AuditoriaCambio entry = new AuditoriaCambio();
        entry.setFechaHora(OffsetDateTime.now());
        entry.setModulo(modulo);
        entry.setParametro(parametro);
        entry.setValorAnterior(valorAnterior != null ? valorAnterior : "Anterior");
        entry.setValorNuevo(valorNuevo);
        entry.setUsuario("Administrador Único");
        auditoriaRepo.save(entry);
    }
}
