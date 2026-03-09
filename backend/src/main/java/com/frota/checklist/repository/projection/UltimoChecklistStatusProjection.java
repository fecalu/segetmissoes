package com.frota.checklist.repository.projection;

import java.time.LocalDateTime;

public interface UltimoChecklistStatusProjection {
    Long getVeiculoId();
    String getTipoOperacao();
    Long getMotoristaId();
    String getMotoristaNome();
    LocalDateTime getDataHora();
}

