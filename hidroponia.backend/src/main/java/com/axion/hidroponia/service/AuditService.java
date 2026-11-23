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
        entry.setModulo(truncar(modulo != null ? modulo : "Sistema", 80));
        entry.setParametro(truncar(parametro != null ? parametro : "Cambio", 120));
        entry.setValorAnterior(truncar(valorAnterior != null ? valorAnterior : "Anterior", 200));
        entry.setValorNuevo(truncar(valorNuevo != null ? valorNuevo : "", 200));
        entry.setUsuario(truncar("Administrador Único", 80));
        auditoriaRepo.save(entry);
    }

    private String truncar(String valor, int maxLen) {
        if (valor == null) return null;
        return valor.length() > maxLen ? valor.substring(0, maxLen) : valor;
    }
}
