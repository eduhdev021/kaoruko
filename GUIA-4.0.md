# Kaoruko 4.0 — Central de Gestão

Esta versão reúne as entregas anteriores e adiciona os módulos abaixo. A implementação é local ao projeto: não depende de Rose, Combot ou serviços pagos de moderação.

## Instalar ou atualizar

1. **Pare a versão antiga e faça backup externo da pasta database e dos arquivos privados (.env e config.json).** As migrações são executadas ao carregar módulos, antes do primeiro backup automático.
2. Use preferencialmente Node.js 22 ou 24. Os testes desta entrega foram executados em Node 20.20.2.
3. Substitua os arquivos de código, preservando os privados e o banco. Não copie node_modules de outra máquina.
4. Execute `npm ci` e `npm test`.
5. Configure BOT_TOKEN, BOT_OWNERS, credenciais administrativas e, se usar os comandos externos, OKARUN_APIKEY no .env. As credenciais administrativas do exemplo agora ficam vazias, sem senha padrão.
6. Execute `npm start`. As novas tabelas são criadas automaticamente e as notas de texto antigas são migradas para a biblioteca rica.
7. Acesse **/gestao.html** no endereço do painel. A página inicial do site também ganhou um link Gestão 4.0.
8. Homologue em um supergrupo pequeno antes de ativar moderação em comunidades de produção.

Não rode duas instâncias com o mesmo banco/token. O processo agora cria database/runtime.lock para detectar instâncias duplicadas. O lock é proteção local, não coordenação distribuída; não compartilhe o banco por NFS entre máquinas.

## Permissões no Telegram

A bot precisa ser administradora e receber as mensagens do grupo. Para apagar spam: permissão de apagar mensagens. Para CAPTCHA, silenciamento e anti-raid: permissão de restringir membros em **supergrupo**. Para banimento/expulsão: permissão correspondente. Um CAPTCHA simples não garante identificação humana nem substitui outras proteções.

Proteções novas, punições automáticas, reputação e coleta de atividade começam desligadas. As configurações anteriores de cada grupo continuam preservadas.

## 1. Proteção de entrada

```text
/captcha on
/captcha prazo 120
/captcha timeout liberar
/captcha timeout expulsar
/captcha off
/antiraid on
/antiraid limite 6 10 180
/antiraid off
```

- CAPTCHA matemático com três opções, vinculado ao ID do novo membro e ao grupo; até três tentativas.
- Prazo de 60 a 600 segundos. O padrão ao expirar é **liberar**, não expulsar.
- A expulsão por timeout exige configuração explícita. Remove o membro e libera seu retorno; não é banimento permanente.
- A restrição tem prazo de segurança no Telegram: expiração do desafio mais 60 segundos. Isso reduz o risco de restrição indefinida se o processo cair.
- Desafios são persistidos no SQLite. Ao reiniciar, o worker processa os vencidos. Se houver falha entre banir e liberar o retorno, registra a etapa para retomar o desbanimento.
- Não aplica novo desafio a bots, donos, administradores ou membros que já estejam com restrição individual. Isso evita sobrescrever restrições anteriores.
- Ao atingir o limiar de entradas, anti-raid força CAPTCHA temporariamente para os novos membros, mesmo com o CAPTCHA geral desligado. Não fecha o grupo nem remove membros antigos.
- O estado temporário de raid fica no banco; entradas usadas na detecção são retidas por aproximadamente um minuto.
- Eventos não entregues pelo Telegram durante uma indisponibilidade não podem ser reconstruídos. O bot continua usando dropPendingUpdates na inicialização.

## 2. Antispam e exceções de links

```text
/antispam on
/antispam off
/dominios adicionar example.com
/dominios apagar example.com
/dominios listar
```

A terceira repetição consecutiva de um texto/legenda de pelo menos 20 caracteres em 30 segundos é removida. A comparação é por pessoa/grupo. Administradores e donos são isentos. O contador de repetição é temporário e reinicia com o processo.

Antilink agora reconhece também domínios sem protocolo e algumas formas ofuscadas, incluindo hxxps, caracteres de largura zero e [.] ou (dot). Não promete detectar toda ofuscação nem lê texto dentro de imagens. Domínios exatos e seus subdomínios podem ser permitidos; todos os links detectados na mensagem precisam ser permitidos para a mensagem passar. Domínio permitido não é verificação de segurança do site: admin deve revisar a lista.

## 3. Advertências, histórico e reversão

```text
/avisosconfig 3 silenciar 10m
/avisosconfig 3 expulsar
/avisosconfig off
/advertir                   (em resposta)
/advertir ver               (em resposta)
/advertir limpar            (em resposta)
/historico
/desfazer 123
```

A punição ocorre **ao atingir exatamente o limite** configurado. Os avisos não são zerados automaticamente; limpe para iniciar novo ciclo. Se a ação remota falhar, o aviso continua registrado e deve ser revisado; novos avisos acima do limite não repetem a punição.

Silenciamentos, dessilenciamentos e banimentos passam pelo serviço de moderação com proteção de donos/admins/bots. A remoção pelo painel antigo também usa esse serviço. São registradas configurações, verificações de entrada e remoções automáticas por spam, antilink, termos e flood.

O histórico guarda até 2000 ações por grupo. Reversão é oferecida para silenciar, dessilenciar e banir. Recusa ação já desfeita ou quando existe ação posterior conhecida sobre o mesmo alvo. Uma expulsão não reinsere o membro: desfazer um banimento apenas permite voltar. A restrição restaurada respeita também o padrão atual do grupo.

**Limite:** o histórico conhece ações realizadas por esta bot, não mudanças externas feitas por outros admins/bots. Antes de desfazer, revise o estado atual do membro. Em falhas de rede entre ação remota e registro local não há transação distribuída com o Telegram; uma revisão manual pode ser necessária.

## 4. Notas ricas e comandos personalizados

```text
/notas salvar atendimento | Nosso horário é de segunda a sexta.
/notas ver atendimento
/notas botao atendimento | Acessar suporte | https://example.com
/notas apagar atendimento
/atalho salvar contato | Nosso e-mail: suporte@example.com
/contato
/atalho botao contato | Site | https://example.com
```

Para salvar mídia, responda à foto/arquivo e use `/notas salvar NOME` ou `/atalho salvar NOME`. Tipos: foto, vídeo, documento, áudio, voz e animação. A bot guarda o file_id do Telegram, não baixa cópias desses arquivos para o servidor.

Até 50 notas e 50 atalhos por grupo; texto até 2000 caracteres ou legenda de mídia até 1000; até 5 botões HTTPS. Nomes de atalhos: 2–32 letras ASCII, números ou _. Comandos nativos têm prioridade e não podem ser sobrescritos pelo comando /atalho. Configurações importadas com nome reservado também não substituem comandos nativos.

Notas e atalhos são compartilhados com os membros do grupo, não são cofre de segredos. Apenas admins/dono podem criar/alterar. No painel, é possível editar texto e botões e preservar a mídia existente; o cadastro inicial da mídia é feito pelo Telegram.

## 5. Publicações agendadas e recorrentes

```text
/agendar 10m Lembrete: reunião da comunidade hoje.
/agendar repetir 1h Consulte /regras antes de participar.
/agendar listar
/agendar cancelar 123
```

Publicações são diferentes de lembretes pessoais: somente admins/dono criam e administram a fila do grupo. Também são gerenciadas pelo painel com data/hora explícita.

Até 30 pendentes por grupo. Texto até 3500 caracteres; repetição de 1 minuto a 30 dias; primeira data de 10 segundos a 366 dias. O comando por duração aceita até 30 dias; o painel aceita datas até 366 dias. São publicações de texto simples, sem anexos.

Fila persistente consultada a cada 5 segundos, até 10 publicações por ciclo. Após indisponibilidade, envia uma publicação vencida e calcula a próxima repetição a partir do envio atual, sem disparar todos os intervalos perdidos. Respeita retry_after; falhas permanentes ou após cinco tentativas ficam visíveis como falha, com diagnóstico. Cancelar impede próximos ciclos, mas não recolhe um envio já em andamento.

**Sem garantia exactly-once:** queda/falha de rede entre entrega e confirmação pode repetir uma mensagem. Use uma única instância por banco. Publicações existentes permanecem como configuração do grupo mesmo que seu autor deixe a administração; admins atuais podem cancelá-las.

## 6. Reputação, níveis e atividade

```text
/reputacao on
/reputacao +                 (em resposta para agradecer)
/reputacao
/reputacao off
/reputacao limpar
/ranking on
/ranking
/ranking off
```

Reputação aceita um agradecimento por pessoa/grupo a cada 24 horas. Não permite votar em si mesmo ou bots. Nível calculado como 1 + parte inteira de sqrt(pontos/5). Não concede privilégios de administração nem vantagens financeiras. Contas alternativas continuam sendo uma possibilidade de abuso; não use como medida antifraude.

Ranking/analytics é uma opção separada da reputação, desligada por padrão. Guarda IDs, primeiro nome, pontos e contagens agregadas, sem textos das conversas. Ranking tem no máximo um ponto por 30s; o gráfico mostra mensagens observadas aceitas pelo processamento, entradas e saídas em dias UTC. Não é contagem completa do Telegram nem retroativa. Edições não pontuam.

O painel mostra os últimos 30 dias disponíveis. Dados diários são retidos por até 90 dias. Desligar a coleta não apaga o histórico; a tela Atividade tem botões para apagar dados de atividade ou reputação do grupo. /ranking limpar limpa apenas o ranking, não os agregados diários.

## 7. Central de Gestão e acesso por grupo

**/gestao.html** usa as mesmas contas e sessões do painel existente, sem armazenar senhas ou tokens no localStorage.

- Dono tem acesso global.
- Para uma conta membro gerenciar grupos, o dono deve vinculá-la ao ID correto pelo comando privado `/conta vincular EMAIL ID_TELEGRAM` ou pela criação administrativa de conta vinculada.
- O servidor consulta a condição de administrador **a cada requisição** do grupo. Perder o cargo retira o acesso às próximas operações.
- ID informado no navegador não concede acesso por si só.
- A lista considera até os 200 grupos conhecidos mais recentes. Grupos fora da lista podem ser abertos por ID e seguem a mesma verificação de permissão.
- Anônimos não acessam dados administrativos. Uma conta sem vínculo não assume a identidade fornecida pelo cliente.

Seções: Proteção & entrada; Conteúdos & atalhos; Publicações; Moderação e avisos; Atividade; Operação & backups (somente dono).

Exportação/importação em JSON transporta configurações, notas ricas, atalhos e filtros. Não transporta contas, senhas, sessões, reputação, histórico ou tarefas. Importar substitui configurações e mescla conteúdos por nome, com validação e transação SQLite. Há limite HTTP de 100 KB; bibliotecas maiores devem ser transportadas em lotes ou reduzidas. IDs de mídia pressupõem uso da mesma bot.

## 8. Backups, restauração e saúde

```text
/backup                     (dono, no privado)
/saude                      (dono)
npm run restaurar -- /caminho/backup.db
```

O worker cria um backup ao iniciar após a conexão e depois aproximadamente a cada 24 horas, com API de backup SQLite para incluir dados em WAL. Mantém os 7 mais recentes em database/backups por padrão (BACKUP_DIR pode alterar). Criação concorrente compartilha a mesma operação. Arquivos usam permissões 0600 e diretório 0700 quando criado.

Somente dono lista/baixa backups pela Central. **Backups contêm dados pessoais, hashes de senha e sessões ativas: são credenciais sensíveis.** Não são criptografados por este projeto. Guarde cópia externa criptografada e proteja o volume/servidor. Sem cópia externa, falha de disco ainda perde banco e backups locais.

A restauração é CLI, não um botão destrutivo no navegador. Pare a bot; o script verifica runtime.lock, integridade SQLite e tabelas reconhecidas, preserva cópia consistente do banco atual e substitui o arquivo. Foi testada com cópia isolada. Só use backups confiáveis. Revogue sessões após incidente de segurança; restaurar um backup pode reativar sessões contidas nele.

- `/healthz`: liveness do HTTP, sem dados sensíveis. Não comprova disponibilidade do Telegram.
- `/readyz`: 200 quando o worker completou ciclo nos últimos 60s, 503 caso contrário. Não é uma sonda externa do Telegram/OKARUN.
- `/api/gestao/saude`: somente dono; integridade do banco, memória, filas e estado do worker.

Há controle conservador local de envios por chat/global e retentativas para 429 do Telegram. Polling não entra na fila. A fila de requisições em memória tem limite de 500; tarefas agendadas continuam persistidas. Não é um rate limiter distribuído nem substitui limites dinâmicos do Telegram.

## 9. Segurança e revisão de integrações

- Console web legado agora aceita **apenas atalhos fixos de diagnóstico**. Shell arbitrário foi removido, pois a antiga blacklist não era uma fronteira segura.
- Origem de operações mutáveis da API é verificada; nova Central tem CSP de scripts locais, sem CDN.
- Login/cadastro e nova API de gestão têm limite de requisições. O servidor não confia diretamente em X-Forwarded-For. Atrás de proxy, clientes podem compartilhar a cota do IP do proxy; planeje limites no proxy conforme seu cenário.
- Downloads usam validação de protocolo/host mais estrita, incluindo recusa de domínios falsos por sufixo, credenciais na URL e endereços locais literais comuns. Isso **não é** uma defesa DNS/SSRF completa contra todos os formatos, redirecionamentos ou rebinding. As URLs dos downloads são processadas por serviços externos/Telegram, não por um downloader local novo.
- O cliente OKARUN limita tamanho de resposta/corpo e recusa rotas absolutas; erros HTML são escapados. Foram corrigidas tentativas inúteis de reenviar o mesmo arquivo grande em Drive/MediaFire, com link alternativo.
- Nenhum comando externo teve resultado real confirmado nesta entrega, por falta de chave/token. Não há promessa de que todas as rotas atuais do provedor continuam disponíveis.
- Não é auditoria exaustiva de todo o código legado. Use HTTPS, proteja as credenciais, mantenha o registro fechado se não precisar dele e revise contas/arquivos/logs anteriores.

## Validação entregue

- 66 testes automatizados passaram; relatório em docs/testes-v4.tap.
- Sintaxe de todos os arquivos JS/MJS verificada.
- npm audit: zero vulnerabilidades reportadas no momento da execução (não equivale a auditoria de segurança).
- Navegador Chromium: login, seis seções, salvar regras, criar/editar nota, desktop e viewport 390px, sem pageerror e sem overflow horizontal no cenário testado.
- O teste de interface de leitura está em scripts/teste-interface.mjs. Instale o navegador com `npx playwright install --with-deps chromium`, inicie a homologação e defina UI_URL, UI_EMAIL, UI_SENHA e UI_GRUPO antes de `npm run test:ui`.
- Capturas da Central com dados simulados: docs/central-desktop.png e docs/central-mobile.png.
- Operações Telegram nos testes foram simuladas. Não houve teste de ponta a ponta em grupo real, deploy, build Docker ou push ao GitHub.

## Checklist de homologação real (ainda pendente)

1. Novo membro humano: responder corretamente, errar 3 vezes e deixar expirar em modo liberar.
2. Modo expulsar: confirmar remoção e possibilidade de voltar. Simular indisponibilidade entre remoção e liberação.
3. Anti-raid: várias entradas controladas, sem convidar terceiros não informados.
4. Admins/donos isentos; membro comum com spam, mídia bloqueada e edição com link.
5. Advertências até o limiar; testar histórico e desfazer sem ação externa posterior.
6. Nota com cada tipo de mídia; botão HTTPS; atalho em grupo diferente para confirmar isolamento.
7. Publicação única e recorrente; cancelar; reiniciar antes do vencimento; observar 429 quando aplicável.
8. Conta admin vinculada: revogar cargo no Telegram e confirmar 403 no próximo acesso.
9. Backup externo; restauração numa instância isolada; validar tabelas, mídia referenciada e sessões.
10. HTTPS, cookies Secure, permissões de arquivos, política de retenção e monitoramento do servidor.
