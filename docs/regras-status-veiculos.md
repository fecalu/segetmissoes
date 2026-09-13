# Regras de status dos veículos

Este documento descreve como os status dos veículos funcionam no sistema SEGET Missões.

## Onde essa regra aparece no sistema

A regra de status aparece principalmente em:

- Administração > Operação Frota
- Motorista > Iniciar Missão > Seleção de veículo

## Objetivo da regra

Permitir que a administração saiba rapidamente quais veículos estão disponíveis, em uso, bloqueados ou aguardando alguma ação.

Também evita que o motorista inicie missão com veículo que não deveria sair.

## Tipos de status

O sistema trabalha com dois grupos de status:

- Status automático
- Status administrativo

## Status automático

Status automático é calculado pelo próprio sistema a partir das missões.

### BASE JOÃO GOULART

Indica que o veículo está disponível para uso normal.

Quando acontece:

- O veículo ainda não iniciou missão.
- Ou a última missão foi finalizada corretamente.
- Ou o veículo foi liberado administrativamente para voltar à base.

Motorista pode iniciar missão?

Sim.

### CIRCULANDO / NA RUA EM MISSÃO

Indica que o veículo está em missão.

Quando acontece:

- O motorista iniciou uma missão com o veículo.
- A missão ainda não foi finalizada.

Motorista pode iniciar nova missão com esse veículo?

Não.

## Status administrativo

Status administrativo é definido manualmente pelo administrador.

Esse tipo de status sobrescreve o status automático.

### NO PÁTIO

Indica que o veículo está parado no pátio, mas pode ser usado em missão se a administração permitir.

Motorista pode iniciar missão?

Sim.

### OFICINA

Indica que o veículo está em oficina.

Motorista pode iniciar missão?

Não.

### MANUTENÇÃO

Indica que o veículo está em manutenção preventiva ou corretiva.

Motorista pode iniciar missão?

Não.

### BLOQUEADO

Indica que o veículo está impedido de sair.

Motorista pode iniciar missão?

Não.

### EM VIAGEM

Indica que o veículo está fora da base em deslocamento mais longo ou sob responsabilidade externa.

Motorista pode iniciar missão?

Não pelo fluxo normal de missão.

### AGUARDANDO REALOCAÇÃO

Indica que o veículo foi recebido ou retornou de alguma situação externa, mas ainda precisa ser realocado pela administração.

Motorista pode iniciar missão?

Não, até que o administrador defina o destino operacional correto.

## Regras principais

- Um veículo em missão não pode iniciar outra missão ao mesmo tempo.
- Um motorista com missão em andamento não pode iniciar outra missão antes de finalizar a atual.
- Veículos em oficina, manutenção, bloqueados, em viagem ou aguardando realocação não podem ser escolhidos pelo motorista no fluxo normal.
- Veículos disponíveis e veículos no pátio podem ser escolhidos pelo motorista.
- Mudanças manuais feitas pelo administrador devem ficar registradas em histórico.

## Mudança de status ao iniciar missão

Quando o motorista inicia uma missão com checklist ou sem checklist:

- A missão é criada.
- O veículo passa para Na rua em missão.
- O motorista fica associado à missão ativa.

## Mudança de status ao finalizar missão

Quando o motorista finaliza a missão com checklist ou sem checklist:

- A missão recebe horário de chegada.
- A missão passa para finalizada.
- O veículo deixa de estar em missão.
- O status seguinte deve respeitar a regra administrativa definida para o caso.

## Observação sobre checklist completo

O checklist completo é uma funcionalidade futura para situações como:

- Entrega de veículo para pessoa externa.
- Recebimento de veículo novo.
- Recebimento de veículo que voltou de oficina.
- Recebimento de veículo que voltou de viagem.

Esse fluxo deve ajudar a administração a conferir o veículo antes de liberá-lo novamente para uso.