# Redesign administrativo: primeira etapa

## Objetivo

Estabelecer uma navegacao persistente e um padrao visual para o administrativo,
comecando pela Operacao da frota. O fluxo do motorista e as regras de negocio
continuam sendo os existentes.

## Organizacao

| Menu | Destino |
| --- | --- |
| Operacao da frota | Quadro de veiculos por situacao |
| Missoes | Consulta e complementacao dos dados administrativos |
| Vistorias | Checklists de missao e vistorias completas |
| Cadastros | Veiculos; motoristas e acessos |
| Relatorios | PDF diario de missoes, PDF de checklists e estatisticas |
| Configuracoes | Rotulos de status e sugestoes de preenchimento |

O menu lateral permanece nos relatorios e nas estatisticas. No celular, abre
em uma janela de navegacao com suporte a teclado, Escape e retorno do foco.
Os enderecos anteriores, incluindo `/admin?menu=veiculos`, continuam funcionando.
O botao Voltar do navegador acompanha as trocas de pagina.

## Componentes

- `admin-layout`: estrutura, navegacao, identificacao do usuario e menu mobile.
- `admin-navigation.ts`: configuracao central dos itens do menu.
- `fleet-board`: apresentacao do quadro, busca local e eventos de interacao.
- `fleet-board.model.ts`: contrato de apresentacao dos cards e colunas.
- `admin-reports`: acesso aos relatorios existentes e exportacao diaria.
- `shared/ui`: icones SVG locais e estilos compartilhados do administrativo.

O componente administrativo existente continua responsavel pelas consultas,
regras de agrupamento, confirmacoes e alteracoes de status. O quadro apenas
emite as acoes: ele nao grava nem redefine regras de disponibilidade.

## Comportamento do quadro

- Busca por placa, modelo, marca ou motorista, sem alterar os totais da frota.
- Placa, modelo e status em cards compactos; detalhes extras nos deslocamentos.
- Destino, setor e solicitante ausentes aparecem como pendentes.
- Atualizacao automatica a cada 15 segundos, suspensa fora da operacao.
- Arraste e selecao de inclusao pausam a atualizacao automatica do quadro.
- Missao ou viagem automatica nao pode ser movimentada manualmente.
- Nenhuma movimentacao e gravada antes da confirmacao existente.
- Falha de consulta preserva a ultima resposta e apresenta aviso explicito.
- O horario exibido refere-se a ultima consulta completa de veiculos.

## Verificacao local

Compilar o frontend:

```sh
cd frontend
npm run build
```

Atualizar apenas o frontend do Docker local:

```sh
docker compose up -d --build --no-deps frontend
```

Roteiro de verificacao:

1. Entrar como administrador e percorrer todos os itens do menu.
2. Abrir relatorios e estatisticas; confirmar que o menu permanece visivel.
3. Alternar entre paginas e usar Voltar e Avancar do navegador.
4. Buscar uma placa e limpar a busca; conferir os totais e os cards.
5. Arrastar para a parte inferior de outra coluna; cancelar a confirmacao.
6. Confirmar uma movimentacao autorizada com dados de teste.
7. Conferir dados pendentes e sua atualizacao depois da edicao da missao.
8. Simular falha de rede e conferir o aviso e a preservacao dos dados.
9. Testar o menu mobile, Escape, teclado e ausencia de rolagem horizontal.
10. Baixar o PDF diario e verificar o arquivo.

A validacao desta etapa incluiu compilacao, login e PDF com o backend local,
navegacao e telas entre 320 e 1920 pixels. Cenarios de movimentacao, pendencias
e falhas foram exercitados com respostas simuladas no navegador, sem alterar
os registros existentes para montar os cenarios.

## Proximas etapas

Aplicar o mesmo padrao aos formularios e listas de cadastros, missoes e
vistorias, extraindo esses modulos gradualmente do componente administrativo.
Os formularios de cadastro ainda conservam a organizacao anterior nesta etapa.
