package com.axion.hidroponia.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "comandos_pendientes")
public class ComandoPendiente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dispositivo_id", nullable = false, length = 64)
    private String dispositivoId = "ESP32_HIDRO_01";

    @Column(nullable = false, length = 64)
    private String comando;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parametros", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> parametros;

    @Column(nullable = false, length = 20)
    private String estado = "PENDIENTE";

    @Column(name = "creado_en", nullable = false)
    private OffsetDateTime creadoEn = OffsetDateTime.now();

    @Column(name = "entregado_en")
    private OffsetDateTime entregadoEn;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDispositivoId() { return dispositivoId; }
    public void setDispositivoId(String dispositivoId) { this.dispositivoId = dispositivoId; }
    public String getComando() { return comando; }
    public void setComando(String comando) { this.comando = comando; }
    public Map<String, Object> getParametros() { return parametros; }
    public void setParametros(Map<String, Object> parametros) { this.parametros = parametros; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public OffsetDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(OffsetDateTime creadoEn) { this.creadoEn = creadoEn; }
    public OffsetDateTime getEntregadoEn() { return entregadoEn; }
    public void setEntregadoEn(OffsetDateTime entregadoEn) { this.entregadoEn = entregadoEn; }
}
