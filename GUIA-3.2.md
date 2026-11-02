# Kaoruko 3.2 — Automacao e moderacao

Esta entrega inclui as correcoes da 3.0.1, as funcionalidades da 3.1 e os novos modulos da 3.2.

## Referencias consultadas
- Rose: https://missrose.org/docs/getting-started/ — notas, filtros, locks e antiflood foram referencias de produto.
- Combot: https://combot.org/ — analise de atividade e denuncias foram referencias de produto.

A implementacao foi escrita no proprio projeto. Nao integra contas desses servicos, nao usa as APIs deles e nao implementa todas as funcionalidades desses bots.

## O que mudou nesta rodada

### 1. Notas do grupo
Qualquer membro pode consultar; somente admins/dono podem salvar ou apagar. Ate 50 notas de texto por grupo, com ate 2000 caracteres cada. Notas nao sao privadas: qualquer membro do grupo pode le-las.

```text
/notas salvar suporte | Atendimento de segunda a sexta, das 8h as 18h.
/notas ver suporte
/notas listar
/notas apagar suporte
```

### 2. Respostas automaticas
Ate 50 filtros por grupo. Comparacao da mensagem inteira, sem distinguir maiusculas, com normalizacao Unicode. Nao usa regex. Nao responde a comandos, edicoes ou bots. Existe um intervalo global de 5 segundos entre respostas de filtros no mesmo grupo.

```text
/filtro adicionar bom dia | Bom dia! Consulte /regras antes de participar.
/filtro listar
/filtro apagar bom dia
```

### 3. Antiflood
Janela fixa por pessoa/grupo. Ao ultrapassar o limite, apaga as mensagens excedentes ate a janela terminar. Nao bane, nao silencia automaticamente e nao envia uma resposta para cada mensagem de flood. Administradores e donos sao isentos. Estado da janela e temporario e reinicia com o processo; configuracao permanece no banco.

```text
/antiflood 6 10
/antiflood
/antiflood off
```

Isso permite seis mensagens em dez segundos. Limite configuravel: 3 a 30; janela: 5 a 60 segundos. A bot precisa receber todas as mensagens e ter permissao de apaga-las.

### 4. Bloqueios por tipo de conteudo

```text
/bloqueios stickers on
/bloqueios encaminhadas on
/bloqueios fotos off
/bloqueios
```

Tipos: stickers, fotos, videos (inclui animacoes e video notes), audios (inclui voz), documentos e encaminhadas. O controle apaga a mensagem: nao e alteracao global de permissoes do Telegram. Administradores/donos sao isentos.

### 5. Termos proibidos

```text
/palavras adicionar propaganda proibida
/palavras listar
/palavras apagar propaganda proibida
```

Ate 50 termos, de 2 a 60 caracteres. Busca literal de trechos em texto/legenda, sem diferenciar maiusculas. Pode atingir partes de palavras: configure frases especificas para reduzir falsos positivos. Nao interpreta imagens nem detecta variantes deliberadamente ofuscadas. Admins/donos sao isentos.

### 6. Silenciamento temporario

Responda a mensagem do membro:

```text
/silenciar 10m
/dessilenciar
```

Aliases: /mute e /unmute. Aceita de 1 minuto a 30 dias, com unidades m, h ou d (ou s a partir de 60 segundos). A bot deve ser admin com permissao de restringir membros, em supergrupo. O comando recusa bots, donos e administradores como alvos de silenciamento. Ao dessilenciar, restaura as permissoes padrao atuais do grupo, sem liberar indiscriminadamente todas as midias. Nao preserva restricoes individuais que existiam antes do silenciamento: admins devem revisar casos com regras individuais especiais.

### 7. Denuncias

Responda a mensagem que merece revisao:

```text
/denunciar mensagem suspeita
```

Alias: /report. Publica o pedido em resposta a mensagem original e menciona ate 10 administradores humanos. Nao envia denuncia ao Telegram, nao faz julgamento automatico nem aplica punicao. O cooldown e de 60s por usuario/comando. O roteador foi ajustado para que alias e nome principal compartilhem o mesmo cooldown, impedindo essa forma de contornar o intervalo.

### 8. Ranking opcional

```text
/ranking on
/ranking
/ranking off
/ranking limpar
```

Somente administradores/dono ativam, desativam ou zeram. Coleta desligada por padrao. Armazena ID, primeiro nome, pontuacao e horario do ultimo ponto; nao guarda o texto das mensagens. Concede no maximo um ponto por usuario a cada 30 segundos, considerando mensagens aceitas pelo processamento, e mostra os dez primeiros. Nao e contagem exata nem historico diario de analytics. Mensagens editadas nao pontuam. Desativar para novas coletas nao apaga o historico: use limpar para apagar os registros desse grupo.

### 9. Controles no painel
No painel administrativo: abra a lista de grupos, selecione um grupo e expanda **Protecoes e atividade · v3.2**.

Ali o dono pode alterar antiflood, janela, bloqueios de conteudo, termos proibidos e coleta de ranking. Configuracoes validadas no servidor; membros comuns recebem 403 e usuarios nao autenticados recebem 401. As configuracoes de boas-vindas, regras e antilink continuam pelos comandos da 3.1.

## Ordem de processamento
1. Ignora mensagens antigas e remetentes bots.
2. Boas-vindas e antilink da versao 3.1.
3. Bloqueios de conteudo, termos e antiflood.
4. Coleta opcional de ranking e filtros automaticos.
5. Comandos pelo roteador existente.

Edicoes passam por antilink, tipos de conteudo e palavras proibidas, mas nao repetem comandos, nao disparam filtros nem pontuam no ranking.

## Atualizacao segura
1. Pare a instancia atual. Nao rode duas instancias com o mesmo token/banco.
2. Faca backup da pasta database, do .env e de qualquer config.json privado.
3. Substitua o codigo, preservando os arquivos privados e o banco.
4. Execute npm ci e npm test com Node 22 ou 24, preferencialmente.
5. Execute npm start. As tabelas novas sao criadas automaticamente sem remover as existentes.
6. Valide em grupo de homologacao: bot admin com permissoes de apagar/restringir; teste um recurso por vez.
7. Ative somente as protecoes que desejar. Elas ficam desligadas por padrao.

Estas funcionalidades novas nao precisam da API OKARUN; o token Telegram continua necessario para operar a bot.

## Testes e limites da validacao
- 36 testes automatizados passaram em Node 20.20.2.
- Testes de autenticacao e configuracao administrativa usam HTTP real local com banco em memoria.
- Operacoes Telegram sao simuladas, incluindo silenciamento, remocao de mensagens e entrega de lembretes.
- Verificacao de sintaxe executada em todos os arquivos JavaScript.
- Nao foi feita validacao visual automatizada da interface nem teste de ponta a ponta no Telegram real.
- Nao foi feito deploy, build Docker ou push ao GitHub.
- A suite nao representa auditoria completa de seguranca ou cobertura de todos os comandos antigos.

## Recursos pesquisados mas NAO implementados
CAPTCHA, anti-raid por volume de entradas, federacoes de banimento, reputacao, analytics historico completo, verificacao de conteudo de imagens e integracao CAS nao fazem parte desta versao. Nao ha alegacao de paridade com Rose ou Combot. Estes itens exigem desenho e testes adicionais, especialmente os que restringem ou removem membros automaticamente.
