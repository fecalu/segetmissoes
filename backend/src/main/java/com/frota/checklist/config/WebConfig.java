package com.frota.checklist.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.util.Arrays;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.base-dir}")
    private String uploadBaseDir;
    @Value("${app.cors.allowed-origins}")
    private String corsAllowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toArray(String[]::new);

        if (origins.length == 0) {
            origins = new String[]{"*"};
        }

        registry.addMapping("/**")
                .allowedOriginPatterns(origins)
                .allowedMethods("*")
                .allowedHeaders("*")
                .exposedHeaders("Authorization");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absoluteUploadDir = Path.of(uploadBaseDir).toAbsolutePath().toString().replace("\\", "/");
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absoluteUploadDir + "/");
    }
}
