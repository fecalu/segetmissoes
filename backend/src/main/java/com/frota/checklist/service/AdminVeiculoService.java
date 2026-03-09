package com.frota.checklist.service;

import com.frota.checklist.dto.AdminVeiculoRequest;
import com.frota.checklist.entity.AuditoriaExclusaoVeiculo;
import com.frota.checklist.dto.HistoricoStatusVeiculoResponse;
import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.HistoricoStatusVeiculo;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.AuditoriaExclusaoVeiculoRepository;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.HistoricoStatusVeiculoRepository;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import com.frota.checklist.repository.MotoristaRepository;
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
    private final AuditoriaExclusaoVeiculoRepository auditoriaExclusaoVeiculoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;
    private final PasswordEncoder passwordEncoder;

    public List<VeiculoResponse> listar(String buscaPlaca) {
        String filtro = buscaPlaca == null ? "" : normalizarPlaca(buscaPlaca);
        List<Veiculo> veiculos = veiculoRepository.findAll(Sort.by(Sort.Direction.ASC, "placa")).stream()
                .filter(v -> filtro.isBlank() || normalizarPlaca(v.getPlaca()).contains(filtro))
                .toList();
        Map<Long, VeiculoStatusSnapshot> snapshots = veiculoStatusResolver.resolverPorVeiculos(veiculos);
        return veiculos.stream()
                .map(v -> toResponse(v, snapshots.get(v.getId())))
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
        veiculo.setStatusAdministrativo(null);

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
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administradores podem desativar veiculo");
        }
        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            return toResponse(veiculo);
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        if (snapshotAntes.statusAutomatico() == StatusVeiculo.CIRCULANDO) {
            throw new BusinessException("Nao e possivel desativar veiculo em missao. Registre a chegada primeiro");
        }

        veiculo.setDesativado(true);
        veiculo.setStatusAdministrativo(StatusVeiculo.BLOQUEADO);
        Veiculo salvo = veiculoRepository.save(veiculo);

        HistoricoStatusVeiculo historico = new HistoricoStatusVeiculo();
        historico.setVeiculo(salvo);
        historico.setAdministrador(administrador);
        historico.setStatusAnterior(snapshotAntes.statusAtual());
        historico.setStatusNovo(StatusVeiculo.BLOQUEADO);
        historicoStatusVeiculoRepository.save(historico);

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse reativar(Long id, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administradores podem reativar veiculo");
        }
        if (!Boolean.TRUE.equals(veiculo.getDesativado())) {
            return toResponse(veiculo);
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        veiculo.setDesativado(false);
        veiculo.setStatusAdministrativo(null);
        Veiculo salvo = veiculoRepository.save(veiculo);
        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);

        HistoricoStatusVeiculo historico = new HistoricoStatusVeiculo();
        historico.setVeiculo(salvo);
        historico.setAdministrador(administrador);
        historico.setStatusAnterior(snapshotAntes.statusAtual());
        historico.setStatusNovo(snapshotDepois.statusAtual());
        historicoStatusVeiculoRepository.save(historico);

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse atualizarStatusAdministrativo(Long id, StatusVeiculo novoStatusAdministrativo, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administradores podem alterar status administrativo");
        }

        StatusVeiculo novoStatusNormalizado = StatusVeiculo.normalizarStatusAdministrativo(novoStatusAdministrativo);
        if (novoStatusAdministrativo != null && novoStatusNormalizado == null) {
            throw new BusinessException("Status administrativo invalido");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        if (snapshotAntes.statusAdministrativo() == novoStatusNormalizado) {
            return toResponse(veiculo);
        }

        veiculo.setStatusAdministrativo(novoStatusNormalizado);
        Veiculo salvo = veiculoRepository.save(veiculo);

        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);

        HistoricoStatusVeiculo historico = new HistoricoStatusVeiculo();
        historico.setVeiculo(salvo);
        historico.setAdministrador(administrador);
        historico.setStatusAnterior(snapshotAntes.statusAtual());
        historico.setStatusNovo(snapshotDepois.statusAtual());
        historicoStatusVeiculoRepository.save(historico);

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
        if (snapshot.statusAutomatico() == StatusVeiculo.CIRCULANDO) {
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
        historicoStatusVeiculoRepository.deleteByVeiculoId(id);
        veiculoRepository.delete(veiculo);
    }

    private String normalizarPlaca(String placa) {
        return placa == null ? "" : placa.replace("-", "").trim().toUpperCase(Locale.ROOT);
    }

    private VeiculoResponse toResponse(Veiculo veiculo) {
        return toResponse(veiculo, veiculoStatusResolver.resolver(veiculo));
    }

    private VeiculoResponse toResponse(Veiculo veiculo, VeiculoStatusSnapshot snapshot) {
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
                snapshot.motoristaAtualNome()
        );
    }
}
