package com.frota.checklist.service;

import com.frota.checklist.dto.*;
import com.frota.checklist.entity.*;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.MissaoRepository;
import com.frota.checklist.security.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AdminMotoristaService {
    private final MotoristaRepository motoristaRepository;
    private final MissaoRepository missaoRepository;
    private final PasswordEncoder passwordEncoder;
    private final AutorizacaoService autorizacao;
    private final AuditoriaAdministrativaService auditoria;
    private final JdbcTemplate jdbc;
    private final EntityManager entityManager;

    public List<MotoristaResponse> listar(String busca) {
        autorizacao.exigir(Permissao.MOTORISTA_GERIR);
        String filtro = busca == null ? "" : busca.trim().toLowerCase(Locale.ROOT);
        return motoristaRepository.findAll().stream().filter(m -> m.getPerfil() == Perfil.MOTORISTA)
                .filter(m -> filtro.isBlank() || contemBusca(m, filtro)).map(this::toResponse).toList();
    }

    public List<MotoristaOpcao> opcoes() {
        autorizacao.exigir(Permissao.FROTA_CONSULTAR);
        return motoristaRepository.findAll().stream().filter(m -> m.getPerfil() == Perfil.MOTORISTA)
                .map(m -> new MotoristaOpcao(m.getId(), m.getNome(), m.getPerfil())).toList();
    }
    public record MotoristaOpcao(Long id, String nome, Perfil perfil) {}

    public List<UsuarioResponse> listarUsuarios() {
        autorizacao.exigir(Permissao.ACESSO_GERIR);
        return motoristaRepository.findAll().stream().map(UsuarioResponse::from).toList();
    }

    @Transactional
    public MotoristaResponse criar(AdminMotoristaRequest request) {
        serializarContas();
        Motorista autor = autorizacao.exigir(Permissao.MOTORISTA_GERIR);
        exigirPerfilMotorista(request.perfil());
        return toResponse(criarConta(request, autor));
    }

    @Transactional
    public UsuarioResponse criarUsuario(AdminMotoristaRequest request) {
        serializarContas();
        return UsuarioResponse.from(criarConta(request, autorizacao.exigir(Permissao.ACESSO_GERIR)));
    }

    @Transactional
    public MotoristaResponse editar(Long id, AdminMotoristaRequest request) {
        serializarContas();
        Motorista autor = autorizacao.exigir(Permissao.MOTORISTA_GERIR);
        Motorista alvo = buscar(id);
        exigirPerfilMotorista(alvo.getPerfil());
        exigirPerfilMotorista(request.perfil());
        return toResponse(editarConta(alvo, request, autor));
    }

    @Transactional
    public UsuarioResponse editarUsuario(Long id, AdminMotoristaRequest request) {
        serializarContas();
        Motorista autor = autorizacao.exigir(Permissao.ACESSO_GERIR);
        return UsuarioResponse.from(editarConta(buscar(id), request, autor));
    }

    @Transactional
    public UsuarioResponse alterarAcesso(Long id, boolean habilitado, String justificativa) {
        serializarContas();
        Motorista autor = autorizacao.exigir(Permissao.ACESSO_GERIR);
        Motorista alvo = buscar(id);
        protegerUltimoAdmin(alvo, alvo.getPerfil(), habilitado);
        if (alvo.isAcessoHabilitado() != habilitado) {
            auditoria.registrar(autor, "USUARIO", id, "ACESSO_ALTERADO", "acessoHabilitado",
                    String.valueOf(alvo.isAcessoHabilitado()), String.valueOf(habilitado), justificativa.trim());
            alvo.setAcessoHabilitado(habilitado);
            alvo.setVersaoAcesso(alvo.getVersaoAcesso() + 1);
        }
        return UsuarioResponse.from(motoristaRepository.save(alvo));
    }

    @Transactional
    public void excluir(Long id) {
        serializarContas();
        Motorista autor = autorizacao.exigir(Permissao.CADASTRO_EXCLUIR);
        Motorista alvo = buscar(id);
        exigirPerfilMotorista(alvo.getPerfil());
        excluirConta(alvo, autor);
    }

    @Transactional
    public void excluirUsuario(Long id) {
        serializarContas();
        excluirConta(buscar(id), autorizacao.exigir(Permissao.ACESSO_GERIR));
    }

    private Motorista criarConta(AdminMotoristaRequest request, Motorista autor) {
        String cpf = normalizarCpf(request.cpf());
        validarCpf(cpf);
        validarDuplicidadesParaCriacao(request.login().trim(), cpf);
        if (request.senha() == null || request.senha().isBlank()) throw new BusinessException("Informe uma senha para criar o acesso");
        Motorista alvo = new Motorista();
        alvo.setNome(request.nome().trim()); alvo.setLogin(request.login().trim()); alvo.setCpf(cpf);
        alvo.setPerfil(request.perfil()); alvo.setSenha(passwordEncoder.encode(request.senha()));
        alvo.setDeveAlterarSenha(true);
        alvo.setCadastroCompleto(cadastroCompleto(cpf));
        Motorista salvo = motoristaRepository.save(alvo);
        auditoria.registrar(autor, "USUARIO", salvo.getId(), "CONTA_CRIADA", "perfil", null, salvo.getPerfil().name(), null);
        return salvo;
    }

    private Motorista editarConta(Motorista alvo, AdminMotoristaRequest request, Motorista autor) {
        String cpf = normalizarCpf(request.cpf());
        // Existing demonstration CPFs must not prevent changing access permissions.
        if (!Objects.equals(alvo.getCpf(), cpf)) validarCpf(cpf);
        if (motoristaRepository.existsByLoginAndIdNot(request.login().trim(), alvo.getId())) throw new BusinessException("Login ja utilizado");
        if (cpf != null && motoristaRepository.existsByCpfAndIdNot(cpf, alvo.getId())) throw new BusinessException("CPF ja utilizado");
        protegerUltimoAdmin(alvo, request.perfil(), alvo.isAcessoHabilitado());
        if (alvo.getPerfil() != request.perfil() && missaoRepository.existsByMotoristaIdAndStatus(alvo.getId(), StatusMissao.ATIVA))
            throw new BusinessException("Finalize a missao ativa antes de mudar o perfil do motorista");
        registrarCampo(autor, alvo, "nome", alvo.getNome(), request.nome().trim());
        registrarCampo(autor, alvo, "login", alvo.getLogin(), request.login().trim());
        registrarCampo(autor, alvo, "cpf", alvo.getCpf(), cpf);
        registrarCampo(autor, alvo, "perfil", alvo.getPerfil().name(), request.perfil().name());
        if (!Objects.equals(alvo.getLogin(), request.login().trim())) alvo.setVersaoAcesso(alvo.getVersaoAcesso()+1);
        if (request.senha() != null && !request.senha().isBlank()) {
            auditoria.registrar(autor, "USUARIO", alvo.getId(), "SENHA_REDEFINIDA", null, null, null, null);
            alvo.setSenha(passwordEncoder.encode(request.senha()));
            alvo.setDeveAlterarSenha(true);
            alvo.setVersaoAcesso(alvo.getVersaoAcesso()+1);
        }
        alvo.setNome(request.nome().trim()); alvo.setLogin(request.login().trim()); alvo.setCpf(cpf); alvo.setPerfil(request.perfil());
        alvo.setCadastroCompleto(cadastroCompleto(cpf));
        return motoristaRepository.save(alvo);
    }

    private void excluirConta(Motorista alvo, Motorista autor) {
        protegerUltimoAdmin(alvo, alvo.getPerfil(), false);
        if (Objects.equals(autor.getId(), alvo.getId())) throw new BusinessException("Voce nao pode excluir seu proprio acesso");
        if (missaoRepository.existsByMotoristaIdAndStatus(alvo.getId(), StatusMissao.ATIVA)) throw new BusinessException("Este motorista possui uma missao ativa");
        auditoria.registrar(autor, "USUARIO", alvo.getId(), "CONTA_EXCLUIDA", "login", alvo.getLogin(), null, null);
        motoristaRepository.delete(alvo);
        motoristaRepository.flush();
    }

    private void protegerUltimoAdmin(Motorista alvo, Perfil novoPerfil, boolean habilitado) {
        if (alvo.getPerfil() == Perfil.ADMIN && alvo.isAcessoHabilitado()
                && (novoPerfil != Perfil.ADMIN || !habilitado)
                && motoristaRepository.countByPerfilAndAcessoHabilitadoTrue(Perfil.ADMIN) <= 1)
            throw new BusinessException("Mantenha pelo menos um Administrador com acesso habilitado");
    }

    private void serializarContas() {
        // All account writes share a transaction lock, including concurrent last-admin changes.
        jdbc.execute("SELECT pg_advisory_xact_lock(724901)");
        entityManager.clear();
    }
    private Motorista buscar(Long id) { return motoristaRepository.findById(id).orElseThrow(() -> new NotFoundException("Usuario nao encontrado")); }
    private void exigirPerfilMotorista(Perfil perfil) {
        if (perfil != Perfil.MOTORISTA) throw new AccessDeniedException("Use a gestao de acessos para alterar esta conta");
    }
    private void registrarCampo(Motorista autor, Motorista alvo, String campo, String anterior, String novo) {
        if (!Objects.equals(anterior, novo)) auditoria.registrar(autor, "USUARIO", alvo.getId(), "CONTA_EDITADA", campo, anterior, novo, null);
    }

    private boolean contemBusca(Motorista motorista, String filtro) {
        return motorista.getNome().toLowerCase(Locale.ROOT).contains(filtro)
                || (motorista.getCpf() != null && motorista.getCpf().contains(filtro))
                || motorista.getLogin().toLowerCase(Locale.ROOT).contains(filtro);
    }

    private void validarDuplicidadesParaCriacao(String login, String cpf) {
        if (motoristaRepository.existsByLogin(login)) {
            throw new BusinessException("Login ja cadastrado");
        }
        if (cpf != null && motoristaRepository.existsByCpf(cpf)) {
            throw new BusinessException("CPF ja cadastrado");
        }
    }

    private void validarCpf(String cpf) {
        if (cpf == null) return;
        if (!cpf.matches("\\d{11}") || todosDigitosIguais(cpf) || !digitosValidosCpf(cpf)) {
            throw new BusinessException("CPF invalido");
        }
    }

    private String normalizarCpf(String cpf) {
        if (cpf == null || cpf.isBlank()) return null;
        return cpf.replaceAll("\\D", "");
    }

    private boolean cadastroCompleto(String cpf) {
        return cpf != null && !cpf.isBlank();
    }

    private boolean todosDigitosIguais(String cpf) {
        char c = cpf.charAt(0);
        for (int i = 1; i < cpf.length(); i++) {
            if (cpf.charAt(i) != c) {
                return false;
            }
        }
        return true;
    }

    private boolean digitosValidosCpf(String cpf) {
        int d1 = calcularDigito(cpf, 9, 10);
        int d2 = calcularDigito(cpf, 10, 11);
        return d1 == Character.getNumericValue(cpf.charAt(9))
                && d2 == Character.getNumericValue(cpf.charAt(10));
    }

    private int calcularDigito(String cpf, int tamanho, int pesoInicial) {
        int soma = 0;
        int peso = pesoInicial;
        for (int i = 0; i < tamanho; i++) {
            soma += Character.getNumericValue(cpf.charAt(i)) * peso--;
        }
        int resto = 11 - (soma % 11);
        return resto > 9 ? 0 : resto;
    }

    private MotoristaResponse toResponse(Motorista motorista) {
        return new MotoristaResponse(
                motorista.getId(),
                motorista.getNome(),
                motorista.getLogin(),
                motorista.getCpf(),
                motorista.getPerfil(),
                motorista.isAcessoHabilitado(),
                motorista.isDeveAlterarSenha(),
                motorista.isCadastroCompleto()
        );
    }
}
