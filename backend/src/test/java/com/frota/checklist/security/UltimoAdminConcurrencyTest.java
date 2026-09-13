package com.frota.checklist.security;

import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.service.AdminMotoristaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.util.List;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties = {"app.demo-data-enabled=false", "app.bootstrap-admin.enabled=false", "app.upload.base-dir=target/test-uploads"})
@EnabledIfEnvironmentVariable(named = "RBAC_TEST_DB_URL", matches = ".+")
class UltimoAdminConcurrencyTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) { PerfisIntegrationTest.database(p); }
    @Autowired MotoristaRepository repository;
    @Autowired AdminMotoristaService service;
    @Autowired JdbcTemplate jdbc;

    @Test void duasSuspensoesSimultaneasPreservamUmAdministrador() throws Exception {
        assertThat(repository.countByPerfilAndAcessoHabilitadoTrue(Perfil.ADMIN)).isZero();
        Motorista primeiro = criar("concorrente-a", "90000000001");
        Motorista segundo = criar("concorrente-b", "90000000002");
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch inicio = new CountDownLatch(1);
        try {
            Future<Boolean> a = executor.submit(() -> suspender(primeiro, inicio));
            Future<Boolean> b = executor.submit(() -> suspender(segundo, inicio));
            inicio.countDown();
            assertThat(List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS))).containsExactlyInAnyOrder(true, false);
            assertThat(repository.countByPerfilAndAcessoHabilitadoTrue(Perfil.ADMIN)).isEqualTo(1);
        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
            jdbc.update("DELETE FROM auditoria_administrativa WHERE entidade='USUARIO' AND registro_id IN (?, ?)", primeiro.getId(), segundo.getId());
            repository.deleteAllById(List.of(primeiro.getId(), segundo.getId()));
        }
    }

    private Motorista criar(String login, String cpf) {
        Motorista m = new Motorista(); m.setNome(login); m.setLogin(login); m.setCpf(cpf);
        m.setSenha("nao-utilizada-pelo-teste"); m.setPerfil(Perfil.ADMIN);
        return repository.saveAndFlush(m);
    }
    private boolean suspender(Motorista m, CountDownLatch inicio) throws Exception {
        var principal = new CustomUserDetails(m);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        try {
            inicio.await(10, TimeUnit.SECONDS);
            service.alterarAcesso(m.getId(), false, "Suspensao concorrente de teste");
            return true;
        } catch (BusinessException ex) {
            assertThat(ex.getMessage()).contains("pelo menos um Administrador");
            return false;
        } finally { SecurityContextHolder.clearContext(); }
    }
}
