package com.frota.checklist.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frota.checklist.config.DataInitializer;
import com.frota.checklist.entity.*;
import com.frota.checklist.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@SpringBootTest(properties = {"app.demo-data-enabled=false", "app.bootstrap-admin.enabled=false", "app.upload.base-dir=target/test-uploads"})
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named = "RBAC_TEST_DB_URL", matches = ".+")
class PerfisIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getenv("RBAC_TEST_DB_URL"));
        properties.add("spring.datasource.username", () -> System.getenv("RBAC_TEST_DB_USER"));
        properties.add("spring.datasource.password", () -> System.getenv("RBAC_TEST_DB_PASSWORD"));
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired MotoristaRepository usuarios;
    @Autowired VeiculoRepository veiculos;
    @Autowired MissaoRepository missoes;
    @Autowired AuditoriaAdministrativaRepository auditoria;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataInitializer initializer;
    final Map<Perfil, Motorista> contas = new EnumMap<>(Perfil.class);

    @BeforeEach void prepararContas() {
        for (Perfil perfil : Perfil.values()) {
            Motorista u = new Motorista();
            u.setLogin("teste-" + perfil); u.setNome("Teste " + perfil); u.setCpf(String.format("%011d", perfil.ordinal() + 1));
            u.setPerfil(perfil); u.setSenha(encoder.encode("SenhaSoParaTestes123"));
            contas.put(perfil, usuarios.saveAndFlush(u));
        }
    }

    @ParameterizedTest @EnumSource(Perfil.class)
    void consultaRespeitaAMatriz(Perfil perfil) throws Exception {
        var principal = user(new CustomUserDetails(contas.get(perfil)));
        mvc.perform(get("/api/auth/me").with(principal)).andExpect(status().isOk()).andExpect(jsonPath("$.perfil").value(perfil.name()));
        mvc.perform(get("/api/admin/veiculos").with(principal)).andExpect(status().is(perfil == Perfil.MOTORISTA ? 403 : 200));
        mvc.perform(get("/api/admin/alocacoes").with(principal)).andExpect(status().is(perfil == Perfil.MOTORISTA ? 403 : 200));
        mvc.perform(get("/api/admin/usuarios").with(principal)).andExpect(status().is(perfil == Perfil.ADMIN ? 200 : 403));
        mvc.perform(get("/api/admin/motoristas").with(principal)).andExpect(status().is(perfil == Perfil.ADMIN || perfil == Perfil.GESTOR ? 200 : 403));
        mvc.perform(get("/api/admin/motoristas/opcoes").with(principal)).andExpect(status().is(perfil == Perfil.MOTORISTA ? 403 : 200));
        mvc.perform(get("/api/admin/rota-nao-cadastrada").with(principal)).andExpect(status().isForbidden());
    }

    @Test void endpointsSensiveisBloqueiamOperadorAntesDoController() throws Exception {
        for (MockHttpServletRequestBuilder request : List.of(
                post("/api/admin/usuarios"), post("/api/admin/motoristas"), post("/api/admin/alocacoes"),
                put("/api/admin/configuracoes/rotulos-status-veiculo"), post("/api/admin/missoes/contingencias"),
                patch("/api/admin/missoes/1/horario"), patch("/api/admin/missoes/1/encerrar-pendente"),
                patch("/api/admin/vistorias-completas/1/contraparte"), delete("/api/admin/veiculos/1"))) {
            executar(request, Perfil.OPERADOR, Map.of()).andExpect(status().isForbidden());
        }
    }

    @Test void gestorNaoElevaPerfilNemEditaAdministradorPelaRotaDeMotoristas() throws Exception {
        Motorista admin = contas.get(Perfil.ADMIN), driver = contas.get(Perfil.MOTORISTA);
        executar(put("/api/admin/motoristas/" + admin.getId()), Perfil.GESTOR, dadosConta(admin, Perfil.MOTORISTA)).andExpect(status().isForbidden());
        executar(put("/api/admin/motoristas/" + driver.getId()), Perfil.GESTOR, dadosConta(driver, Perfil.ADMIN)).andExpect(status().isForbidden());
        executar(put("/api/admin/motoristas/" + driver.getId()), Perfil.GESTOR, dadosConta(driver, Perfil.MOTORISTA)).andExpect(status().isOk());
        assertThat(usuarios.findById(admin.getId()).orElseThrow().getPerfil()).isEqualTo(Perfil.ADMIN);
    }

    @Test void naoPodeRemoverUltimoAdministradorHabilitado() throws Exception {
        Motorista admin = contas.get(Perfil.ADMIN);
        executar(patch("/api/admin/usuarios/" + admin.getId() + "/acesso"), Perfil.ADMIN,
                Map.of("habilitado", false, "justificativa", "Suspender acesso de teste")).andExpect(status().isBadRequest());
        executar(put("/api/admin/usuarios/" + admin.getId()), Perfil.ADMIN, dadosConta(admin, Perfil.OPERADOR)).andExpect(status().isBadRequest());
        executar(delete("/api/admin/usuarios/" + admin.getId()), Perfil.ADMIN, Map.of()).andExpect(status().isBadRequest());
        assertThat(usuarios.countByPerfilAndAcessoHabilitadoTrue(Perfil.ADMIN)).isEqualTo(1);
    }

    @Test void suspensaoRevogaTokenEAuditaSemSenha() throws Exception {
        Motorista operador = contas.get(Perfil.OPERADOR);
        String token = jwt.generateToken(new CustomUserDetails(operador));
        executar(patch("/api/admin/usuarios/" + operador.getId() + "/acesso"), Perfil.ADMIN,
                Map.of("habilitado", false, "justificativa", "Fim do acesso temporario")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        executar(patch("/api/admin/usuarios/" + operador.getId() + "/acesso"), Perfil.ADMIN,
                Map.of("habilitado", true, "justificativa", "Retorno do acesso temporario")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        assertThat(auditoria.findTop200ByEntidadeOrderByDataHoraDescIdDesc("USUARIO")).hasSize(2)
                .allSatisfy(a -> { assertThat(a.getAutorPerfil()).isEqualTo(Perfil.ADMIN); assertThat(a.getCampo()).isEqualTo("acessoHabilitado"); });
    }

    @Test void mudancaDePerfilValeParaTokenJaEmitido() throws Exception {
        Motorista gestor = contas.get(Perfil.GESTOR);
        String token = jwt.generateToken(new CustomUserDetails(gestor));
        executar(put("/api/admin/usuarios/" + gestor.getId()), Perfil.ADMIN, dadosConta(gestor, Perfil.OPERADOR)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/motoristas").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("OPERADOR"));
    }

    @Test void fotosECadastroPublicoNaoSaoAnonimos() throws Exception {
        mvc.perform(get("/uploads/foto-inexistente.jpg")).andExpect(status().isUnauthorized());
        executar(get("/uploads/foto-inexistente.jpg"), Perfil.MOTORISTA, null).andExpect(status().isForbidden());
        executar(get("/uploads/foto-inexistente.jpg"), Perfil.OPERADOR, null).andExpect(status().isNotFound());
        executar(post("/api/auth/register"), Perfil.ADMIN, Map.of()).andExpect(status().isForbidden());
        executar(post("/api/checklists"), Perfil.OPERADOR, Map.of()).andExpect(status().isForbidden());
        executar(post("/api/checklists"), Perfil.MOTORISTA, Map.of()).andExpect(status().isUnsupportedMediaType());
    }

    @Test void operadorCorrigeSomenteDisponivelPatioComMotivo() throws Exception {
        Veiculo v = veiculo(null);
        executar(patch("/api/admin/veiculos/" + v.getId() + "/status-administrativo"), Perfil.OPERADOR,
                Map.of("statusAdministrativo", "NO_PATIO")).andExpect(status().isBadRequest());
        executar(patch("/api/admin/veiculos/" + v.getId() + "/status-administrativo"), Perfil.OPERADOR,
                Map.of("statusAdministrativo", "NO_PATIO", "justificativa", "Correcao do local informado")).andExpect(status().isOk());
        executar(patch("/api/admin/veiculos/" + v.getId() + "/status-administrativo"), Perfil.OPERADOR,
                Map.of("statusAdministrativo", "BLOQUEADO", "justificativa", "Tentativa sem autorizacao")).andExpect(status().isForbidden());
    }

    @Test void operadorNaoLiberaBloqueadoNemAguardandoPorRotasAlternativas() throws Exception {
        for (StatusVeiculo situacao : List.of(StatusVeiculo.BLOQUEADO, StatusVeiculo.AGUARDANDO_REALOCACAO)) {
            Veiculo v = veiculo(situacao);
            executar(patch("/api/admin/veiculos/" + v.getId() + "/status-administrativo"), Perfil.OPERADOR,
                    Map.of("justificativa", "Tentativa de liberar veiculo")).andExpect(status().isForbidden());
            executar(post("/api/admin/missoes/registros-administrativos"), Perfil.OPERADOR, dadosSaida(v, "NA_CIDADE")).andExpect(status().isForbidden());
        }
    }

    @Test void operadorRegistraViagemERetornoNoPatio() throws Exception {
        Veiculo v = veiculo(StatusVeiculo.NO_PATIO);
        String response = executar(post("/api/admin/missoes/registros-administrativos"), Perfil.OPERADOR, dadosSaida(v, "VIAGEM"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(response).get("id").asLong();
        executar(patch("/api/admin/missoes/" + id + "/registrar-retorno"), Perfil.OPERADOR,
                Map.of("dataHoraFim", LocalDateTime.now().minusHours(1).toString(), "statusAdministrativoDestino", "NO_PATIO"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FINALIZADA"));
        assertThat(veiculos.findById(v.getId()).orElseThrow().getStatusAdministrativo()).isEqualTo(StatusVeiculo.NO_PATIO);
    }

    @Test void rotasLegadasNaoLiberamVeiculoRestrito() throws Exception {
        Veiculo v = veiculo(StatusVeiculo.BLOQUEADO);
        executar(post("/api/admin/veiculos/" + v.getId() + "/em-viagem"), Perfil.OPERADOR,
                Map.of("motoristaId", contas.get(Perfil.MOTORISTA).getId(), "localDestino", "Destino teste",
                        "dataHoraSaida", LocalDateTime.now().minusHours(2).toString())).andExpect(status().isForbidden());
        executar(post("/api/admin/veiculos/" + v.getId() + "/em-uso-externo"), Perfil.OPERADOR,
                Map.of("nomeEntreguePara", "Oficina teste", "tipoUsoExterno", "OFICINA",
                        "dataHoraSaida", LocalDateTime.now().minusHours(2).toString(), "justificativaSemVistoria", "Registro administrativo de teste"))
                .andExpect(status().isForbidden());
        executar(post("/api/admin/veiculos/" + v.getId() + "/retorno-uso-externo"), Perfil.OPERADOR,
                Map.of("nomeRecebidoDe", "Oficina teste", "dataHoraRetorno", LocalDateTime.now().toString(),
                        "statusAdministrativoDestino", "AGUARDANDO_REALOCACAO", "justificativaSemVistoria", "Registro administrativo de teste"))
                .andExpect(status().isForbidden());
    }

    @Test void operadorRecebeUsoExternoSemLiberarVeiculo() throws Exception {
        Veiculo v = veiculo(null);
        executar(post("/api/admin/veiculos/" + v.getId() + "/em-uso-externo"), Perfil.OPERADOR,
                Map.of("nomeEntreguePara", "Oficina teste", "tipoUsoExterno", "OFICINA",
                        "dataHoraSaida", LocalDateTime.now().minusHours(2).toString(), "justificativaSemVistoria", "Registro administrativo de teste"))
                .andExpect(status().isOk());
        Map<String, Object> retorno = new HashMap<>(Map.of("nomeRecebidoDe", "Oficina teste", "dataHoraRetorno", LocalDateTime.now().toString(),
                "justificativaSemVistoria", "Registro administrativo de teste"));
        executar(post("/api/admin/veiculos/" + v.getId() + "/retorno-uso-externo"), Perfil.OPERADOR, retorno)
                .andExpect(status().isForbidden());
        retorno.put("statusAdministrativoDestino", "AGUARDANDO_REALOCACAO");
        executar(post("/api/admin/veiculos/" + v.getId() + "/retorno-uso-externo"), Perfil.OPERADOR, retorno)
                .andExpect(status().isOk());
        assertThat(veiculos.findById(v.getId()).orElseThrow().getStatusAdministrativo()).isEqualTo(StatusVeiculo.AGUARDANDO_REALOCACAO);
    }

    @Test void operadorNaoFazEncerramentoExcepcionalDisfarcadoDeRetorno() throws Exception {
        Missao missao = missao(OrigemAberturaMissao.CHECKLIST, StatusMissao.ATIVA);
        executar(patch("/api/admin/missoes/" + missao.getId() + "/registrar-retorno"), Perfil.OPERADOR,
                Map.of("dataHoraFim", LocalDateTime.now().toString())).andExpect(status().isBadRequest());
        assertThat(missoes.findById(missao.getId()).orElseThrow().getStatus()).isEqualTo(StatusMissao.ATIVA);
    }

    @Test void operadorCompletaLacunasMasNaoSubstituiDadoFinalizado() throws Exception {
        Missao m = missao(OrigemAberturaMissao.REGISTRO_ADMINISTRATIVO, StatusMissao.FINALIZADA);
        String rota = "/api/admin/missoes/" + m.getId() + "/dados-administrativos";
        executar(put(rota), Perfil.OPERADOR, Map.of("localDestino", "Destino original", "setorSolicitante", "SEGET", "solicitanteNome", "Pessoa teste"))
                .andExpect(status().isOk());
        executar(put(rota), Perfil.OPERADOR, Map.of("localDestino", "Destino diferente", "justificativa", "Mesmo com motivo nao pode"))
                .andExpect(status().isForbidden());
        executar(put(rota), Perfil.GESTOR, Map.of("localDestino", "Destino diferente" )).andExpect(status().isBadRequest());
        executar(put(rota), Perfil.GESTOR, Map.of("localDestino", "Destino diferente", "justificativa", "Correcao conferida com solicitante"))
                .andExpect(status().isOk());
    }

    @Test void migracaoPreservaContaAoExpandirRestricaoAntiga() throws Exception {
        jdbc.update("DELETE FROM motoristas WHERE perfil IN ('GESTOR','OPERADOR')");
        jdbc.execute("ALTER TABLE motoristas DROP CONSTRAINT motoristas_perfil_check");
        jdbc.execute("ALTER TABLE motoristas ADD CONSTRAINT motoristas_perfil_check CHECK (perfil IN ('ADMIN','MOTORISTA'))");
        var admin = contas.get(Perfil.ADMIN);
        String antes = jdbc.queryForObject("SELECT senha FROM motoristas WHERE id=?", String.class, admin.getId());
        jdbc.execute(new ClassPathResource("db/migration/V1__perfis_e_acessos.sql").getContentAsString(StandardCharsets.UTF_8));
        jdbc.update("UPDATE motoristas SET perfil='GESTOR' WHERE id=?", contas.get(Perfil.MOTORISTA).getId());
        assertThat(jdbc.queryForObject("SELECT senha FROM motoristas WHERE id=?", String.class, admin.getId())).isEqualTo(antes);
        assertThat(jdbc.queryForObject("SELECT acesso_habilitado FROM motoristas WHERE id=?", Boolean.class, admin.getId())).isTrue();
    }

    @Test void inicializadorDeDemoNaoReescreveContaExistente() {
        Motorista existente = contas.get(Perfil.ADMIN);
        existente.setLogin("admin"); existente.setNome("Nome preservado"); existente.setPerfil(Perfil.GESTOR);
        usuarios.saveAndFlush(existente);
        String senha = existente.getSenha();
        ReflectionTestUtils.setField(initializer, "demoDataEnabled", true);
        try { initializer.run(); } finally { ReflectionTestUtils.setField(initializer, "demoDataEnabled", false); }
        Motorista depois = usuarios.findByLogin("admin").orElseThrow();
        assertThat(depois.getNome()).isEqualTo("Nome preservado");
        assertThat(depois.getSenha()).isEqualTo(senha);
        assertThat(depois.getPerfil()).isEqualTo(Perfil.GESTOR);
    }

    private org.springframework.test.web.servlet.ResultActions executar(MockHttpServletRequestBuilder request, Perfil perfil, Object body) throws Exception {
        request.with(user(new CustomUserDetails(contas.get(perfil))));
        if (body != null) request.contentType("application/json").content(json.writeValueAsBytes(body));
        return mvc.perform(request);
    }
    private Map<String, Object> dadosConta(Motorista u, Perfil perfil) {
        return Map.of("nome", u.getNome(), "login", u.getLogin(), "cpf", u.getCpf(), "perfil", perfil.name());
    }
    private Veiculo veiculo(StatusVeiculo status) {
        Veiculo v = new Veiculo(); v.setPlaca("TST" + UUID.randomUUID().toString().substring(0, 4));
        v.setModelo("Veiculo de teste"); v.setMarca("Teste"); v.setStatusAdministrativo(status);
        return veiculos.saveAndFlush(v);
    }
    private Map<String, Object> dadosSaida(Veiculo v, String tipo) {
        return Map.of("motoristaId", contas.get(Perfil.MOTORISTA).getId(), "veiculoId", v.getId(), "tipoDeslocamento", tipo,
                "dataHoraInicio", LocalDateTime.now().minusHours(3).toString(), "localDestino", "Destino teste",
                "setorSolicitante", "SEGET", "solicitanteNome", "Solicitante teste");
    }
    private Missao missao(OrigemAberturaMissao origem, StatusMissao status) {
        Missao m = new Missao(); m.setMotorista(contas.get(Perfil.MOTORISTA)); m.setVeiculo(veiculo(null));
        m.setOrigemAbertura(origem); m.setStatus(status); m.setDataHoraInicio(LocalDateTime.now().minusHours(2));
        if (status == StatusMissao.FINALIZADA) m.setDataHoraFim(LocalDateTime.now().minusHours(1));
        m.setLocalDestino("Destino original"); return missoes.saveAndFlush(m);
    }
}
