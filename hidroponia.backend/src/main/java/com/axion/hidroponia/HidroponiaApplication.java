package com.axion.hidroponia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HidroponiaApplication {

    public static void main(String[] args) {
        SpringApplication.run(HidroponiaApplication.class, args);
    }
}
