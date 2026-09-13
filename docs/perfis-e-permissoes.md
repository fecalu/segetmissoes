# Perfis e permissoes

Data do levantamento: 2026-09-11.
Situacao: primeira implementacao local, seguindo a matriz abaixo.
O levantamento original foi preservado como contexto. Instrucoes de uso,
testes, migracao e limites estao em `docs/operar-perfis.md`.
Nao houve publicacao em producao nesta entrega.

## 1. Objetivo e perfis

Permitir que a equipe use a operacao diaria com uma interface simples, deixando
correcoes, liberacoes e administracao do sistema com as pessoas apropriadas.

Adotar quatro perfis, com um perfil por conta nesta primeira versao:

| Perfil | Codigo | Responsabilidade |
| --- | --- | --- |
| Administrador | `ADMIN` | Acesso administrativo completo, incluindo contas, perfis, configuracoes e exclusoes permitidas pelas regras atuais. |
| Gestor | `GESTOR` | Supervisionar a frota, manter cadastros operacionais e alocacoes, corrigir registros e resolver excecoes. |
| Operador | `OPERADOR` | Registrar saidas, retornos e dados da rotina, consultar a frota e seus registros. Nome explicativo na tela: Operador - operacoes basicas. |
| Motorista | `MOTORISTA` | Continuar usando o fluxo de campo existente, com as validacoes de motorista, veiculo e missao. |

O perfil de consulta separado fica fora desta primeira versao. Administrador,
Gestor e Operador utilizam a entrada administrativa existente, com menus e acoes
adequados ao perfil. Motorista continua com sua entrada atual.

Ter acesso completo ao administrativo nao dispensa as regras de negocio:
nenhum perfil pode produzir duas missoes ativas para o mesmo veiculo ou motorista,
inventar um checklist ou finalizar uma missao apenas alterando sua etiqueta.
Os perfis administrativos nao herdam automaticamente as permissoes do motorista
para enviar checklists como se fossem ele.

## 2. Situacao anterior, registrada no levantamento

| Ponto | Situacao encontrada | Consequencia para a implementacao |
| --- | --- | --- |
| Perfis | `Perfil.java` e `auth.model.ts` so possuem ADMIN e MOTORISTA. | Incluir GESTOR e OPERADOR nos contratos e validar compatibilidade com os dados existentes. |
| API administrativa | `SecurityConfig` exige ADMIN para todo `/api/admin/**`. | Separar permissoes por acao; abrir a rota administrativa sozinha nao resolve. |
| Regras nos services | Missoes, veiculos, excecoes, alocacoes e configuracoes tambem verificam `Perfil.ADMIN` diretamente. | Atualizar esses pontos com uma politica central, preservando as validacoes de negocio. |
| Identidade | A entidade `Motorista`, tabela `motoristas`, tambem armazena as contas administrativas. | Separar as operacoes de cadastro de motorista e gestao de acessos, sem reescrever as referencias historicas nesta entrega. |
| Edicao de contas | `AdminMotoristaRequest` permite alterar nome, CPF, login, senha e perfil juntos. | O Gestor nao pode receber acesso irrestrito a esse contrato. |
| Protecao de conta | A exclusao protege o login literal `admin`; a edicao atual pode alterar seu perfil. | Proteger o ultimo Administrador habilitado por identidade e perfil, inclusive contra alteracoes concorrentes. |
| Sessao | O filtro JWT consulta o usuario no banco em cada requisicao. O frontend guarda o perfil no navegador. | Preservar a consulta no backend e atualizar os dados de acesso da interface ao mudar o perfil. |
| Navegacao | Login e guard administrativo exigem ADMIN; paginas usam tambem `?menu=...`. | Proteger rotas, parametros de menu, componentes e acoes, alem de filtrar a barra lateral. |
| Dados de apoio | O quadro consulta motoristas, rotulos e sugestoes de preenchimento. | Permitir essas leituras sem conceder edicao de contas ou configuracoes. |
| Inicializacao | `DataInitializer` cria ou sobrescreve contas de demonstracao, incluindo senha e perfil, a cada inicio. | Isolar os dados de demonstracao e impedir que um reinicio desfaça a administracao de acessos. |
| Lembrar acesso | `AuthService` salva login e senha em texto no armazenamento do navegador. | Substituir a persistencia da senha e remover os valores antigos na atualizacao. |
| Fotografias | `/uploads/**` esta liberado sem autenticacao no `SecurityConfig`. | A restricao de menus nao protege os arquivos; planejar acesso autenticado antes de afirmar que a consulta de fotos depende do perfil. |
| Testes | Nao ha diretorio `backend/src/test`; o CI compila com `-DskipTests`. | Adicionar testes de autorizacao e executa-los no CI. Compilacao sozinha nao valida permissoes. |

Fontes principais: `backend/src/main/java/com/frota/checklist/config/SecurityConfig.java`,
`backend/src/main/java/com/frota/checklist/config/DataInitializer.java`,
`backend/src/main/java/com/frota/checklist/service/AdminMotoristaService.java`,
`backend/src/main/java/com/frota/checklist/security/JwtAuthenticationFilter.java`,
`frontend/src/app/core/services/auth.service.ts`, `frontend/src/app/app.routes.ts`
e `.github/workflows/ci.yml`.

## 3. Matriz funcional

Sim significa que as regras do registro, as confirmacoes e a auditoria continuam
valendo. As condicoes especificas do Operador sao detalhadas na secao seguinte.

| Acao administrativa | Administrador | Gestor | Operador | Motorista |
| --- | --- | --- | --- | --- |
| Consultar quadro, missoes e historicos operacionais | Sim | Sim | Sim | Somente o fluxo de campo atual |
| Registrar saida e retorno administrativos comuns | Sim | Sim | Sim, conforme origem e situacao | Pelo proprio fluxo |
| Registrar viagem, uso externo e seu retorno | Sim | Sim | Sim, conforme situacao | Pelo proprio fluxo existente |
| Preencher destino, setor e solicitante | Sim | Sim | Sim, com limites em registros finalizados | Nao |
| Corrigir motorista, veiculo ou horarios ja registrados | Sim, com justificativa | Sim, com justificativa | Nao | Nao |
| Criar contingencia ou encerrar excepcionalmente uma missao | Sim, com justificativa | Sim, com justificativa | Nao | Excecoes do proprio fluxo atual |
| Corrigir somente a situacao entre Disponivel e Patio | Sim | Sim | Sim, com confirmacao e motivo | Nao |
| Bloquear, desbloquear e autorizar liberacao apos oficina/manutencao | Sim | Sim | Nao | Nao |
| Consultar checklists, fotos e vistorias no administrativo | Sim | Sim | Sim | Somente recursos autorizados do proprio fluxo |
| Corrigir dados de contraparte de vistoria | Sim | Sim | Nao | Nao |
| Cadastrar e editar veiculos | Sim | Sim | Nao | Nao |
| Desativar e reativar veiculos | Sim | Sim, com justificativa | Nao | Nao |
| Cadastrar e editar motoristas | Sim | Apenas contas MOTORISTA | Nao | Nao |
| Definir ou redefinir credenciais de motorista | Sim | Apenas contas MOTORISTA | Nao | Nao |
| Administrar contas ADMIN, GESTOR e OPERADOR; alterar perfis | Sim | Nao | Nao | Nao |
| Excluir definitivamente cadastros | Sim, com protecoes | Nao | Nao | Nao |
| Consultar alocacoes e seu historico | Sim | Sim | Sim | Nao |
| Criar/editar alocacoes, trocar veiculo/responsavel e encerrar | Sim | Sim | Nao | Nao |
| Exportar relatorios operacionais existentes | Sim | Sim | Sim | Nao |
| Consultar estatisticas | Sim | Sim | Nao nesta versao | Nao |
| Alterar rotulos e sugestoes globais | Sim | Nao | Nao | Nao |
| Consultar auditoria de contas e permissoes | Sim | Nao | Nao | Nao |

As alocacoes continuam sendo um modulo independente: consultar ou editar uma
alocacao nao inicia missao, nao modifica a situacao de um veiculo da operacao
e nao cria uma conta para o responsavel informado naquele registro.

## 4. Limites da rotina do Operador

### Saidas, retornos e dados administrativos

- Pode registrar a rotina do setor, mesmo quando outro Operador registrou a
  saida. A permissao nao depende de ser o criador da missao.
- Pode registrar o retorno comum de uma missao com origem
  `REGISTRO_ADMINISTRATIVO`. O retorno de uma missao iniciada em outro dia
  continua permitido, com data/hora posterior a saida.
- Uma missao aberta pelo motorista, por checklist ou excecao, exige Gestor ou
  Administrador para o encerramento administrativo excepcional. O motorista
  continua podendo encerra-la pelo proprio fluxo.
- Pode informar o horario ocorrido ao registrar saida ou retorno. Depois de
  salvo, corrigir esse horario exige Gestor ou Administrador e justificativa.
- Pode editar destino, setor e solicitante enquanto a missao estiver ativa.
  Depois de finalizada, pode preencher campos ainda vazios; substituir ou
  apagar valores ja registrados exige Gestor ou Administrador e justificativa.
- As missoes e os veiculos visiveis abrangem a operacao do setor. Esta versao
  nao introduz restricao por secretaria, organizacao ou proprietario do registro.

### Arraste, botao de acoes e icone de inclusao

Todos os caminhos devem aplicar a mesma regra de permissao, usando a acao,
o estado atual, a origem da missao e o destino solicitado.

| Transicao ou intencao | Comportamento proposto para Operador |
| --- | --- |
| Disponivel ou Patio para Em missao/Em viagem | Registrar a saida, com motorista e horario; manter impedimentos existentes de veiculo ou motorista ocupado. |
| Disponivel para Patio, ou Patio para Disponivel | Oferecer as duas opcoes existentes: registrar deslocamento ou corrigir somente a situacao. Correcao exige motivo e auditoria. |
| Em missao para Disponivel ou Patio | Registrar retorno quando a origem permitir. Nunca apenas trocar o status. |
| Em viagem ou Em uso externo para retorno | Usar o retorno correspondente ao registro e preservar as regras de recebimento. Retorno de missao iniciada pelo motorista exige tratamento excepcional pelo Gestor. |
| Enviar veiculo para oficina/uso externo | Registrar a entrega ou o deslocamento correspondente, quando o veiculo estiver apto. Nao dar baixa silenciosamente em uma missao aberta. |
| Receber veiculo de oficina/manutencao/uso externo | Registrar o recebimento sem libera-lo automaticamente para nova missao; manter o fluxo de vistoria e a situacao de recebimento definida pelo sistema. |
| Aguardando realocacao para Disponivel, Patio ou nova missao | Exigir Gestor ou Administrador para autorizar a liberacao nesta proposta. O Operador ve a pendencia. |
| Entrar ou sair de Bloqueado; retirar restricao de oficina/manutencao | Exigir Gestor ou Administrador. Inclui bloqueio informado como destino de retorno. |
| Mudanca em veiculo desativado | Exigir reativacao autorizada antes das operacoes que a regra atual proibe. |

`AGUARDANDO_REALOCACAO` permite inicio administrativo para Administrador e Gestor.
A restricao adicional para Operador foi implementada no servidor e na interface.

Quando faltar permissao, o card permanece no painel de origem e a interface
explica a acao necessaria, por exemplo: "A liberacao deste veiculo precisa ser
feita por um Gestor ou Administrador." Nenhuma gravacao deve ocorrer antes da
validacao completa. O backend deve impedir tambem tentativas por outro endpoint,
como registrar retorno com destino bloqueado ou trocar o status diretamente.

## 5. Organizacao dos menus

Manter a ordem atual das secoes e ocultar grupos sem itens permitidos.

| Secao | Administrador | Gestor | Operador |
| --- | --- | --- | --- |
| Operacao diaria | Operacao da frota, Missoes, Vistorias | Os mesmos, com acoes autorizadas | Os mesmos, priorizando registrar saida e retorno |
| Controle administrativo | Cadastros de veiculos/motoristas e Relatorios/Estatisticas | Os mesmos, restrito a cadastros operacionais | Relatorios operacionais |
| Alocacoes | Consultar e administrar | Consultar e administrar | Consultar |
| Sistema | Usuarios e acessos; Configuracoes; Auditoria de acessos | Oculto | Oculto |

O cadastro de motoristas deixa de expor contas de outros perfis ao Gestor.
"Usuarios e acessos" concentra a administracao de todas as contas pelo ADMIN.
Ambas as telas podem usar a tabela existente, mas com contratos e controles
diferentes. Seletores de motorista da rotina recebem somente os dados necessarios
para selecionar motoristas, sem expor CPF, login ou contas administrativas.

Usar o perfil abaixo do nome da pessoa na area autenticada. Menus, formularios,
atalhos, exportacoes, arraste e botoes devem refletir as mesmas permissoes.
Um acesso direto a `/admin?menu=rotulos-status` ou a outra pagina restrita deve
mostrar uma mensagem clara e encaminhar para uma pagina permitida.

## 6. Desenho tecnico

### Politica central de autorizacao

Criar um catalogo de permissoes por acao no backend, atribuidas explicitamente
aos quatro perfis. Exemplos: `FROTA_CONSULTAR`, `MISSAO_REGISTRAR`,
`MISSAO_CORRIGIR`, `MISSAO_ENCERRAR_EXCECAO`, `VEICULO_LIBERAR`,
`ALOCACAO_CONSULTAR`, `ALOCACAO_GERIR`, `MOTORISTA_GERIR`,
`ACESSO_GERIR` e `CONFIGURACAO_GERIR`.

Evitar uma hierarquia global que conceda ao ADMIN as operacoes de identidade
do MOTORISTA. O ADMIN recebe todas as permissoes administrativas explicitamente.
Novas acoes precisam declarar a permissao necessaria; nao usar apenas
"qualquer perfil administrativo pode gravar" como regra residual.

Aplicar autorizacao na API e nos services de escrita. A checagem contextual
deve ocorrer antes de gravar, dentro da transacao, considerando tambem o registro
alvo. Os metodos internos devem compartilhar essa politica: chamadas dentro de
um mesmo service nao podem depender exclusivamente de anotacoes de rota.

Retornar 401 para ausencia de autenticacao e 403 para falta de permissao,
com mensagem apropriada. Adequar `GlobalExceptionHandler` e os handlers da
cadeia de seguranca para que uma negativa nao vire "Erro interno".

### Mapeamento inicial de API

| Familia atual | Separacao necessaria |
| --- | --- |
| `/api/admin/missoes` | Consulta; registro/retorno comum; complemento documental; correcao de horario/edicao manual; contingencia/encerramento excepcional. |
| `/api/admin/missoes/excecoes` | Consulta para equipe administrativa; encerramento para ADMIN/GESTOR. |
| `/api/admin/veiculos` | Consulta; cadastro; transicoes de rotina; bloqueio/liberacao; desativacao/reativacao; exclusao. Validar tambem os destinos de retorno e os registros de viagem/uso externo. |
| `/api/admin/motoristas` | Gestao exclusiva de MOTORISTA para Gestor, verificando perfil atual do alvo e rejeitando mudanca de perfil; separar dos poderes de gestao de contas. |
| Novo `/api/admin/motoristas/opcoes` | Leitura minima para selecao operacional pelos tres perfis administrativos, sem acesso ao cadastro completo. |
| Novo `/api/admin/usuarios` | Gestao de acessos exclusiva do ADMIN. Nenhum endpoint alternativo pode permitir a mesma alteracao sem a checagem. |
| `/api/admin/checklists` e `/api/admin/vistorias-completas` | Consulta administrativa; alteracao de contraparte apenas ADMIN/GESTOR, com autoria registrada. |
| `/api/admin/alocacoes` | Leitura ADMIN/GESTOR/OPERADOR; escrita ADMIN/GESTOR, sem ligacao automatica com a frota operacional. |
| `/api/admin/relatorios/**` | Exportacoes operacionais para equipe administrativa. |
| `/api/admin/estatisticas/**` | ADMIN/GESTOR. |
| `/api/admin/configuracoes/**` | Leitura de rotulos/sugestoes necessarios a rotina separada da escrita exclusiva ADMIN. |
| `/api/configuracoes/rotulos-status-veiculo` | Preservar a leitura autenticada usada pelo motorista. |
| `/api/auth/register` | Hoje e publico e sempre cria MOTORISTA. Proposta para uso interno: retirar o autocadastro publico e realizar cadastros pelos fluxos autorizados. |
| Novo `/api/auth/me` | Retornar identidade, perfil e permissoes atuais ao usuario autenticado. |

### Contas, sessao e auditoria

- Preservar IDs, senhas existentes e referencias historicas da tabela
  `motoristas`. A separacao fisica entre usuario e motorista pode ser uma etapa
  posterior; nao e requisito para introduzir os quatro perfis.
- Preservar todas as contas ADMIN atuais como ADMIN. Nenhuma promocao ou
  rebaixamento automatico. Valores de perfil nulos ou desconhecidos precisam
  de diagnostico antes da migracao e nunca recebem privilegio por padrao.
- Criacao feita por Gestor deve definir MOTORISTA no servidor. Nas edicoes e
  redefinicoes, validar o perfil atual do alvo e os campos recebidos; impedir
  alterar contas ADMIN, GESTOR ou OPERADOR, mesmo por ID conhecido.
- Somente ADMIN altera perfis. Proteger o ultimo ADMIN habilitado, inclusive
  em duas requisicoes simultaneas. Impedir mudar o perfil de um motorista com
  missao ativa sem primeiro resolver a missao.
- Se a gestao de acessos incluir suspender uma conta, adicionar um indicador
  de acesso habilitado e respeita-lo no login e em cada requisicao. Suspender
  acesso nao deve apagar historicos nem encerrar automaticamente uma missao.
- O frontend consulta `/api/auth/me` ao restaurar a sessao e trata mudancas
  de permissao e respostas 403. O backend usa a conta atual, nunca confia no
  perfil enviado pelo navegador ou em um perfil antigo no token.
- Registrar alteracao de perfil, credenciais e acesso com autor, alvo,
  perfil do autor no momento, data/hora e valores anteriores/novos quando
  apropriado. Redefinicao de senha registra o evento, nunca senha ou hash.
- Manter auditoria operacional com autoria real: operador que registrou uma
  missao nao se torna seu motorista. A exibicao deve dizer "Registrado por"
  quando o autor puder ser de qualquer perfil administrativo.
- Substituir o armazenamento de senha em texto no frontend por lembrar
  somente o login e suporte ao gerenciador de senhas do navegador. Manter a
  sessao conforme sua validade; nao estender tokens indefinidamente.
- Isolar contas de demonstracao em ambiente de desenvolvimento. Criacao do
  primeiro ADMIN deve ser explicita e nao pode sobrescrever conta existente
  nem recriar senhas padrao em reinicios.

## 7. Etapas de implementacao

1. **Consolidar as escolhas de negocio.** Revisar a matriz, especialmente
   liberacoes de veiculos, edicao de motorista pelo Gestor e complemento
   documental pelo Operador em missao finalizada.
2. **Preparar o banco e a base de acessos.** Verificar restricoes reais da coluna
   de perfil, adicionar os novos valores sem perder contas e preparar auditoria
   e eventual suspensao de acesso. Hoje se usa `ddl-auto: update`; nao presumir
   que ele corrigira uma restricao CHECK antiga. A mudanca precisa de migracao
   explicita, repetivel e testada em copia local dos dados.
3. **Aplicar a politica no backend.** Catalogo de permissoes, verificacoes de
   contexto, contratos separados de contas/motoristas, dados de apoio,
   identidade atual e tratamento de 401/403. Cobrir APIs antigas e alternativas.
4. **Adequar o frontend.** Login administrativo, sessao, menus, parametros de
   rota, botoes, arraste e formularios por permissao. Reaproveitar os componentes
   atuais e carregar apenas dados autorizados.
5. **Fechar os pontos de acesso encontrados.** Inicializacao de demonstracao,
   senha salva no navegador e protecao das fotos. Para fotos, inventariar o
   caminho real no servidor/proxy e atender o frontend com acesso autenticado;
   impedir que uma URL estatica paralela continue publica. A disponibilidade
   de fotos antigas nao pode ser assumida apenas pela existencia da linha no banco.
6. **Testar o conjunto local.** Contas de teste para os quatro perfis, testes de
   API e verificacao dos fluxos na interface. Executar testes no CI sem pular
   a suite de autorizacao. Publicacao fica em uma etapa posterior.

Para uma eventual reversao, nao iniciar a versao antiga sobre contas com os
novos valores de perfil sem um procedimento compativel. A copia do banco e o
procedimento de migracao precisam ser validados antes da publicacao.

## 8. Criterios de aceite

- ADMIN existente continua administrando o sistema apos atualizacao e reinicio,
  sem alteracao silenciosa de senha ou perfil.
- GESTOR gerencia frota, cadastros operacionais e alocacoes, mas recebe 403
  ao tentar mudar configuracoes, perfis ou contas de maior acesso.
- OPERADOR registra saida e retorno comuns de qualquer operador da equipe,
  inclusive retorno de missao iniciada no dia anterior.
- OPERADOR nao corrige horario salvo, libera bloqueado, encerra excecao,
  altera alocacao ou muda uma conta, mesmo enviando a requisicao diretamente.
- Ao preencher dados de missao finalizada, OPERADOR so altera campos vazios;
  a regra e testada no servidor, inclusive com dois editores simultaneos.
- Restringir bloqueio/liberacao funciona tambem em payload de retorno,
  edicao de veiculo e endpoints alternativos de viagem/uso externo.
- Arraste, icone de inclusao e menu do card oferecem as mesmas acoes
  autorizadas. Uma tentativa negada nao move o card nem grava parcialmente.
- O quadro do OPERADOR carrega motoristas elegiveis, rotulos e sugestoes
  sem receber uma lista completa de contas ou acessar configuracoes de escrita.
- MOTORISTA mantem seu fluxo e nao acessa APIs administrativas.
- Usuario com perfil reduzido perde as permissoes na proxima requisicao,
  mesmo com token e aba antigos. Alterar localStorage nao concede acesso.
- A protecao do ultimo ADMIN funciona em edicao, exclusao e eventual
  suspensao, incluindo tentativas concorrentes.
- Historicos mostram o autor correto, inclusive depois de uma troca de perfil.
  Nenhuma auditoria contem senhas ou tokens.
- Os testes verificam respostas positivas e negativas por perfil e as
  validacoes de negocio existentes; o CI executa esses testes.
- Contas de QA sao usadas apenas no banco isolado dos testes. Nenhuma nova conta
  privilegiada e criada automaticamente no banco de trabalho existente.
- Nenhum commit, deploy ou migracao de producao faz parte desta entrega local.
