# Kaoruko 5.0 — Plataforma Telegram

A versão 5.0 acrescenta fluxos da Bot API, uma Mini App pessoal, catálogo Stars, integrações Business e transporte webhook opcional. Inclui as versões anteriores, mas **não transforma toda a documentação do Telegram em funcionalidades prontas**. O índice de referência tem 185 métodos; a matriz `docs/TELEGRAM-COBERTURA.md` distingue fluxos implementados de referências disponíveis para desenvolvimento.

## Instalação

1. Pare a bot e faça backup externo do banco e dos arquivos privados. Não rode duas instâncias com o mesmo banco/token.
2. Use preferencialmente Node 22/24. Os testes locais foram executados em Node 20.20.2.
3. Preserve seu .env e database; substitua o código e execute `npm ci`, `npm test` e `npm run test:types`.
4. Configure um token **novo** no .env privado. Nenhuma credencial real está incluída no código/ZIP.
5. Execute `npm start`. As tabelas `platform_*` são criadas sem apagar os dados existentes.
6. Central: `/gestao.html`. Integrações e comércio: `/plataforma.html`. Mini App: `/miniapp.html`.

A homologação Telegram real registrada em `docs/HOMOLOGACAO-REAL-PARCIAL.md` pertence à versão 4.0. Ela **não comprova** os fluxos novos da 5.0. Nesta entrega não foi reutilizado o token exposto anteriormente.

## 1. Configuração externa e ativação

Todos os módulos opcionais começam desligados:

```dotenv
TELEGRAM_INLINE_ENABLED=false
TELEGRAM_MINI_APP_ENABLED=false
TELEGRAM_MINI_APP_URL=
TELEGRAM_STARS_ENABLED=false
TELEGRAM_TERMS_URL=
TELEGRAM_PAY_SUPPORT=
TELEGRAM_BUSINESS_ENABLED=false
TELEGRAM_TRANSPORT=polling
TELEGRAM_WEBHOOK_URL=
TELEGRAM_WEBHOOK_SECRET=
```

Ter URL configurada não cria domínio, certificado, hospedagem nem ligação no BotFather. O operador deve providenciar esses recursos. As mudanças dessas variáveis exigem reiniciar a aplicação. Campos da Central não alteram variáveis de ambiente.

## 2. Menu nativo, perfil e capacidades

Somente dono, no privado:

```text
/telegram status
/telegram sincronizar
/telegram menu
/telegram nome Kaoruko Waguri
/telegram descricao Texto de apresentação
/telegram resumo Resumo curto
/telegram stars
```

Status consulta capacidades reais, privacidade e webhook, sem publicar URL/segredo do webhook. Sincronizar publica até 100 comandos públicos nos escopos de privados e grupos; não torna um comando autorizado por aparecer no menu. Comandos continuam verificando permissões.

`/telegram menu` configura o botão Web App quando o módulo está pronto; caso contrário, configura o botão de comandos. Perfil e menus só são alterados por comando explícito, não automaticamente ao instalar. `/telegram stars` consulta até 20 transações da conta para auxiliar conciliação; não concede benefícios automaticamente.

Modo inline: habilite também `/setinline` no BotFather e `TELEGRAM_INLINE_ENABLED=true`. Pesquisar `@sua_bot termo` oferece artigos de ajuda dos comandos públicos. Não consulta notas privadas nem executa comandos privilegiados por inline. Não há pesquisa global de todas as mensagens do Telegram.

## 3. Fóruns e tópicos

Em supergrupo com fóruns habilitados, para administradores:

```text
/topico criar Atendimento
/topico editar 123 Novo nome
/topico fechar 123
/topico abrir 123
/topico apagar 123
```

A exclusão exige botão de confirmação, vinculado a quem solicitou e com prazo de cinco minutos. A bot e o usuário precisam ter permissões adequadas no chat; o Telegram pode recusar conforme os direitos específicos. Abrir/fechar aceita o ID informado ou o ID do tópico atual quando não informado. Não há criação de novos grupos nem conversão automática de grupo em fórum.

## 4. Canais com confirmação

No privado da bot:

```text
/canal info @seu_canal
/canal publicar @seu_canal | Texto da publicação
```

Para mídia, responda a uma mídia no privado e use o comando publicar com destino e legenda opcional. A autorização de administrador no canal é consultada antes do rascunho e novamente na confirmação. Não basta ser dono da bot se não for administrador do canal.

Nenhuma publicação ocorre ao criar o rascunho. O botão confirma somente para o autor, por cinco minutos. Falha remota marca o rascunho como falho e **não repete automaticamente** a publicação, pois uma falha de rede pode esconder um envio já realizado. Confira o canal antes de tentar novamente. Receber channel_post apenas registra metadados, não executa texto do canal como comando.

## 5. Convites e solicitações de entrada

```text
/convite direto 1h
/convite solicitar 1h
/convite revogar LINK
/entrada listar
/entrada aprovar ID_USUARIO
/entrada recusar ID_USUARIO
```

A bot cria links temporários de 1 minuto a 30 dias. A revogação pelo comando exige que o link esteja no registro de convites criados por esta bot para o grupo atual. Links e contatos/coordenadas informados nos comandos sensíveis são omitidos dos novos logs de argumentos.

Pedidos são **manuais por padrão e nesta implementação**: receber um pedido não aprova nem recusa ninguém automaticamente. A listagem pelo comando é enviada ao privado do admin, que deve ter iniciado /start. O painel Plataforma mostra e decide pedidos somente para quem tem acesso atual ao grupo. Para decidir pelo painel, a conta precisa estar vinculada ao ID Telegram e esse usuário precisa ser admin atual. Eventos pendentes são retidos por até 30 dias.

O módulo trabalha com pedidos recebidos após a bot ser configurada para receber esses updates. Não recupera retroativamente todos os pedidos desconhecidos pelo banco.

## 6. Mídias, stickers, localização e interação

```text
/album
/figurinha                 (respondendo a uma figurinha)
/quiz Pergunta | Correta | Outra opção
/reagir 👍                  (admin, em resposta)
/fixar                     (admin, em resposta)
/desafixar                 (admin, em resposta)
/local -3.1 -60.0
/contato +550000000000 | Nome autorizado
/compartilhar              (no privado)
```

Álbuns: a bot precisa receber o álbum de 2–10 mídias; `/album` reenvia o último álbum do **próprio remetente** em até cinco minutos. IDs/captions ficam em cache temporário com limite de entradas, não em biblioteca permanente. Misturas de tipos seguem as regras do Telegram para media groups. Não é acesso a álbuns anteriores que a bot não recebeu.

`/figurinha` reutiliza o file_id; não converte fotos em stickers. Quiz coloca a primeira opção como correta, com 2–10 opções. Reagir pode ser recusado se o emoji não estiver disponível no grupo. Fixar/desafixar afeta apenas a mensagem respondida, não remove todos os pins.

`/compartilhar` oferece botões opcionais de contato/localização. Receber esses dados apenas confirma e fecha o teclado; o módulo não grava contato/coordenadas. `/local` e `/contato` publicam os dados fornecidos explicitamente no chat atual: compartilhe apenas dados que você pode publicar. Captions ou dados de outros módulos legados não são cobertos por essa política restrita.

Somente dono, no privado, respondendo a um sticker:

```text
/stickers criar NOME_by_USERNAME_DA_BOT | Título | 🙂
/stickers adicionar NOME_by_USERNAME_DA_BOT | 🙂
/stickers apagar
```

Criação/adicionamento usa o sticker recebido e o formato detectado. Nome do conjunto deve terminar no sufixo da própria bot. Apagar exige confirmação e o Telegram limita a gestão a conjuntos permitidos/criados pela bot. Não transfere propriedade de conjuntos de terceiros nem converte arquivos arbitrários.

## 7. Mini App pessoal com autenticação verificada

Configure HTTPS público e:

```dotenv
TELEGRAM_MINI_APP_ENABLED=true
TELEGRAM_MINI_APP_URL=https://seu-dominio/miniapp.html
```

Configure a Mini App/BotFather conforme o modo de abertura que desejar. `/miniapp` no privado oferece botão Web App. `/telegram menu` configura o menu nativo. Abrir apenas a URL num navegador comum **não autentica**: a página orienta a abrir pelo Telegram.

O servidor verifica HMAC-SHA-256 de initData usando o token e a chave WebAppData, rejeita campos duplicados, assinatura incorreta e auth_date com mais de cinco minutos ou mais de 30s no futuro. Não aceita initDataUnsafe como identidade. A sessão aleatória dura 15 minutos, fica somente em memória na página e é guardada como hash no servidor. Reabra pelo Telegram quando expirar.

Funcionalidades: plano/uso, busca de comandos públicos, lembretes privados próprios, produtos Stars disponíveis e faturas próprias. O destino do lembrete é imposto pelo servidor ao ID autenticado; parâmetros arbitrários de userId/chatId do navegador não são aceitos para mudar a identidade. Inicie /start no privado para receber lembretes.

A Mini App não concede automaticamente uma conta de dono no painel. Contas administrativas continuam usando o fluxo de vínculo e permissões da Central. A assinatura impede falsificação sem o token, mas não torna seguro um servidor/SDK comprometido. Use HTTPS, proteja o token e revogue sessões em caso de incidente.

## 8. Stars para VIP digital — desligado até configurar

É uma implementação de **compras únicas de VIP por prazo**, não de assinaturas recorrentes. Não processa cartão, PIX, bens físicos, frete, provider tokens de terceiros, transferências ou saques.

O operador deve definir termos comerciais reais, suporte e catálogo antes de ativar:

```dotenv
TELEGRAM_STARS_ENABLED=true
TELEGRAM_TERMS_URL=https://seu-dominio/termos
TELEGRAM_PAY_SUPPORT=Contato real de atendimento para compras e reembolsos
```

Na página `/plataforma.html`, dono cadastra ID, título, plano, preço inteiro em Stars e dias. Não há catálogo ativo nem preço comercial arbitrado automaticamente. A flag global, termos HTTPS e suporte precisam estar configurados, além do produto ativo.

```text
/comprar
/comprar ID_PRODUTO
/termos
/paysupport
```

No Mini App, o botão abre checkout nativo; abrir a página não cobra. O payload da fatura é aleatório e vinculado ao usuário, valor e snapshot do produto no servidor. Encaminhar/linkar uma fatura não permite outra pessoa pagar como se fosse o comprador original. Produto alterado depois não muda o preço de uma fatura já criada.

Pre-checkout verifica identidade, moeda XTR, valor, estado e expiração e responde sem entrar na fila de mensagens comuns. Telegram exige resposta em até 10s; falhas reais de rede ainda podem impedir a conclusão. Nenhum benefício é concedido por callback do navegador.

Somente successful_payment validado contra a fatura concede VIP em transação SQLite, com charge_id único e idempotência. Reenvio da confirmação não duplica o benefício. Plano superior vigente não é rebaixado; VIP vitalício bloqueia novas faturas para evitar cobrança sem benefício. Um pagamento já realizado continua sendo honrado mesmo que novas vendas tenham sido desativadas.

### Reembolsos e conciliação

Somente dono, no painel, com confirmação explícita. O sistema usa refundStarPayment e registra etapa pendente antes da chamada. Em falha de rede/5xx ou falha de registro posterior, marca `refund_review` e **não permite repetir automaticamente** uma operação financeira de resultado incerto. Concilie as transações no Telegram e os eventos de reembolso antes de qualquer intervenção manual.

Se o benefício atual ainda corresponde exatamente ao snapshot concedido, restaura o anterior. Se houve compra, uso ou concessão posterior que alterou o registro, preserva o VIP e exige revisão manual para não revogar outra aquisição. Reembolsos informados por update também são conciliados contra usuário, charge e valor. Operações remotas e SQLite não formam transação distribuída; reconciliação humana ainda pode ser necessária.

Não há garantia de tratamento jurídico, tributário, antifraude por contas alternativas ou de disputa de pagamento. O operador deve definir políticas e atender usuários. **Nenhuma cobrança ou devolução real foi executada nesta atualização.**

## 9. Telegram Business com consentimento por conexão

```dotenv
TELEGRAM_BUSINESS_ENABLED=true
```

Habilite a capacidade Business no BotFather e conecte a bot a uma conta Business elegível no Telegram, com os direitos desejados. Esses requisitos externos não são criados pelo código.

Cada conexão recebida começa com automação **desligada**. Só pode ser ativada se pertencer a um ID configurado como dono da bot e estiver habilitada no Telegram. Regras são de frase inteira, sem diferenciar maiúsculas:

```text
/business listar
/business filtro ID_CONEXAO | horário | Atendemos de segunda a sexta.
/business on ID_CONEXAO
/business off ID_CONEXAO
```

Dono também gerencia conexões/regras no painel Plataforma. O módulo checa direito can_reply, estado da conexão e lista de donos antes de responder. Ignora mensagens do próprio dono, de bots e enviadas por business bots, para evitar loops. Intervalo de 10s por conversa. Não executa comandos administrativos a partir de mensagem comercial.

Não armazena textos das conversas recebidas; guarda configurações, regras e eventos mínimos. Não implementa CRM completo, stories, gestão de presentes, saldo, transferências ou acesso irrestrito à conta comercial. Revogar a conexão/direito para responder impede novas respostas.

## 10. Webhook autenticado ou polling

Polling é o padrão. Agora a inicialização não descarta os updates pendentes automaticamente. Não rode polling e webhook para o mesmo token.

Para webhook, o servidor do painel precisa estar habilitado, com proxy HTTPS público e:

```dotenv
TELEGRAM_TRANSPORT=webhook
TELEGRAM_WEBHOOK_URL=https://seu-dominio/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=SEGREDO_ALEATORIO_INDEPENDENTE_DO_TOKEN
```

Gere o segredo com `openssl rand -hex 32`; são aceitos 32–256 caracteres ASCII permitidos. O endpoint valida o header X-Telegram-Bot-Api-Secret-Token em tempo constante, exige update_id válido e deduplica updates concluídos em SQLite. Update simultâneo em processamento recebe 503 para tentar depois; falhas recebem estado de retentativa. Estados são retidos por até dois dias. A janela de processamento é de dois minutos, não uma garantia de exactly-once para efeitos remotos.

O registro do webhook é uma ação externa feita na inicialização somente se o transporte escolhido é webhook. A aplicação não instala proxy/certificado. O polling pode remover um webhook anterior ao ser iniciado, conforme o comportamento do Telegraf: escolha o transporte deliberadamente. Ao parar uma instância webhook, o cadastro fica no Telegram para que ele possa tentar novamente quando o serviço voltar.

`allowed_updates` seleciona mensagens, edições, canais, conexões/mensagens Business, inline, callbacks, pagamentos, associação, pedidos de entrada e polls. A lista não ativa todos os eventos existentes nem coleta reações/boosts por padrão. Tipos sem fluxo implementado não recebem comportamento fictício.

## 11. Catálogo e cliente interno da Bot API

- `docs/TELEGRAM-CATALOGO.md`: índice de 185 métodos, com links oficiais e parâmetros obrigatórios de primeiro nível.
- `docs/telegram-metodos.json`: catálogo gerado de @grammyjs/types 5.0.0, MIT. A versão do pacote de tipos não é a versão numérica da Bot API.
- `core/plataforma/bot-api.js` + `.d.ts`: cliente interno tipado para extensões, com lista de métodos e validação mínima de parâmetros obrigatórios.
- `npm run catalogo:telegram`: regenera o catálogo a partir da dependência instalada.
- `npm run test:types`: verifica exemplos positivos e negativos de tipos.

Esse cliente não é um sandbox nem decide autorização do usuário. O módulo chamador deve impor permissões e validar dados/efeitos; o Telegram também aplica seus direitos. **Não existe endpoint público de “executar qualquer método”.** Ter um método no catálogo/cliente não significa ter interface, regra de negócio, configuração externa ou homologação para ele.

## 12. Validação e limites

- 101 testes automatizados passaram, incluindo os 66 anteriores. Relatório: docs/testes-v5.tap.
- Verificação de tipos do cliente Bot API passou. A checagem estrita de todo o legado JS não foi tratada como concluída.
- Sintaxe JS/MJS verificada; npm audit não reportou vulnerabilidades na execução.
- Chromium: Central anterior; editor de produto sem cobrança; decisão de pedido simulado; regra Business; Mini App com SDK e initData de teste, lembretes e cancelamento; catálogo comercial desligado; busca de comandos e viewport de 390px.
- Capturas em docs/plataforma-v5-simulacao.png e docs/miniapp-v5-simulacao.png são de dados e identidade simulados, não de compra/Business real.
- Bot API e pagamentos nos testes novos foram simulados. Não houve implantação HTTPS, configuração real de BotFather, checkout Stars, reembolso real, conexão Business real, webhook externo ou nova homologação Telegram nesta rodada.
- O ZIP não contém token real, credenciais de produção, banco do usuário, backups ou node_modules.

A versão 4.0 continua descrita no GUIA-4.0.md. Esta versão acrescenta a plataforma, sem prometer paridade total com todas as famílias de APIs do Telegram.

## 13. Privacidade, backup e restauração

Backup SQLite abrange também todas as tabelas `platform_*`: produtos, faturas e snapshots VIP, regras/conexões Business, pedidos, eventos, rascunhos e hashes de sessões. É material privado. Proteja o arquivo com controles de acesso e retenção apropriada; a rotina conserva até sete backups locais. Apagar um dado do banco atual não o remove dos backups já existentes.

A manutenção expira sessões e rascunhos, conserva estados de webhook por dois dias e pedidos por 30 dias. Eventos são limitados a 2.000 registros. Faturas/charges não são apagadas automaticamente para preservar conciliação e idempotência. Não foi implementado um portal automático de exclusão de todos os dados pessoais; pedidos de privacidade exigem tratamento do operador, com análise das obrigações de retenção e dos backups. Não remova o histórico de charges só para “limpar” o banco.

Ao restaurar, o script apaga sessões administrativas/Mini App e rascunhos restaurados e desliga automações Business. Usuários precisam entrar de novo e conexões precisam de opt-in novamente. **Antes de restaurar, desligue Stars e revise os pagamentos/reembolsos posteriores ao backup antes de reativar vendas.** Uma restauração local não desfaz operações financeiras do Telegram, não recupera os registros posteriores ao backup e não equivale a conciliação automática.

Para repetir a QA visual isolada: `npx playwright install chromium` e `npm run test:platform-ui`. Pode ser necessário instalar as bibliotecas do Chromium no sistema. O script força banco em memória, token fictício e APIs/SDK simulados; não inicia polling nem acessa Telegram real. Para guardar capturas, use UI_SCREENSHOTS_DIR apontando para uma pasta de sua escolha.

### CI no GitHub

O exemplo `docs/CI-TESTES-EXEMPLO.yml` executa testes em Node 22/24. Para ativá-lo, copie para `.github/workflows/test.yml` com uma credencial que tenha permissão de alterar workflows. A publicação desta versão não ativou Actions, pois o token autorizado não tinha esse escopo. Os resultados locais descritos acima continuam válidos; não são resultados de execução do CI remoto.
