package com.axion.hidroponia.service;

import com.axion.hidroponia.model.TelemetriaLectura;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class ReporteExportService {

    public byte[] generarXlsx(List<TelemetriaLectura> lecturas) {
        try (SXSSFWorkbook wb = new SXSSFWorkbook(100); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Telemetria");
            Row header = sheet.createRow(0);
            String[] cols = {
                "FechaHora", "Dispositivo", "pH", "EC (µS/cm)", "TDS (ppm)",
                "Temp Agua (°C)", "Temp Aire (°C)", "Humedad (%)", "Nivel (%)", "Nivel (cm)", "RSSI (dBm)"
            };
            for (int i = 0; i < cols.length; i++) {
                header.createCell(i).setCellValue(cols[i]);
            }
            int rowIdx = 1;
            for (TelemetriaLectura l : lecturas) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(String.valueOf(l.getTs()));
                row.createCell(1).setCellValue(l.getDispositivoId());
                setDouble(row, 2, l.getPh());
                setDouble(row, 3, l.getEcUsCm());
                setDouble(row, 4, l.getTdsPpm());
                setDouble(row, 5, l.getTempAguaC());
                setDouble(row, 6, l.getTempAmbC());
                setDouble(row, 7, l.getHumAmbPct());
                setDouble(row, 8, l.getNivelPct());
                setDouble(row, 9, l.getNivelCm());
                if (l.getRssi() != null) row.createCell(10).setCellValue(l.getRssi());
            }
            wb.write(out);
            wb.dispose();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo generar el archivo XLSX", e);
        }
    }

    public byte[] generarCsv(List<TelemetriaLectura> lecturas) {
        StringBuilder sb = new StringBuilder("\uFEFF");
        sb.append("FechaHora,Dispositivo,pH,EC_uS_cm,TDS_ppm,TempAgua_C,TempAire_C,Humedad_pct,Nivel_pct,Nivel_cm,RSSI_dBm\n");
        for (TelemetriaLectura l : lecturas) {
            sb.append(l.getTs() != null ? l.getTs() : "").append(',')
              .append(l.getDispositivoId() != null ? l.getDispositivoId() : "").append(',')
              .append(l.getPh() != null ? l.getPh() : "").append(',')
              .append(l.getEcUsCm() != null ? l.getEcUsCm() : "").append(',')
              .append(l.getTdsPpm() != null ? l.getTdsPpm() : "").append(',')
              .append(l.getTempAguaC() != null ? l.getTempAguaC() : "").append(',')
              .append(l.getTempAmbC() != null ? l.getTempAmbC() : "").append(',')
              .append(l.getHumAmbPct() != null ? l.getHumAmbPct() : "").append(',')
              .append(l.getNivelPct() != null ? l.getNivelPct() : "").append(',')
              .append(l.getNivelCm() != null ? l.getNivelCm() : "").append(',')
              .append(l.getRssi() != null ? l.getRssi() : "").append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void setDouble(Row row, int col, Double val) {
        if (val != null) row.createCell(col).setCellValue(val);
    }
}
