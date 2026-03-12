package com.frota.checklist.service;

import com.frota.checklist.dto.CriarVistoriaCompletaRequest;
import com.frota.checklist.dto.VistoriaCompletaResponse;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.ResultadoVistoriaCompleta;
import com.frota.checklist.entity.StatusItemVistoriaCompleta;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoFotoVistoriaCompleta;
import com.frota.checklist.entity.TipoItemObrigatorioVistoriaCompleta;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.entity.VistoriaCompleta;
import com.frota.checklist.entity.VistoriaCompletaAvaria;
import com.frota.checklist.entity.VistoriaCompletaFoto;
import com.frota.checklist.entity.VistoriaCompletaItem;
import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.VeiculoRepository;
import com.frota.checklist.repository.VistoriaCompletaRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VistoriaCompletaService {

    private final VistoriaCompletaRepository vistoriaCompletaRepository;
    private final MotoristaRepository motoristaRepository;
    private final VeiculoRepository veiculoRepository;
    private final FileStorageService fileStorageService;
    private final VistoriaCompletaResponseMapper responseMapper;
    private final MissaoService missaoService;
    private final MissaoExcecaoService missaoExcecaoService;

    @Transactional
    public VistoriaCompletaResponse criar(
            Long motoristaId,
            CriarVistoriaCompletaRequest request,
            MultipartFile fotoFrente,
            MultipartFile fotoLateralEsq,
            MultipartFile fotoLateralDir,
            MultipartFile fotoTraseira,
            MultipartFile fotoPainel,
            MultipartFile fotoEstepe,
            List<MultipartFile> fotosAvarias
    ) {
        validarRequest(request, fotosAvarias);

        Motorista motorista = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));
        Veiculo veiculo = veiculoRepository.findById(request.veiculoId())
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));

        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode receber vistoria completa");
        }

        LocalDateTime dataHoraVistoria = LocalDateTime.now();
        validarEEncerrarFluxosAtivos(request, motorista, veiculo, dataHoraVistoria);

        VistoriaCompleta vistoria = new VistoriaCompleta();
        vistoria.setMotorista(motorista);
        vistoria.setVeiculo(veiculo);
        vistoria.setDataHora(dataHoraVistoria);
        vistoria.setTipoOperacao(request.tipoOperacao());
        vistoria.setQuilometragem(request.quilometragem());
        vistoria.setLocalizacao(trimToNull(request.localizacao()));
        vistoria.setObservacaoGeral(trimToNull(request.observacaoGeral()));
        vistoria.setResultado(request.resultado());

        adicionarItens(vistoria, request.itens());
        adicionarFotosPrincipais(vistoria, motoristaId, fotoFrente, fotoLateralEsq, fotoLateralDir, fotoTraseira, fotoPainel, fotoEstepe);
        adicionarAvarias(vistoria, motoristaId, request.avarias(), fotosAvarias);

        VistoriaCompleta salva = vistoriaCompletaRepository.save(vistoria);

        veiculo.setStatusAdministrativo(
                request.tipoOperacao() == TipoOperacao.SAIDA
                        ? StatusVeiculo.EM_USO_EXTERNO
                        : StatusVeiculo.AGUARDANDO_REALOCACAO
        );
        veiculoRepository.save(veiculo);

        return responseMapper.toResponse(salva);
    }

    private void validarEEncerrarFluxosAtivos(
            CriarVistoriaCompletaRequest request,
            Motorista motorista,
            Veiculo veiculo,
            LocalDateTime dataHoraVistoria
    ) {
        if (request.tipoOperacao() != TipoOperacao.SAIDA) {
            return;
        }

        Optional<Missao> missaoAtivaOpt = missaoService.buscarMissaoAtivaPorVeiculo(veiculo.getId());
        Optional<MissaoExcecao> excecaoAbertaOpt = missaoExcecaoService.buscarMissaoAbertaPorVeiculo(veiculo.getId());

        if (missaoAtivaOpt.isPresent()) {
            Missao missaoAtiva = missaoAtivaOpt.get();
            if (!missaoAtiva.getMotorista().getId().equals(motorista.getId())) {
                throw new BusinessException(
                        "Este veiculo esta em missao com %s. Finalize essa missao antes de registrar a vistoria completa."
                                .formatted(missaoAtiva.getMotorista().getNome())
                );
            }
        }

        if (excecaoAbertaOpt.isPresent()) {
            MissaoExcecao excecaoAberta = excecaoAbertaOpt.get();
            if (!excecaoAberta.getMotorista().getId().equals(motorista.getId())) {
                throw new BusinessException(
                        "Este veiculo esta em missao com %s. Finalize essa missao antes de registrar a vistoria completa."
                                .formatted(excecaoAberta.getMotorista().getNome())
                );
            }
        }

        if (missaoAtivaOpt.isEmpty() && excecaoAbertaOpt.isEmpty()) {
            return;
        }

        if (!Boolean.TRUE.equals(request.encerrarMissaoAtivaVeiculo())) {
            throw new BusinessException("Confirme o encerramento da missao ativa para continuar com a vistoria completa.");
        }

        missaoAtivaOpt.ifPresent(missaoAtiva ->
                missaoService.encerrarParaVistoriaCompleta(missaoAtiva, motorista, dataHoraVistoria)
        );
        excecaoAbertaOpt.ifPresent(excecaoAberta ->
                missaoExcecaoService.regularizarPorVistoriaCompleta(excecaoAberta, motorista, dataHoraVistoria)
        );
    }

    private void validarRequest(CriarVistoriaCompletaRequest request, List<MultipartFile> fotosAvarias) {
        if (request.resultado() == ResultadoVistoriaCompleta.REPROVADO && isBlank(request.observacaoGeral())) {
            throw new BusinessException("Explique na observacao geral por que a vistoria foi reprovada");
        }

        Set<TipoItemObrigatorioVistoriaCompleta> esperados = EnumSet.allOf(TipoItemObrigatorioVistoriaCompleta.class);
        Set<TipoItemObrigatorioVistoriaCompleta> recebidos = EnumSet.noneOf(TipoItemObrigatorioVistoriaCompleta.class);

        if (request.itens().size() != esperados.size()) {
            throw new BusinessException("Todos os itens obrigatorios da vistoria devem ser enviados uma unica vez");
        }

        for (CriarVistoriaCompletaRequest.ItemRequest item : request.itens()) {
            recebidos.add(item.tipoItem());
            if (item.status() == StatusItemVistoriaCompleta.FALTANDO && isBlank(item.observacao())) {
                throw new BusinessException("Explique o item obrigatorio marcado como faltando");
            }
        }

        if (!recebidos.equals(esperados)) {
            throw new BusinessException("Todos os itens obrigatorios da vistoria devem ser enviados");
        }

        List<CriarVistoriaCompletaRequest.AvariaRequest> avarias = request.avarias() == null
                ? List.of()
                : request.avarias();
        List<MultipartFile> arquivosAvarias = fotosAvarias == null ? List.of() : fotosAvarias;

        if (avarias.size() != arquivosAvarias.size()) {
            throw new BusinessException("Cada avaria deve possuir exatamente uma foto");
        }
    }

    private void adicionarItens(VistoriaCompleta vistoria, List<CriarVistoriaCompletaRequest.ItemRequest> itens) {
        itens.stream()
                .sorted(Comparator.comparing(CriarVistoriaCompletaRequest.ItemRequest::tipoItem))
                .forEach(itemRequest -> {
                    VistoriaCompletaItem item = new VistoriaCompletaItem();
                    item.setVistoria(vistoria);
                    item.setTipoItem(itemRequest.tipoItem());
                    item.setStatus(itemRequest.status());
                    item.setObservacao(itemRequest.status() == StatusItemVistoriaCompleta.FALTANDO
                            ? trimToNull(itemRequest.observacao())
                            : null);
                    vistoria.getItens().add(item);
                });
    }

    private void adicionarFotosPrincipais(
            VistoriaCompleta vistoria,
            Long motoristaId,
            MultipartFile fotoFrente,
            MultipartFile fotoLateralEsq,
            MultipartFile fotoLateralDir,
            MultipartFile fotoTraseira,
            MultipartFile fotoPainel,
            MultipartFile fotoEstepe
    ) {
        List<VistoriaFotoArquivo> arquivos = List.of(
                new VistoriaFotoArquivo(TipoFotoVistoriaCompleta.FRENTE, fotoFrente),
                new VistoriaFotoArquivo(TipoFotoVistoriaCompleta.LATERAL_ESQ, fotoLateralEsq),
                new VistoriaFotoArquivo(TipoFotoVistoriaCompleta.LATERAL_DIR, fotoLateralDir),
                new VistoriaFotoArquivo(TipoFotoVistoriaCompleta.TRASEIRA, fotoTraseira),
                new VistoriaFotoArquivo(TipoFotoVistoriaCompleta.PAINEL, fotoPainel),
                new VistoriaFotoArquivo(TipoFotoVistoriaCompleta.ESTEPE, fotoEstepe)
        );

        for (VistoriaFotoArquivo item : arquivos) {
            String caminho = fileStorageService.salvarFotoVistoriaCompleta(item.arquivo(), item.tipo().name(), motoristaId);
            VistoriaCompletaFoto foto = new VistoriaCompletaFoto();
            foto.setVistoria(vistoria);
            foto.setTipoFoto(item.tipo());
            foto.setCaminhoArquivo(caminho);
            vistoria.getFotos().add(foto);
        }
    }

    private void adicionarAvarias(
            VistoriaCompleta vistoria,
            Long motoristaId,
            List<CriarVistoriaCompletaRequest.AvariaRequest> avarias,
            List<MultipartFile> fotosAvarias
    ) {
        List<CriarVistoriaCompletaRequest.AvariaRequest> listaAvarias = avarias == null ? List.of() : avarias;
        List<MultipartFile> listaFotos = fotosAvarias == null ? List.of() : fotosAvarias;

        for (int i = 0; i < listaAvarias.size(); i++) {
            CriarVistoriaCompletaRequest.AvariaRequest request = listaAvarias.get(i);
            MultipartFile fotoArquivo = listaFotos.get(i);

            VistoriaCompletaAvaria avaria = new VistoriaCompletaAvaria();
            avaria.setVistoria(vistoria);
            avaria.setLocal(request.local().trim());
            avaria.setTipoAvaria(request.tipoAvaria());
            avaria.setDescricao(trimToNull(request.descricao()));
            avaria.setJaExistia(request.jaExistia());
            avaria.setCaminhoArquivoFoto(fileStorageService.salvarFotoVistoriaCompleta(
                    fotoArquivo,
                    "AVARIA_" + (i + 1),
                    motoristaId
            ));
            vistoria.getAvarias().add(avaria);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record VistoriaFotoArquivo(TipoFotoVistoriaCompleta tipo, MultipartFile arquivo) {}
}
