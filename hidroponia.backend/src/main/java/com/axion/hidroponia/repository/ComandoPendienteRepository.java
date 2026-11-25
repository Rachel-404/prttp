package com.axion.hidroponia.repository;

import com.axion.hidroponia.model.ComandoPendiente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

public interface ComandoPendienteRepository extends JpaRepository<ComandoPendiente, Long> {
    List<ComandoPendiente> findByDispositivoIdAndEstadoOrderByCreadoEnAsc(String dispositivoId, String estado);
    List<ComandoPendiente> findByDispositivoIdAndEstadoInAndCreadoEnAfterOrderByCreadoEnAsc(
            String dispositivoId,
            Collection<String> estados,
            OffsetDateTime creadoDespuesDe
    );
}
