# Regras de alocacoes administrativas

Este documento define a regra de negocio proposta para o modulo de alocacoes
administrativas.

O objetivo e separar a vaga administrativa do veiculo que ocupa essa vaga.

## Problema atual

Hoje o registro de alocacao mistura informacoes de naturezas diferentes:

- orgao
- setor
- limite autorizado
- documento de referencia
- veiculo
- responsavel atual

Na pratica, isso faz parecer que a vaga so existe enquanto existe um veiculo
ocupando ela.

Quando o veiculo sai, a vaga fica confusa ou desaparece junto com ele. Com isso,
o setor perde a nocao de quantas vagas estavam autorizadas para cada orgao,
secretaria ou setor.

## Conceito correto

A vaga administrativa pertence ao orgao/setor.

O veiculo apenas ocupa a vaga por um periodo.

Portanto, o sistema deve separar:

- Vaga administrativa: capacidade autorizada para um orgao/setor.
- Ocupacao da vaga: veiculo e responsavel que estao usando aquela vaga no momento.

## Vaga administrativa

A vaga representa uma autorizacao ou controle institucional.

Campos sugeridos:

- numero da vaga
- orgao
- setor
- limite autorizado
- documento de referencia
- observacao
- status da vaga
- data de criacao
- data de encerramento, se a vaga for desativada

Status sugeridos:

- LIVRE
- OCUPADA
- DESATIVADA

Exemplo:

```text
Vaga 001
Orgao: CASA CIVIL
Setor: SEGET
Limite autorizado: 1.000,00
Status: LIVRE
```

## Ocupacao da vaga

A ocupacao representa o uso atual de uma vaga por um veiculo e um responsavel.

Campos sugeridos:

- vaga administrativa
- placa
- modelo
- marca
- responsavel atual
- link de consulta
- data de inicio da ocupacao
- data de fim da ocupacao
- ativa

Exemplo de vaga ocupada:

```text
Vaga 001
Orgao: CASA CIVIL
Setor: SEGET
Status: OCUPADA
Veiculo: SMT0A08
Responsavel: Joao
```

Quando o veiculo sai, a ocupacao e encerrada, mas a vaga continua existindo:

```text
Vaga 001
Orgao: CASA CIVIL
Setor: SEGET
Status: LIVRE
Veiculo: -
Responsavel: -
```

## Criacao de nova alocacao

O fluxo recomendado nao deve comecar pelo veiculo.

Primeiro o administrador deve informar onde a alocacao vai entrar:

1. Orgao.
2. Setor.
3. Vaga.

Se existir vaga livre, o sistema deve permitir ocupar a vaga existente.

Se nao existir vaga livre, o sistema deve permitir criar uma nova vaga e, em
seguida, ocupar essa vaga.

Fluxo proposto:

```text
Nova alocacao
-> escolher orgao e setor
-> selecionar vaga livre ou criar nova vaga
-> informar veiculo e responsavel
-> salvar ocupacao
```

## Regras principais

- Uma vaga pode existir sem veiculo.
- Uma vaga pode existir sem responsavel.
- Uma vaga livre continua contando para o total autorizado do setor.
- Uma vaga ocupada deve ter veiculo e responsavel atual.
- Encerrar a ocupacao nao deve apagar a vaga.
- Desativar uma vaga deve ser uma acao administrativa consciente.
- O limite autorizado pertence preferencialmente a vaga, nao ao veiculo.
- O documento de referencia pertence preferencialmente a vaga.
- O link de consulta pertence preferencialmente ao veiculo/ocupacao.

## Indicadores importantes

O modulo deve permitir visualizar por orgao e setor:

- total de vagas
- vagas ocupadas
- vagas livres
- vagas desativadas
- responsaveis atuais
- veiculos atuais

Exemplo:

```text
CASA CIVIL / SEGET
Total de vagas: 10
Ocupadas: 8
Livres: 2
Desativadas: 0
```

## Historico recomendado

O historico deve registrar eventos da vaga e da ocupacao.

Eventos sugeridos:

- vaga criada
- vaga editada
- vaga desativada
- vaga reativada
- vaga ocupada
- veiculo trocado
- responsavel trocado
- ocupacao encerrada

Esse historico deve responder perguntas como:

- Qual veiculo ocupava essa vaga antes?
- Quem era o responsavel anterior?
- Quando o veiculo saiu?
- Quando a vaga ficou livre?
- Quem fez a alteracao?

## Migracao do modelo atual

Cada registro atual de `controle_alocacoes` deve virar:

- uma vaga administrativa
- uma ocupacao ativa, se o registro estiver ativo

Exemplo:

Registro atual:

```text
CASA CIVIL | SEGET | SMT0A08 | Joao | 1.000,00
```

Novo modelo:

```text
Vaga 001
Orgao: CASA CIVIL
Setor: SEGET
Limite: 1.000,00
Status: OCUPADA

Ocupacao atual
Veiculo: SMT0A08
Responsavel: Joao
```

Se o registro atual estiver inativo, ele pode virar:

```text
Vaga 001
Status: LIVRE
```

Essa decisao precisa ser validada antes da migracao, porque um registro inativo
pode representar uma vaga encerrada ou apenas uma vaga livre.

## Decisoes pendentes

Antes de implementar, precisamos decidir:

- O numero da vaga sera manual ou automatico?
- O numero da vaga sera unico globalmente ou unico dentro de cada orgao/setor?
- Um registro inativo atual vira vaga livre ou vaga desativada?
- O limite autorizado pode mudar com o tempo?
- O documento de referencia pode mudar com o tempo?
- Uma vaga pode mudar de setor ou isso deve gerar uma nova vaga?
- A ocupacao exige sempre responsavel ou pode existir veiculo sem responsavel?

## Principio da regra

A vaga representa a capacidade administrativa autorizada.

O veiculo representa apenas a ocupacao temporaria dessa capacidade.

Por isso, o veiculo pode sair, mas a vaga nao deve desaparecer.

