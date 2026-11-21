package com.axion.hidroponia.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "sistema_preferencias")
public class SistemaPreferencias {

    @Id
    private Integer id = 1;

    @Column(nullable = false, length = 20)
    private String tema = "oscuro";

    @Column(name = "title_px", nullable = false)
    private Integer titlePx = 24;

    @Column(name = "subtitle_px", nullable = false)
    private Integer subtitlePx = 18;

    @Column(name = "base_px", nullable = false)
    private Integer basePx = 14;

    @Column(name = "backup_frecuencia", nullable = false, length = 20)
    private String backupFrecuencia = "diario";

    @Column(name = "backup_formato", nullable = false, length = 20)
    private String backupFormato = "zip";

    @Column(name = "dias_retencion", nullable = false)
    private Integer diasRetencion = 365;

    @Column(name = "accion_vencimiento", nullable = false, length = 20)
    private String accionVencimiento = "archivar";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_respaldos", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> configRespaldos = new HashMap<>();

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn = OffsetDateTime.now();

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTema() { return tema; }
    public void setTema(String tema) { this.tema = tema; }
    public Integer getTitlePx() { return titlePx; }
    public void setTitlePx(Integer titlePx) { this.titlePx = titlePx; }
    public Integer getSubtitlePx() { return subtitlePx; }
    public void setSubtitlePx(Integer subtitlePx) { this.subtitlePx = subtitlePx; }
    public Integer getBasePx() { return basePx; }
    public void setBasePx(Integer basePx) { this.basePx = basePx; }
    public String getBackupFrecuencia() { return backupFrecuencia; }
    public void setBackupFrecuencia(String backupFrecuencia) { this.backupFrecuencia = backupFrecuencia; }
    public String getBackupFormato() { return backupFormato; }
    public void setBackupFormato(String backupFormato) { this.backupFormato = backupFormato; }
    public Integer getDiasRetencion() { return diasRetencion; }
    public void setDiasRetencion(Integer diasRetencion) { this.diasRetencion = diasRetencion; }
    public String getAccionVencimiento() { return accionVencimiento; }
    public void setAccionVencimiento(String accionVencimiento) { this.accionVencimiento = accionVencimiento; }
    public Map<String, Object> getConfigRespaldos() { return configRespaldos; }
    public void setConfigRespaldos(Map<String, Object> configRespaldos) { this.configRespaldos = configRespaldos; }
    public OffsetDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(OffsetDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
