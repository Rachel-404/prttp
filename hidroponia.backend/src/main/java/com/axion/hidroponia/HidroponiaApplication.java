package com.axion.hidroponia;

import com.axion.hidroponia.config.DatabaseBootstrapListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HidroponiaApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(HidroponiaApplication.class);
        app.addListeners(new DatabaseBootstrapListener());
        app.run(args);
    }
}
