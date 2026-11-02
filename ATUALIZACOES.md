# Versão atual: 5.0.0 — Plataforma Telegram

- Mini App pessoal com validação HMAC, sessões separadas, plano/uso, lembretes próprios e produtos/faturas.
- Stars opcional para compras únicas de VIP: preço validado no servidor, concessão idempotente, reembolso confirmado e estados de conciliação.
- Business opcional com opt-in por conexão de dono autorizado, direitos do Telegram, respostas exatas e prevenção de loop.
- Fóruns/tópicos, canais com confirmação, convites temporários, pedidos de entrada manuais, quiz, álbuns, stickers, reações e pins, contato/localização e inline de ajuda.
- Webhook autenticado e deduplicado opcional; polling preserva updates pendentes.
- Plataforma administrativa em /plataforma.html e Mini App em /miniapp.html.
- Catálogo de 185 métodos e cliente interno tipado; **não são 185 fluxos de produto prontos**.
- Restore invalida sessões e rascunhos, e desliga automações Business restauradas.

**Validação:** 101 testes passaram; teste de tipos passou; interfaces em Chromium simuladas passaram; npm audit sem vulnerabilidades reportadas. Não houve cobrança Stars, reembolso, conexão Business, domínio HTTPS, webhook externo ou nova homologação real no Telegram.

Guia atual: [GUIA-5.0.md](GUIA-5.0.md). Matriz: [docs/TELEGRAM-COBERTURA.md](docs/TELEGRAM-COBERTURA.md). Versões anteriores abaixo preservam o histórico, não certificam os módulos novos.

---

# Histórico: 4.0.0

Entrega consolidada: proteção de entrada, moderação auditável, conteúdos ricos, publicações recorrentes, reputação, analytics, Central de Gestão por grupo, backups/restauração e saúde operacional.

Validação: **66 testes passaram**, além de cenários Chromium de login, navegação, edição, desktop/mobile. Operações Telegram foram simuladas. Guia atual: `GUIA-4.0.md`. Escopo e limites: `docs/RELATORIO-ESCOPO.md`.

Correções adicionais: console legado restrito a atalhos fixos; verificação de origem nas APIs; CSP na Central; validadores de URLs; limites de resposta OKARUN; fallback de download sem repetir envio idêntico; expiração segura de CAPTCHA e retomada de desbanimento após falha parcial.

Nenhum deploy, build Docker, push ou conexão real ao Telegram/OKARUN foi realizado. As notas abaixo registram versões anteriores.

---

# Versao mais recente: 3.2.0

Nesta rodada foram adicionados 9 comandos (notas, filtro, antiflood, bloqueios, palavras, ranking, silenciar, dessilenciar e denunciar), controles de protecao no painel e moderacao de mensagens editadas. Todos os recursos novos sao configuraveis; coleta de ranking e protecoes novas ficam desligadas por padrao.

Validacao: **36 testes passaram**. Guia completo, referencias, exemplos e limites em `GUIA-3.2.md`. O restante deste arquivo registra as revisoes anteriores.

---

# Revisao geral — 3.0.1

## Correcoes realizadas
- Substituido o pacote `@boruto_vk7/better-sqlite3`, que retornou 404 no registro npm, pelo `better-sqlite3` oficial, mantendo a interface e o arquivo do banco.
- Adicionado `package-lock.json` para instalacoes reproduziveis via `npm ci`.
- Cadastro publico nao promove mais o primeiro usuario a dono. Administradores devem ser provisionados pelas variaveis PAINEL_ADMIN_EMAIL e PAINEL_ADMIN_SENHA. Contas existentes nao sao alteradas por esta mudanca.
- Validacao de papeis na criacao de contas e de tipos/tamanho das senhas antes de calcular hashes.
- Cookies com codificacao invalida nao causam mais excecoes.
- Removida decodificacao duplicada do email na exclusao de conta.
- Validacao de duracao e nome do plano ao conceder VIP pelo painel.
- IP de autenticacao nao confia mais diretamente no cabecalho x-forwarded-for enviado pelo cliente.
- Respostas JSON para rotas de API inexistentes e erros de requisicao, sem enviar stack traces ao cliente.
- Tipos Express alinhados a versao principal usada pelo projeto.
- Removido ID pessoal do exemplo de configuracao e ampliado .gitignore para configuracao privada e arquivos SQLite auxiliares.
- Adicionados testes com banco SQLite em memoria e workflow de CI para Node 22/24 (o workflow ainda nao foi executado no GitHub).

## Validacoes executadas neste ambiente
- Instalacao npm concluida em Node 20.20.2.
- `npm test`: 6 testes passaram, incluindo autenticacao, revogacao de sessao e rotas HTTP reais do painel com Telegram simulado.
- `node --check` em todos os arquivos JavaScript do projeto: sem erros.
- Auditoria automatica durante npm install: 0 vulnerabilidades reportadas. Isso nao equivale a auditoria completa de seguranca.

## Como instalar
1. Faca backup do projeto atual e da pasta database antes de substituir arquivos.
2. Use preferencialmente Node.js 22 ou 24 e execute `npm ci`.
3. Copie `.env.example` para `.env` e preencha token, seu ID Telegram, chave OKARUN e credenciais administrativas fortes.
4. Execute `npm test` e depois `npm start`.
5. Em producao, publique o painel atras de HTTPS. Revise tambem as contas existentes, removendo privilegios indevidos se necessario.

## Limites e proximos passos
Esta e uma revisao focada em instalacao, autenticacao e robustez do painel, nao uma auditoria exaustiva de todos os comandos. Nao foram testadas chamadas reais ao Telegram nem a OKARUN por falta de credenciais. Nao foi realizado deploy nem envio de commits ao repositorio remoto.

Recomendacoes para uma proxima etapa: limitar requisicoes de login/cadastro por IP, adotar cookies Secure sob HTTPS, revisar armazenamento de tokens no frontend, limitar endpoints publicos que consultam servicos externos e testar os comandos com uma instancia de homologacao.

# Evolucao 3.1.0 — Comunidade

## Funcionalidades implementadas
- 10 novos comandos: boasvindas, regras, antilink, advertir, enquete, configgrupo, lembrete, buscarcmd, novidades e diagnostico.
- Novas tabelas SQLite criadas com IF NOT EXISTS, sem remover os dados existentes.
- Processamento de mensagens comuns antes do filtro de prefixos para moderacao e boas-vindas.
- Fila persistente de lembretes com limites, cancelamento por proprietario, retentativas e encerramento do worker antes de fechar o banco.
- Limite de requisicoes HTTP por IP no login/cadastro; respostas API com Cache-Control no-store, nosniff e politica de referrer.
- Cookie de sessao Secure quando PAINEL_URL comeca com https://.
- Argumentos de comandos de contas omitidos dos novos logs; gerenciamento de contas restrito ao privado.
- Arquivos opcionais de deploy Docker/Compose. Nao foi executado build Docker.

## Validacao 3.1
18 testes automatizados passaram: banco/configuracoes, isolamento de advertencias, URLs, escape HTML, moderacao com Telegram simulado, duracoes, propriedade/limites/cancelamento de lembretes, entrega/retentativas, limite HTTP, privacidade de logs, carregamento dinamico de comandos e os testes anteriores de autenticacao e HTTP.

Os testes usam banco em memoria e adaptadores simulados do Telegram. E necessario validar em um grupo de homologacao as permissoes reais, as boas-vindas e as entregas. Nenhum token foi solicitado ou usado. Codigo atualizado localmente, sem push ao GitHub.

Os 6 testes e recomendacoes acima pertencem a revisao 3.0.1; a 3.1 implementa parte desses proximos passos. Esta entrega continua nao sendo uma auditoria exaustiva de seguranca.
