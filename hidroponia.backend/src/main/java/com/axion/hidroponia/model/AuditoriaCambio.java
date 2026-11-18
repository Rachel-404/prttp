package com.axion.hidroponia.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "auditoria_cambios")
public class AuditoriaCambio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fecha_hora", nullable = false)
    private OffsetDateTime fechaHora = OffsetDateTime.now();

    @Column(nullable = false, length = 80)
    private String modulo;

    @Column(nullable = false, length = 120)
    private String parametro;

    @Column(name = "valor_anterior", length = 200)
    private String valorAnterior;

    @Column(name = "valor_nuevo", length = 200)
    private String valorNuevo;

    @Column(nullable = false, length = 80)
    private String usuario = "Administrador Único";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public OffsetDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(OffsetDateTime fechaHora) { this.fechaHora = fechaHora; }
    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }
    public String getParametro() { return parametro; }
    public void setParametro(String parametro) { this.parametro = parametro; }
    public String getValorAnterior() { return valorAnterior; }
    public void setValorAnterior(String valorAnterior) { this.valorAnterior = valorAnterior; }
    public String getValorNuevo() { return valorNuevo; }
    public void setValorNuevo(String valorNuevo) { this.valorNuevo = valorNuevo; }
    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }
}
