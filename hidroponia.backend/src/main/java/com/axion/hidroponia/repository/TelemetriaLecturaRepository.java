package com.axion.hidroponia.repository;

import com.axion.hidroponia.model.TelemetriaLectura;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface TelemetriaLecturaRepository extends JpaRepository<TelemetriaLectura, Long> {

    Optional<TelemetriaLectura> findTopByDispositivoIdOrderByTsDesc(String dispositivoId);

    List<TelemetriaLectura> findByTsBetweenOrderByTsAsc(OffsetDateTime inicio, OffsetDateTime fin);

    Page<TelemetriaLectura> findByTsBetweenOrderByTsDesc(OffsetDateTime inicio, OffsetDateTime fin, Pageable pageable);

    @Modifying
    @Transactional
    @Query("DELETE FROM TelemetriaLectura t WHERE t.ts < :fechaLimite")
    int deleteOlderThan(@Param("fechaLimite") OffsetDateTime fechaLimite);
}
