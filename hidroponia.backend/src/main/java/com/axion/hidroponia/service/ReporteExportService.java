package com.axion.hidroponia.service;

import com.axion.hidroponia.model.TelemetriaLectura;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;

@Service
public class ReporteExportService {

    public byte[] generarXlsx(List<TelemetriaLectura> lecturas) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
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
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo generar el archivo XLSX", e);
        }
    }

    private void setDouble(Row row, int col, Double val) {
        if (val != null) row.createCell(col).setCellValue(val);
    }
}
