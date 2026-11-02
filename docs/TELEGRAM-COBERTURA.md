# Matriz de cobertura — Kaoruko 5.0

**Significado:** “fluxo implementado” é código de aplicação com controles e testes locais; não significa homologação real. “cliente/catálogo” permite desenvolvimento interno, não aciona um recurso por si só.

| Família | Situação nesta versão | Configuração/limite |
|---|---|---|
| Comandos, menus e perfil | Fluxos /telegram, sincronização e escopos | Alteração explícita do dono; até 100 comandos por escopo |
| Mensagens e mídias | Biblioteca rica anterior, álbuns, file IDs, contatos e localização | Sem downloader local novo; sem leitura do histórico não recebido |
| Botões e callbacks | Fluxos existentes + confirmação vinculada ao ator | Prazos e consumo único; operações remotas podem exigir revisão após falha |
| Grupos e moderação | Recursos 4.0 preservados | Homologação real completa anterior ainda tem pendências |
| Tópicos/fóruns | Criar, editar, abrir, fechar e excluir com confirmação | Chat precisa ter fóruns e direitos adequados |
| Canais | Info e publicação confirmada com texto/mídia | Admin consultado antes e na confirmação; sem gerador de conteúdo automático |
| Convites | Temporários, pedido de entrada e revogação de links próprios | Não gerencia convites desconhecidos de terceiros |
| Join requests | Receber, listar, aprovar/recusar por comando/painel | Decisão manual; sem aprovação automática por perfil |
| Inline | Artigos de ajuda dos comandos públicos | Ativação no BotFather e no ambiente; sem pesquisa de notas privadas |
| Polls e quizzes | Enquete existente e novo quiz | Primeira opção correta; limites do Telegram |
| Reações e pins | Aplicar reação e fixar/desafixar mensagem respondida | Não coleta todas as reações de membros |
| Stickers | Reenvio e gestão básica de conjuntos próprios | Sem conversor universal nem alteração de packs de terceiros |
| Mini App | Autenticação HMAC, conta, uso, lembretes, produtos/faturas | HTTPS e abertura autenticada no Telegram; não é Telegram Login para toda a Central |
| Stars | VIP digital por prazo, checkout, confirmação idempotente e reembolso | Desligado; precisa termos, suporte e produtos; sem transações reais nesta entrega |
| Assinaturas Stars recorrentes | Apenas referência/cliente de API onde aplicável | Não há produto de assinatura recorrente configurado |
| Bens físicos e providers de cartão | Não implementado como fluxo | Exige negócio, provider token, frete e regras próprias |
| Business | Conexão, opt-in, regras exatas e revogação | Conta elegível, BotFather e rights; sem CRM ou acesso geral à conta |
| Webhook/polling | Transportes opcionais, secret header e deduplicação | HTTPS externo precisa ser implantado; um transporte por token |
| Metadados de associação/canais | Eventos mínimos registrados | Sem armazenamento geral de mensagens comerciais |
| Web App data sem assinatura | Recusado como identidade | Não concede privilégios a partir de dados enviados pelo cliente |
| Gifts, saldo, boosts, stories e paid media | Cliente/catálogo para extensão; sem fluxo de produto | Nenhuma compra/transferência/publicação desses itens foi ativada |
| Games, Passport e verificações especiais | Cliente/catálogo para extensão; sem fluxo de produto | Exigem produto, criptografia/consentimentos ou permissões específicas |
| Guest/managed bots e demais tipos novos | Sem fluxo de produto nesta versão | Não ativados em massa só por existirem na referência |
| MTProto/TDLib e conta de usuário | Fora do escopo escolhido | Token de bot não é sessão de conta pessoal; não foi criado userbot |
| Métodos catalogados | 185 a partir de @grammyjs/types 5.0.0 | Versão e licença registradas; não garante refletir toda mudança futura da documentação |

Fontes de referência:
- https://core.telegram.org/bots/api
- https://core.telegram.org/bots/features
- https://core.telegram.org/bots/webapps
- https://core.telegram.org/bots/payments-stars
- Tipos @grammyjs/types 5.0.0, licença em LICENCA-GRAMMY-TYPES.txt.

A documentação oficial muda e cobre mais que um bot de gestão. Esta matriz deliberadamente não chama métodos de catálogo de “funcionalidades completas”.
