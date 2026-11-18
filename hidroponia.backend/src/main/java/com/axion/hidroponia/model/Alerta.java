package com.axion.hidroponia.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "alertas")
public class Alerta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String nivel;

    @Column(nullable = false, length = 64)
    private String modulo;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(nullable = false, length = 320)
    private String detalle;

    @Column(name = "url_destino", length = 160)
    private String urlDestino = "/";

    @Column(nullable = false)
    private boolean leida = false;

    @Column(name = "creada_en", nullable = false)
    private OffsetDateTime creadaEn = OffsetDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNivel() { return nivel; }
    public void setNivel(String nivel) { this.nivel = nivel; }
    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDetalle() { return detalle; }
    public void setDetalle(String detalle) { this.detalle = detalle; }
    public String getUrlDestino() { return urlDestino; }
    public void setUrlDestino(String urlDestino) { this.urlDestino = urlDestino; }
    public boolean isLeida() { return leida; }
    public void setLeida(boolean leida) { this.leida = leida; }
    public OffsetDateTime getCreadaEn() { return creadaEn; }
    public void setCreadaEn(OffsetDateTime creadaEn) { this.creadaEn = creadaEn; }
}
