package com.axion.hidroponia.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "telemetria_lecturas")
public class TelemetriaLectura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime ts = OffsetDateTime.now();

    @Column(name = "dispositivo_id", nullable = false, length = 64)
    private String dispositivoId;

    private Double ph;

    @Column(name = "ec_us_cm")
    private Double ecUsCm;

    @Column(name = "tds_ppm")
    private Double tdsPpm;

    @Column(name = "temp_agua_c")
    private Double tempAguaC;

    @Column(name = "temp_amb_c")
    private Double tempAmbC;

    @Column(name = "hum_amb_pct")
    private Double humAmbPct;

    @Column(name = "nivel_pct")
    private Double nivelPct;

    @Column(name = "nivel_cm")
    private Double nivelCm;

    private Integer rssi;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "estado_sensores", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> estadoSensores;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public OffsetDateTime getTs() { return ts; }
    public void setTs(OffsetDateTime ts) { this.ts = ts; }
    public String getDispositivoId() { return dispositivoId; }
    public void setDispositivoId(String dispositivoId) { this.dispositivoId = dispositivoId; }
    public Double getPh() { return ph; }
    public void setPh(Double ph) { this.ph = ph; }
    public Double getEcUsCm() { return ecUsCm; }
    public void setEcUsCm(Double ecUsCm) { this.ecUsCm = ecUsCm; }
    public Double getTdsPpm() { return tdsPpm; }
    public void setTdsPpm(Double tdsPpm) { this.tdsPpm = tdsPpm; }
    public Double getTempAguaC() { return tempAguaC; }
    public void setTempAguaC(Double tempAguaC) { this.tempAguaC = tempAguaC; }
    public Double getTempAmbC() { return tempAmbC; }
    public void setTempAmbC(Double tempAmbC) { this.tempAmbC = tempAmbC; }
    public Double getHumAmbPct() { return humAmbPct; }
    public void setHumAmbPct(Double humAmbPct) { this.humAmbPct = humAmbPct; }
    public Double getNivelPct() { return nivelPct; }
    public void setNivelPct(Double nivelPct) { this.nivelPct = nivelPct; }
    public Double getNivelCm() { return nivelCm; }
    public void setNivelCm(Double nivelCm) { this.nivelCm = nivelCm; }
    public Integer getRssi() { return rssi; }
    public void setRssi(Integer rssi) { this.rssi = rssi; }
    public Map<String, Object> getEstadoSensores() { return estadoSensores; }
    public void setEstadoSensores(Map<String, Object> estadoSensores) { this.estadoSensores = estadoSensores; }
}
