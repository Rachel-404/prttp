package com.axion.hidroponia.service;

import com.axion.hidroponia.model.ComandoPendiente;
import com.axion.hidroponia.repository.ComandoPendienteRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
public class DeviceCommandService {

    private static final String DEFAULT_DEVICE_ID = "ESP32_HIDRO_01";

    private final ComandoPendienteRepository comandoRepo;
    private final ObjectMapper objectMapper;

    public DeviceCommandService(
            ComandoPendienteRepository comandoRepo,
            ObjectMapper objectMapper) {
        this.comandoRepo = comandoRepo;
        this.objectMapper = objectMapper;
    }

    public ComandoPendiente encolarComando(String tipoComando, Map<String, Object> parametros) {
        return encolarComando(DEFAULT_DEVICE_ID, tipoComando, parametros);
    }

    public ComandoPendiente encolarComando(String dispositivoId, String tipoComando, Map<String, Object> parametros) {
        String idDestino = (dispositivoId != null && !dispositivoId.isBlank()) ? dispositivoId : DEFAULT_DEVICE_ID;
        Map<String, Object> paramsNormalizados = objectMapper.convertValue(
                parametros != null ? parametros : Map.of(),
                new TypeReference<Map<String, Object>>() {}
        );

        ComandoPendiente cmd = new ComandoPendiente();
        cmd.setDispositivoId(idDestino);
        cmd.setComando(tipoComando);
        cmd.setParametros(paramsNormalizados);
        cmd.setEstado("PENDIENTE");
        cmd.setCreadoEn(OffsetDateTime.now());
        return comandoRepo.save(cmd);
    }

    public List<ComandoPendiente> obtenerYEntregarPendientes(String dispositivoId) {
        String idDestino = (dispositivoId != null && !dispositivoId.isBlank()) ? dispositivoId : DEFAULT_DEVICE_ID;
        List<ComandoPendiente> pendientes = comandoRepo.findByDispositivoIdAndEstadoOrderByCreadoEnAsc(idDestino, "PENDIENTE");
        if (!pendientes.isEmpty()) {
            OffsetDateTime ahora = OffsetDateTime.now();
            pendientes.forEach(c -> {
                c.setEstado("ENTREGADO");
                c.setEntregadoEn(ahora);
            });
            comandoRepo.saveAll(pendientes);
        }
        return pendientes;
    }

    public boolean confirmarEjecucion(Long comandoId) {
        return comandoRepo.findById(comandoId).map(cmd -> {
            cmd.setEstado("EJECUTADO");
            if (cmd.getEntregadoEn() == null) {
                cmd.setEntregadoEn(OffsetDateTime.now());
            }
            comandoRepo.save(cmd);
            return true;
        }).orElse(false);
    }
}
