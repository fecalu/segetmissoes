package com.frota.checklist.config;

import com.frota.checklist.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/register").denyAll()
                        .requestMatchers("/api/admin/usuarios", "/api/admin/usuarios/**").hasAuthority("ACESSO_GERIR")
                        .requestMatchers(HttpMethod.GET, "/api/admin/motoristas/opcoes").hasAuthority("FROTA_CONSULTAR")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/motoristas/*", "/api/admin/veiculos/*").hasAuthority("CADASTRO_EXCLUIR")
                        .requestMatchers("/api/admin/motoristas", "/api/admin/motoristas/*").hasAuthority("MOTORISTA_GERIR")
                        .requestMatchers(HttpMethod.GET, "/api/admin/configuracoes/rotulos-status-veiculo", "/api/admin/configuracoes/sugestoes-missao").hasAuthority("FROTA_CONSULTAR")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/configuracoes/rotulos-status-veiculo", "/api/admin/configuracoes/sugestoes-missao").hasAuthority("CONFIGURACAO_GERIR")
                        .requestMatchers(HttpMethod.GET, "/api/admin/alocacoes", "/api/admin/alocacoes/*/historico", "/api/admin/alocacoes/vagas", "/api/admin/alocacoes/vagas/*/historico").hasAuthority("ALOCACAO_CONSULTAR")
                        .requestMatchers(HttpMethod.POST, "/api/admin/alocacoes", "/api/admin/alocacoes/vagas").hasAuthority("ALOCACAO_GERIR")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/alocacoes/*/dados", "/api/admin/alocacoes/vagas/*").hasAuthority("ALOCACAO_GERIR")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/alocacoes/*/veiculo", "/api/admin/alocacoes/*/responsavel", "/api/admin/alocacoes/*/encerrar", "/api/admin/alocacoes/vagas/*/desativar", "/api/admin/alocacoes/vagas/*/reativar").hasAuthority("ALOCACAO_GERIR")
                        .requestMatchers(HttpMethod.GET, "/api/admin/checklists", "/api/admin/vistorias-completas", "/uploads/**").hasAuthority("VISTORIA_CONSULTAR")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/vistorias-completas/*/contraparte").hasAuthority("VISTORIA_CORRIGIR")
                        .requestMatchers(HttpMethod.GET, "/api/admin/relatorios/checklists/pdf", "/api/admin/relatorios/missoes/pdf").hasAuthority("RELATORIO_EXPORTAR")
                        .requestMatchers(HttpMethod.GET, "/api/admin/estatisticas/missoes").hasAuthority("ESTATISTICA_CONSULTAR")
                        .requestMatchers(HttpMethod.GET, "/api/admin/missoes", "/api/admin/missoes/*/auditoria", "/api/admin/missoes/excecoes", "/api/admin/veiculos", "/api/admin/veiculos/*/historico", "/api/admin/veiculos/*/historico-status").hasAuthority("FROTA_CONSULTAR")
                        .requestMatchers(HttpMethod.POST, "/api/admin/missoes/registros-administrativos").hasAuthority("MISSAO_REGISTRAR")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/missoes/*/registrar-retorno").hasAuthority("MISSAO_REGISTRAR")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/missoes/*/dados-administrativos").hasAuthority("MISSAO_COMPLEMENTAR")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/missoes/*/edicao-manual").hasAuthority("MISSAO_CORRIGIR")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/missoes/*/horario").hasAuthority("MISSAO_CORRIGIR")
                        .requestMatchers(HttpMethod.POST, "/api/admin/missoes/contingencias").hasAuthority("MISSAO_ENCERRAR_EXCECAO")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/missoes/*/encerrar-pendente", "/api/admin/missoes/excecoes/*/encerrar").hasAuthority("MISSAO_ENCERRAR_EXCECAO")
                        .requestMatchers(HttpMethod.POST, "/api/admin/veiculos").hasAuthority("VEICULO_GERIR")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/veiculos/*").hasAuthority("VEICULO_GERIR")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/veiculos/*/desativar", "/api/admin/veiculos/*/reativar").hasAuthority("VEICULO_GERIR")
                        .requestMatchers(HttpMethod.POST, "/api/admin/veiculos/*/exclusao-definitiva").hasAuthority("CADASTRO_EXCLUIR")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/veiculos/*/status-administrativo", "/api/admin/veiculos/*/localizacao-operacional").hasAuthority("FROTA_OPERAR")
                        .requestMatchers(HttpMethod.POST, "/api/admin/veiculos/*/em-viagem", "/api/admin/veiculos/*/retorno-viagem", "/api/admin/veiculos/*/em-uso-externo", "/api/admin/veiculos/*/retorno-uso-externo").hasAuthority("FROTA_OPERAR")
                        .requestMatchers("/api/admin/**", "/uploads/**").denyAll()
                        .requestMatchers(HttpMethod.POST, "/api/checklists/**").hasRole("MOTORISTA")
                        .requestMatchers(HttpMethod.POST, "/api/vistorias-completas/**").hasRole("MOTORISTA")
                        .requestMatchers(HttpMethod.POST, "/api/missoes/excecoes/**").hasRole("MOTORISTA")
                        .requestMatchers(HttpMethod.GET, "/api/veiculos/**").authenticated()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((req, res, ex) -> erroAcesso(res, 401, "Sua sessao expirou. Entre novamente."))
                        .accessDeniedHandler((req, res, ex) -> erroAcesso(res, 403, "Seu perfil nao permite realizar esta operacao")))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void erroAcesso(jakarta.servlet.http.HttpServletResponse response, int status, String message)
            throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        objectMapper.writeValue(response.getWriter(), java.util.Map.of("status", status, "message", message));
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
