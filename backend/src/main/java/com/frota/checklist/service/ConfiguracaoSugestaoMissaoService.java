package com.frota.checklist.service;

import com.frota.checklist.dto.SugestoesCamposMissaoResponse;
import com.frota.checklist.entity.CampoSugestaoMissao;
import com.frota.checklist.entity.ConfiguracaoSugestaoMissao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.ConfiguracaoSugestaoMissaoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ConfiguracaoSugestaoMissaoService {

    private final ConfiguracaoSugestaoMissaoRepository configuracaoRepository;
    private final MotoristaRepository motoristaRepository;

    @Transactional(readOnly = true)
    public SugestoesCamposMissaoResponse listar() {
        List<ConfiguracaoSugestaoMissao> configuracoes = configuracaoRepository.findAllByOrderByCampoAscValorAsc();
        return new SugestoesCamposMissaoResponse(
                valoresDoCampo(configuracoes, CampoSugestaoMissao.DESTINO),
                valoresDoCampo(configuracoes, CampoSugestaoMissao.SETOR_SOLICITANTE),
                valoresDoCampo(configuracoes, CampoSugestaoMissao.SOLICITANTE),
                valoresDoCampo(configuracoes, CampoSugestaoMissao.JUSTIFICATIVA_REGISTRO_MANUAL)
        );
    }

    @Transactional
    public SugestoesCamposMissaoResponse salvar(
            Long administradorId,
            List<String> destinos,
            List<String> setoresSolicitantes,
            List<String> solicitantes,
            List<String> justificativasRegistroManual
    ) {
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administrador pode alterar sugestoes de missao");
        }

        substituirCampo(CampoSugestaoMissao.DESTINO, normalizarLista(destinos, 180, "Destino"), administrador);
        substituirCampo(CampoSugestaoMissao.SETOR_SOLICITANTE, normalizarLista(setoresSolicitantes, 160, "Setor solicitante"), administrador);
        substituirCampo(CampoSugestaoMissao.SOLICITANTE, normalizarLista(solicitantes, 160, "Quem solicitou"), administrador);
        substituirCampo(
                CampoSugestaoMissao.JUSTIFICATIVA_REGISTRO_MANUAL,
                normalizarLista(justificativasRegistroManual, 700, "Justificativa do registro manual"),
                administrador
        );

        return listar();
    }

    private List<String> valoresDoCampo(List<ConfiguracaoSugestaoMissao> configuracoes, CampoSugestaoMissao campo) {
        return configuracoes.stream()
                .filter(item -> item.getCampo() == campo)
                .map(ConfiguracaoSugestaoMissao::getValor)
                .toList();
    }

    private void substituirCampo(
            CampoSugestaoMissao campo,
            List<String> valores,
            Motorista administrador
    ) {
        configuracaoRepository.deleteByCampo(campo);
        for (String valor : valores) {
            ConfiguracaoSugestaoMissao configuracao = new ConfiguracaoSugestaoMissao();
            configuracao.setCampo(campo);
            configuracao.setValor(valor);
            configuracao.setAtualizadoPor(administrador);
            configuracaoRepository.save(configuracao);
        }
    }

    private List<String> normalizarLista(List<String> valores, int tamanhoMaximo, String nomeCampo) {
        if (valores == null || valores.isEmpty()) {
            return List.of();
        }

        Map<String, String> unicos = new LinkedHashMap<>();
        for (String valor : valores) {
            String normalizado = valor == null ? "" : valor.trim();
            if (normalizado.isBlank()) {
                continue;
            }
            if (normalizado.length() > tamanhoMaximo) {
                throw new BusinessException("%s deve ter no maximo %d caracteres".formatted(nomeCampo, tamanhoMaximo));
            }
            unicos.putIfAbsent(normalizado.toUpperCase(), normalizado);
        }

        List<String> resultado = new ArrayList<>(unicos.values());
        resultado.sort(Comparator.comparing(String::toUpperCase));
        return resultado;
    }
}
