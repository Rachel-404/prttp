package com.axion.hidroponia.repository;

import com.axion.hidroponia.model.AuditoriaCambio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditoriaCambioRepository extends JpaRepository<AuditoriaCambio, Long> {
    Page<AuditoriaCambio> findAllByOrderByFechaHoraDesc(Pageable pageable);
    Page<AuditoriaCambio> findByModuloOrderByFechaHoraDesc(String modulo, Pageable pageable);
}
