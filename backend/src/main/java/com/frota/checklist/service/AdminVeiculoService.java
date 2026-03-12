package com.frota.checklist.service;

import com.frota.checklist.dto.AdminVeiculoRequest;
import com.frota.checklist.entity.AuditoriaExclusaoVeiculo;
import com.frota.checklist.dto.HistoricoStatusVeiculoResponse;
import com.frota.checklist.dto.RegistrarRetornoUsoExternoRequest;
import com.frota.checklist.dto.RegistrarVeiculoEmUsoExternoRequest;
import com.frota.checklist.dto.RegistrarVeiculoEmViagemRequest;
import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.HistoricoStatusVeiculo;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.RegistroUsoExternoVeiculo;
import com.frota.checklist.entity.RegistroViagemVeiculo;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.AuditoriaExclusaoVeiculoRepository;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.HistoricoStatusVeiculoRepository;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.RegistroUsoExternoVeiculoRepository;
import com.frota.checklist.repository.RegistroViagemVeiculoRepository;
import com.frota.checklist.repository.VeiculoRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminVeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final ChecklistRepository checklistRepository;
    private final MotoristaRepository motoristaRepository;
    private final HistoricoStatusVeiculoRepository historicoStatusVeiculoRepository;
    private final MissaoExcecaoRepository missaoExcecaoRepository;
    private final RegistroViagemVeiculoRepository registroViagemVeiculoRepository;
    private final RegistroUsoExternoVeiculoRepository registroUsoExternoVeiculoRepository;
    private final AuditoriaExclusaoVeiculoRepository auditoriaExclusaoVeiculoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;
    private final ConfiguracaoRotuloStatusVeiculoService configuracaoRotuloStatusVeiculoService;
    private final PasswordEncoder passwordEncoder;

    public List<VeiculoResponse> listar(String buscaPlaca) {
        String filtro = buscaPlaca == null ? "" : normalizarPlaca(buscaPlaca);
        List<Veiculo> veiculos = veiculoRepository.findAll(Sort.by(Sort.Direction.ASC, "placa")).stream()
                .filter(v -> filtro.isBlank() || normalizarPlaca(v.getPlaca()).contains(filtro))
                .toList();
        Map<Long, VeiculoStatusSnapshot> snapshots = veiculoStatusResolver.resolverPorVeiculos(veiculos);
        Map<Long, RegistroViagemVeiculo> viagensAtivas = carregarViagensAtivasPorVeiculo(veiculos);
        Map<Long, RegistroUsoExternoVeiculo> usosExternosAtivos = carregarUsosExternosAtivosPorVeiculo(veiculos);
        Map<StatusVeiculo, String> rotulos = configuracaoRotuloStatusVeiculoService.mapaRotulosAtuais();
        return veiculos.stream()
                .map(v -> toResponse(v, snapshots.get(v.getId()), rotulos, viagensAtivas.get(v.getId()), usosExternosAtivos.get(v.getId())))
                .toList();
    }

    public VeiculoResponse criar(AdminVeiculoRequest request) {
        String placa = normalizarPlaca(request.placa());
        if (veiculoRepository.existsByPlaca(placa)) {
            throw new BusinessException("Placa ja cadastrada");
        }

        Veiculo veiculo = new Veiculo();
        veiculo.setPlaca(placa);
        veiculo.setModelo(request.modelo().trim());
        veiculo.setMarca(request.marca().trim());
        veiculo.setDesativado(false);
        veiculo.setStatusAdministrativo(StatusVeiculo.AGUARDANDO_REALOCACAO);

        return toResponse(veiculoRepository.save(veiculo));
    }

    public VeiculoResponse editar(Long id, AdminVeiculoRequest request) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));

        String placa = normalizarPlaca(request.placa());
        if (veiculoRepository.existsByPlacaAndIdNot(placa, id)) {
            throw new BusinessException("Placa ja cadastrada");
        }

        veiculo.setPlaca(placa);
        veiculo.setModelo(request.modelo().trim());
        veiculo.setMarca(request.marca().trim());

        return toResponse(veiculoRepository.save(veiculo));
    }

    @Transactional
    public VeiculoResponse desativar(Long id, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);
        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            return toResponse(veiculo);
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        if (snapshotAntes.statusAutomatico().isDeslocamentoAtivo()) {
            throw new BusinessException("Nao e possivel desativar veiculo em missao. Registre a chegada primeiro");
        }

        veiculo.setDesativado(true);
        veiculo.setStatusAdministrativo(StatusVeiculo.BLOQUEADO);
        Veiculo salvo = veiculoRepository.save(veiculo);
        encerrarViagemAtivaSeNecessario(salvo, snapshotAntes.statusAtual(), StatusVeiculo.BLOQUEADO, administrador);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), StatusVeiculo.BLOQUEADO);

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse reativar(Long id, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);
        if (!Boolean.TRUE.equals(veiculo.getDesativado())) {
            return toResponse(veiculo);
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        veiculo.setDesativado(false);
        veiculo.setStatusAdministrativo(null);
        Veiculo salvo = veiculoRepository.save(veiculo);
        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);
        encerrarViagemAtivaSeNecessario(salvo, snapshotAntes.statusAtual(), snapshotDepois.statusAtual(), administrador);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), snapshotDepois.statusAtual());

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse atualizarStatusAdministrativo(Long id, StatusVeiculo novoStatusAdministrativo, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);

        StatusVeiculo novoStatusNormalizado = StatusVeiculo.normalizarStatusAdministrativo(novoStatusAdministrativo);
        if (novoStatusAdministrativo != null && novoStatusNormalizado == null) {
            throw new BusinessException("Status administrativo invalido");
        }
        if (novoStatusNormalizado == StatusVeiculo.EM_VIAGEM) {
            throw new BusinessException("Use o registro de viagem para colocar o veiculo em viagem");
        }
        if (novoStatusNormalizado == StatusVeiculo.EM_USO_EXTERNO) {
            throw new BusinessException("Use o registro de uso externo para colocar o veiculo em uso externo");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        if (snapshotAntes.statusAdministrativo() == novoStatusNormalizado) {
            return toResponse(veiculo);
        }
        if (registroUsoExternoVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(id).isPresent()) {
            throw new BusinessException("Use o retorno de uso externo para retirar o veiculo de uso externo");
        }

        veiculo.setStatusAdministrativo(novoStatusNormalizado);
        Veiculo salvo = veiculoRepository.save(veiculo);

        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);
        encerrarViagemAtivaSeNecessario(salvo, snapshotAntes.statusAtual(), snapshotDepois.statusAtual(), administrador);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), snapshotDepois.statusAtual());

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse registrarEmViagem(Long id, RegistrarVeiculoEmViagemRequest request, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);
        Motorista motoristaViagem = motoristaRepository.findById(request.motoristaId())
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));

        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode ser colocado em viagem");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        if (snapshotAntes.statusAutomatico().isDeslocamentoAtivo()) {
            throw new BusinessException("Nao e possivel colocar em viagem um veiculo com missao em andamento");
        }
        if (snapshotAntes.statusAtual() == StatusVeiculo.EM_VIAGEM) {
            throw new BusinessException("Este veiculo ja esta em viagem");
        }
        if (registroViagemVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(id).isPresent()) {
            throw new BusinessException("Ja existe um registro de viagem em aberto para este veiculo");
        }

        RegistroViagemVeiculo viagem = new RegistroViagemVeiculo();
        viagem.setVeiculo(veiculo);
        viagem.setMotorista(motoristaViagem);
        viagem.setAdministradorRegistro(administrador);
        viagem.setLocalDestino(request.localDestino().trim());
        viagem.setObservacao(trimToNull(request.observacao()));
        viagem.setDataHoraSaida(request.dataHoraSaida());
        registroViagemVeiculoRepository.save(viagem);

        veiculo.setStatusAdministrativo(StatusVeiculo.EM_VIAGEM);
        Veiculo salvo = veiculoRepository.save(veiculo);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), StatusVeiculo.EM_VIAGEM);

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse registrarEmUsoExterno(Long id, RegistrarVeiculoEmUsoExternoRequest request, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);

        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode ser colocado em uso externo");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        if (snapshotAntes.statusAutomatico().isDeslocamentoAtivo()) {
            throw new BusinessException("Nao e possivel colocar em uso externo um veiculo com missao em andamento");
        }
        if (snapshotAntes.statusAtual() == StatusVeiculo.EM_USO_EXTERNO) {
            throw new BusinessException("Este veiculo ja esta em uso externo");
        }
        if (registroUsoExternoVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(id).isPresent()) {
            throw new BusinessException("Ja existe um registro de uso externo em aberto para este veiculo");
        }

        RegistroUsoExternoVeiculo registro = new RegistroUsoExternoVeiculo();
        registro.setVeiculo(veiculo);
        registro.setAdministradorRegistro(administrador);
        registro.setNomeEntreguePara(request.nomeEntreguePara().trim());
        registro.setObservacaoSaida(trimToNull(request.observacao()));
        registro.setDataHoraSaida(request.dataHoraSaida());
        registroUsoExternoVeiculoRepository.save(registro);

        veiculo.setStatusAdministrativo(StatusVeiculo.EM_USO_EXTERNO);
        Veiculo salvo = veiculoRepository.save(veiculo);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), StatusVeiculo.EM_USO_EXTERNO);
        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse registrarRetornoUsoExterno(Long id, RegistrarRetornoUsoExternoRequest request, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);
        RegistroUsoExternoVeiculo registro = registroUsoExternoVeiculoRepository
                .findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(id)
                .orElseThrow(() -> new BusinessException("Nao existe registro de uso externo em aberto para este veiculo"));

        StatusVeiculo destinoNormalizado = StatusVeiculo.normalizarStatusAdministrativo(request.statusAdministrativoDestino());
        if (request.statusAdministrativoDestino() != null && destinoNormalizado == null) {
            throw new BusinessException("Status de retorno invalido");
        }
        if (destinoNormalizado == StatusVeiculo.EM_USO_EXTERNO) {
            throw new BusinessException("O retorno do uso externo precisa mover o veiculo para outra coluna");
        }
        if (destinoNormalizado == StatusVeiculo.EM_VIAGEM) {
            throw new BusinessException("Receba o veiculo primeiro. Depois registre a viagem em um novo passo");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        registro.setNomeRecebidoDe(request.nomeRecebidoDe().trim());
        registro.setObservacaoRetorno(trimToNull(request.observacao()));
        registro.setDataHoraRetorno(request.dataHoraRetorno());
        registro.setAdministradorEncerramento(administrador);
        registroUsoExternoVeiculoRepository.save(registro);

        veiculo.setStatusAdministrativo(destinoNormalizado);
        Veiculo salvo = veiculoRepository.save(veiculo);
        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);
        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), snapshotDepois.statusAtual());
        return toResponse(salvo);
    }

    public List<HistoricoStatusVeiculoResponse> listarHistoricoStatus(Long veiculoId) {
        if (!veiculoRepository.existsById(veiculoId)) {
            throw new NotFoundException("Veiculo nao encontrado");
        }
        return historicoStatusVeiculoRepository.findByVeiculoIdOrderByDataHoraDesc(veiculoId).stream()
                .map(h -> new HistoricoStatusVeiculoResponse(
                        h.getId(),
                        h.getVeiculo().getId(),
                        h.getVeiculo().getPlaca(),
                        h.getStatusAnterior(),
                        h.getStatusNovo(),
                        h.getAdministrador().getId(),
                        h.getAdministrador().getNome(),
                        h.getDataHora()
                ))
                .toList();
    }

    @Transactional
    public void excluir(Long id) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        if (checklistRepository.existsByVeiculoId(id)) {
            throw new BusinessException("Nao e possivel excluir veiculo com checklists vinculados");
        }
        registroViagemVeiculoRepository.deleteByVeiculoId(id);
        registroUsoExternoVeiculoRepository.deleteByVeiculoId(id);
        historicoStatusVeiculoRepository.deleteByVeiculoId(id);
        veiculoRepository.delete(veiculo);
    }

    @Transactional
    public void excluirDefinitivamente(Long id, Long administradorId, String senhaAdmin, String justificativa) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administradores podem excluir definitivamente");
        }
        if (!Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Desative o veiculo antes da exclusao definitiva");
        }
        if (senhaAdmin == null || senhaAdmin.isBlank() || !passwordEncoder.matches(senhaAdmin, administrador.getSenha())) {
            throw new BusinessException("Senha do administrador invalida");
        }
        if (justificativa == null || justificativa.trim().length() < 10) {
            throw new BusinessException("Justificativa obrigatoria com no minimo 10 caracteres");
        }

        VeiculoStatusSnapshot snapshot = veiculoStatusResolver.resolver(veiculo);
        if (snapshot.statusAutomatico().isDeslocamentoAtivo()) {
            throw new BusinessException("Nao e possivel excluir definitivamente um veiculo com missao em aberto");
        }

        long totalChecklists = checklistRepository.countByVeiculoId(id);
        long totalExcecoes = missaoExcecaoRepository.countByVeiculoId(id);
        Optional<Checklist> primeiroChecklist = checklistRepository.findTopByVeiculoIdOrderByDataHoraAscIdAsc(id);
        Optional<Checklist> ultimoChecklist = checklistRepository.findTopByVeiculoIdOrderByDataHoraDescIdDesc(id);

        AuditoriaExclusaoVeiculo auditoria = new AuditoriaExclusaoVeiculo();
        auditoria.setVeiculoIdOriginal(veiculo.getId());
        auditoria.setPlaca(veiculo.getPlaca());
        auditoria.setModelo(veiculo.getModelo());
        auditoria.setMarca(veiculo.getMarca());
        auditoria.setDesativado(Boolean.TRUE.equals(veiculo.getDesativado()));
        auditoria.setStatusAdministrativo(veiculo.getStatusAdministrativo() != null ? veiculo.getStatusAdministrativo().name() : null);
        auditoria.setTotalChecklists(totalChecklists);
        auditoria.setDataPrimeiroChecklist(primeiroChecklist.map(Checklist::getDataHora).orElse(null));
        auditoria.setDataUltimoChecklist(ultimoChecklist.map(Checklist::getDataHora).orElse(null));
        auditoria.setTotalExcecoes(totalExcecoes);
        auditoria.setAdministrador(administrador);
        auditoria.setJustificativa(justificativa.trim());
        auditoriaExclusaoVeiculoRepository.save(auditoria);

        missaoExcecaoRepository.deleteAll(missaoExcecaoRepository.findByVeiculoId(id));
        checklistRepository.deleteAll(checklistRepository.findByVeiculoId(id));
        registroViagemVeiculoRepository.deleteByVeiculoId(id);
        registroUsoExternoVeiculoRepository.deleteByVeiculoId(id);
        historicoStatusVeiculoRepository.deleteByVeiculoId(id);
        veiculoRepository.delete(veiculo);
    }

    private String normalizarPlaca(String placa) {
        return placa == null ? "" : placa.replace("-", "").trim().toUpperCase(Locale.ROOT);
    }

    private VeiculoResponse toResponse(Veiculo veiculo) {
        Map<StatusVeiculo, String> rotulos = configuracaoRotuloStatusVeiculoService.mapaRotulosAtuais();
        return toResponse(
                veiculo,
                veiculoStatusResolver.resolver(veiculo),
                rotulos,
                registroViagemVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(veiculo.getId()).orElse(null),
                registroUsoExternoVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(veiculo.getId()).orElse(null)
        );
    }

    private VeiculoResponse toResponse(
            Veiculo veiculo,
            VeiculoStatusSnapshot snapshot,
            Map<StatusVeiculo, String> rotulos,
            RegistroViagemVeiculo viagemAtiva,
            RegistroUsoExternoVeiculo usoExternoAtivo
    ) {
        String statusAtualRotulo = rotulos.getOrDefault(snapshot.statusAtual(), snapshot.statusAtual().name());
        String statusAutomaticoRotulo = rotulos.getOrDefault(snapshot.statusAutomatico(), snapshot.statusAutomatico().name());
        String statusAdministrativoRotulo = snapshot.statusAdministrativo() == null
                ? null
                : rotulos.getOrDefault(snapshot.statusAdministrativo(), snapshot.statusAdministrativo().name());

        return new VeiculoResponse(
                veiculo.getId(),
                veiculo.getPlaca(),
                veiculo.getModelo(),
                veiculo.getMarca(),
                Boolean.TRUE.equals(veiculo.getDesativado()),
                snapshot.statusAtual(),
                snapshot.statusAutomatico(),
                snapshot.statusAdministrativo(),
                snapshot.motoristaAtualId(),
                snapshot.motoristaAtualNome(),
                statusAtualRotulo,
                statusAutomaticoRotulo,
                statusAdministrativoRotulo,
                viagemAtiva != null ? viagemAtiva.getId() : null,
                viagemAtiva != null ? viagemAtiva.getMotorista().getId() : null,
                viagemAtiva != null ? viagemAtiva.getMotorista().getNome() : null,
                viagemAtiva != null ? viagemAtiva.getLocalDestino() : null,
                viagemAtiva != null ? viagemAtiva.getObservacao() : null,
                viagemAtiva != null ? viagemAtiva.getDataHoraSaida() : null,
                usoExternoAtivo != null ? usoExternoAtivo.getId() : null,
                usoExternoAtivo != null ? usoExternoAtivo.getNomeEntreguePara() : null,
                usoExternoAtivo != null ? usoExternoAtivo.getObservacaoSaida() : null,
                usoExternoAtivo != null ? usoExternoAtivo.getDataHoraSaida() : null
        );
    }

    private Motorista validarAdministrador(Long administradorId) {
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administradores podem alterar dados do veiculo");
        }
        return administrador;
    }

    private void registrarHistoricoStatus(
            Veiculo veiculo,
            Motorista administrador,
            StatusVeiculo statusAnterior,
            StatusVeiculo statusNovo
    ) {
        HistoricoStatusVeiculo historico = new HistoricoStatusVeiculo();
        historico.setVeiculo(veiculo);
        historico.setAdministrador(administrador);
        historico.setStatusAnterior(statusAnterior);
        historico.setStatusNovo(statusNovo);
        historicoStatusVeiculoRepository.save(historico);
    }

    private void encerrarViagemAtivaSeNecessario(
            Veiculo veiculo,
            StatusVeiculo statusAnterior,
            StatusVeiculo statusNovo,
            Motorista administrador
    ) {
        if (statusAnterior != StatusVeiculo.EM_VIAGEM || statusNovo == StatusVeiculo.EM_VIAGEM) {
            return;
        }
        registroViagemVeiculoRepository
                .findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(veiculo.getId())
                .ifPresent(viagem -> {
                    viagem.setDataHoraRetorno(java.time.LocalDateTime.now());
                    viagem.setAdministradorEncerramento(administrador);
                    registroViagemVeiculoRepository.save(viagem);
                });
    }

    private Map<Long, RegistroViagemVeiculo> carregarViagensAtivasPorVeiculo(List<Veiculo> veiculos) {
        if (veiculos.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = veiculos.stream().map(Veiculo::getId).toList();
        Map<Long, RegistroViagemVeiculo> viagens = new java.util.HashMap<>();
        registroViagemVeiculoRepository.findByVeiculoIdInAndDataHoraRetornoIsNull(ids)
                .forEach(viagem -> viagens.put(viagem.getVeiculo().getId(), viagem));
        return viagens;
    }

    private Map<Long, RegistroUsoExternoVeiculo> carregarUsosExternosAtivosPorVeiculo(List<Veiculo> veiculos) {
        if (veiculos.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = veiculos.stream().map(Veiculo::getId).toList();
        Map<Long, RegistroUsoExternoVeiculo> usosExternos = new java.util.HashMap<>();
        registroUsoExternoVeiculoRepository.findByVeiculoIdInAndDataHoraRetornoIsNull(ids)
                .forEach(registro -> usosExternos.put(registro.getVeiculo().getId(), registro));
        return usosExternos;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
