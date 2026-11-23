package com.axion.hidroponia.service;

import com.axion.hidroponia.model.ComandoPendiente;
import com.axion.hidroponia.repository.ComandoPendienteRepository;
import com.axion.hidroponia.repository.DispositivoRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DeviceCommandService {

    private static final String DEFAULT_DEVICE_ID = "ESP32_HIDRO_01";

    private final ComandoPendienteRepository comandoRepo;
    private final DispositivoRepository dispositivoRepo;
    private final ObjectMapper objectMapper;
    private final Map<String, Map<String, Object>> ultimasRedesWifi = new ConcurrentHashMap<>();

    public DeviceCommandService(
            ComandoPendienteRepository comandoRepo,
            DispositivoRepository dispositivoRepo,
            ObjectMapper objectMapper) {
        this.comandoRepo = comandoRepo;
        this.dispositivoRepo = dispositivoRepo;
        this.objectMapper = objectMapper;
    }

    private void validarDispositivo(String idDestino) {
        if (!dispositivoRepo.existsById(idDestino)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispositivo no encontrado: " + idDestino);
        }
    }

    @Transactional
    public ComandoPendiente encolarComando(String tipoComando, Map<String, Object> parametros) {
        return encolarComando(DEFAULT_DEVICE_ID, tipoComando, parametros);
    }

    @Transactional
    public ComandoPendiente encolarComando(String dispositivoId, String tipoComando, Map<String, Object> parametros) {
        String idDestino = (dispositivoId != null && !dispositivoId.isBlank()) ? dispositivoId.trim() : DEFAULT_DEVICE_ID;
        validarDispositivo(idDestino);
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

    @Transactional
    public List<ComandoPendiente> obtenerYEntregarPendientes(String dispositivoId) {
        String idDestino = (dispositivoId != null && !dispositivoId.isBlank()) ? dispositivoId.trim() : DEFAULT_DEVICE_ID;
        validarDispositivo(idDestino);
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

    @Transactional
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

    public void registrarRedesWifi(String dispositivoId, List<Map<String, Object>> redes) {
        String idDestino = (dispositivoId != null && !dispositivoId.isBlank()) ? dispositivoId.trim() : DEFAULT_DEVICE_ID;
        validarDispositivo(idDestino);
        List<Map<String, Object>> listaLimpia = redes != null ? redes : List.of();
        Map<String, Object> registro = new LinkedHashMap<>();
        registro.put("dispositivoId", idDestino);
        registro.put("actualizadoEn", OffsetDateTime.now().toString());
        registro.put("redes", listaLimpia);
        ultimasRedesWifi.put(idDestino, registro);
    }

    public Map<String, Object> obtenerRedesWifi(String dispositivoId) {
        String idDestino = (dispositivoId != null && !dispositivoId.isBlank()) ? dispositivoId : DEFAULT_DEVICE_ID;
        return ultimasRedesWifi.getOrDefault(idDestino, Map.of(
                "dispositivoId", idDestino,
                "actualizadoEn", "",
                "redes", List.of()
        ));
    }
}
