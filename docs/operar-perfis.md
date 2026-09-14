# Operar e validar os cinco perfis

## Onde acessar

1. Entre pela tela administrativa existente (`/admin/login`).
2. Com uma conta ADMIN, abra **Sistema > Usuarios e acessos**.
3. Use **Adicionar usuario** ou **Editar** para escolher Administrador, Gestor,
   Operador, Visualizador ou Motorista.
4. **Suspender acesso** exige motivo, preserva historicos e invalida sessoes
   existentes. Reabilitar nao revalida tokens antigos.
5. Consulte **Sistema > Auditoria de acessos** para os ultimos 200 eventos de
   contas. Alteracoes de missoes e veiculos permanecem nos respectivos historicos.

Cadastro de Motoristas mostra apenas contas MOTORISTA. A tela Usuarios e acessos
mostra todas as contas e so pode ser usada pelo ADMIN. O Gestor nao consegue
editar outra categoria de conta usando o ID na rota antiga de motoristas.

O Gestor supervisiona frota, cadastros operacionais e alocacoes. O Operador tem
a rotina de saidas/retornos, consultas e relatorios. Nao pode liberar veiculos
restritos, corrigir horarios ou encerrar excepcionalmente missoes do motorista.
Em missoes finalizadas, so pode preencher campos administrativos vazios.
O Visualizador consulta painéis, missoes, checklists, vistorias, alocacoes,
relatorios e estatisticas, sem registrar ou alterar dados. Alocacoes continuam
independentes da frota e sao somente leitura para Operador e Visualizador.

## Seguranca da sessao

- O backend consulta identidade, acesso habilitado e perfil atuais em cada
  requisicao JWT. Os privilegios nao vem do localStorage nem de um perfil
  antigo gravado no token.
- Mudanca de perfil vale na proxima requisicao. A interface atualiza a sessao
  ao navegar, retornar a aba e a cada 30 segundos enquanto estiver visivel.
- Suspensao, alteracao de login e redefinicao de senha invalidam tokens antigos
  pela versao de acesso. O ultimo ADMIN habilitado nao pode ser excluido,
  suspenso ou rebaixado, inclusive em solicitacoes simultaneas.
- A opcao de lembrar acesso salva apenas o login. Senhas antigas no mecanismo
  `rememberAccess` sao removidas quando a aplicacao atualizada carrega.
  O gerenciador de senhas do navegador pode continuar sendo usado.
- As fotos em `/uploads/**` exigem autenticacao administrativa. O frontend
  carrega blobs autenticados, sem colocar tokens na URL. Arquivos ausentes
  continuam ausentes: esta alteracao nao recupera fotos perdidas no Render.
- O autocadastro publico `/api/auth/register` foi desabilitado. Contas sao
  cadastradas pelos fluxos administrativos autorizados.

## Banco e atualizacao

A migracao Flyway `V1__perfis_e_acessos.sql` amplia o CHECK da coluna `perfil`
e adiciona `acesso_habilitado` e `versao_acesso`. A migracao
`V6__perfil_visualizador.sql` inclui o perfil `VISUALIZADOR` no mesmo CHECK.
Nao altera IDs, senhas ou o perfil de contas existentes. Perfis
nulos/desconhecidos interrompem a migracao para revisao; nao sao promovidos
silenciosamente.

Instalacoes existentes recebem baseline 0 e depois V1. Em banco vazio, V1
registra a versao e o Hibernate cria as entidades. Esta primeira entrega ainda
usa o `ddl-auto: update` existente para tabelas de auditoria e novos campos de
historico. Antes de migrar para `validate`, sera preciso versionar todo o schema.

Antes de publicar:

1. Fazer backup do PostgreSQL e do volume de fotos. Nunca commitar backups.
2. Restaurar a copia em ambiente isolado e testar a nova versao.
3. Confirmar que existe um ADMIN habilitado e que o acesso funciona.
4. Atualizar backend e frontend da mesma revisao. Frontend antigo nao possui
   o contrato de sessao novo nem o carregamento autenticado das fotos.
5. Confirmar que o proxy encaminha `/uploads` ao backend, sem `alias` publico.
   A configuracao de deploy versionada usa proxy; configuracoes externas ao
   repositorio precisam de verificacao no momento da publicacao.

Nao voltar simplesmente ao backend antigo depois de criar contas GESTOR,
OPERADOR ou VISUALIZADOR: o enum antigo nao reconhece esses valores. Planejar
rollback com backup consistente e janela sem gravacoes, ou uma correcao
compativel para frente.

## Demonstracao e primeiro administrador

`APP_DEMO_DATA_ENABLED` e falso por padrao. O compose local define true para
manter a demonstracao existente. O inicializador cria somente logins ausentes;
nunca redefine senha/perfil de uma conta existente. Nao ativar demo em producao.

Banco novo, sem administrador: e possivel configurar uma unica inicializacao
com as propriedades Spring abaixo, usando variaveis do ambiente do processo:

```text
APP_BOOTSTRAP_ADMIN_ENABLED=true
APP_BOOTSTRAP_ADMIN_LOGIN=<login escolhido>
APP_BOOTSTRAP_ADMIN_NOME=<nome>
APP_BOOTSTRAP_ADMIN_CPF=<11 numeros>
APP_BOOTSTRAP_ADMIN_SENHA=<senha forte com pelo menos 12 caracteres>
```

O bootstrap recusa sobrescrever login/CPF existente e nao cria outra conta se
ja houver ADMIN habilitado. Remova a habilitacao e os valores apos o primeiro
acesso. Em Docker, as variaveis precisam ser repassadas ao container; um arquivo
`.env` sozinho nao as injeta se o compose nao as referencia. Em instalacao
existente, use a conta ADMIN atual e nao habilite o bootstrap.

## Testes

`mvn verify` executa testes unitarios. Os testes de integracao e concorrencia
exigem **PostgreSQL isolado**, nunca o banco local de trabalho ou producao:

```text
RBAC_TEST_DB_URL=jdbc:postgresql://localhost:5432/seget_perfis_test
RBAC_TEST_DB_USER=<usuario do banco de teste>
RBAC_TEST_DB_PASSWORD=<senha do banco de teste>
```

Com essas variaveis configuradas no processo, execute `mvn verify` dentro de
`backend`. Sem elas, os testes de integracao ficam explicitamente ignorados;
nao confundir o resultado com validacao completa.

O CI cria PostgreSQL 16 descartavel e define essas variaveis automaticamente.
Os testes cobrem matriz de consulta/escrita, endpoints alternativos, retorno
de viagem, uso externo, dados finalizados, revogacao de tokens, migracao do
CHECK antigo, preservacao de contas demo e concorrencia do ultimo ADMIN.

Frontend: executar `npm run build` em `frontend` e conferir manualmente os
menus e formularios dos perfis. A compilacao nao substitui o teste visual.

## Limites desta versao

- Um perfil por conta, com permissoes fixas. Nao ha editor arbitrario de permissoes.
- Nao ha segregacao por orgao/secretaria; a equipe consulta os registros do setor.
- Historicos antigos sem snapshot de perfil permanecem sem essa informacao;
  nao se atribui retroativamente o perfil atual ao evento antigo.
- Suspender um motorista nao encerra uma missao ativa. Um Gestor deve tratar o
  encerramento pendente. Senhas e tokens nunca sao incluidos na auditoria.
- Offline preserva apenas a abertura basica de telas de motorista ja armazenadas
  com sessao ainda valida. Administracao e autorizacao de operacoes exigem rede.
