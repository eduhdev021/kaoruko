# Escopo da atualização 4.0

| Área solicitada | Entrega | Limite importante |
|---|---|---|
| CAPTCHA | Desafio persistente, usuário vinculado, prazo e política explícita | Desafio matemático simples, não prova de humanidade |
| Anti-raid | Detecção de entradas e verificação temporária | Não fecha chat nem faz remoção em massa |
| Antispam | Repetição, links parcialmente ofuscados, allowlist de domínios | Não cobre toda ofuscação ou OCR |
| Advertências automáticas | Limite e silêncio/expulsão opcionais | Desligado por padrão; ação ao atingir exatamente o limite |
| Histórico e desfazer | Histórico por grupo e reversão de ações suportadas | Ações externas não são conhecidas; Telegram/SQLite não são uma transação única |
| Painel completo | Nova Central com configuração, biblioteca, fila, moderação e atividade | Mídia inicial capturada pelo Telegram, não upload web |
| Acesso por grupo | Conta vinculada pelo dono e admin confirmado por requisição | Não há Telegram Login automático/autovínculo |
| Exportar/importar | JSON validado e transacional por grupo | Até 100 KB por chamada, sem contas/tarefas/histórico |
| Publicações | Únicas e recorrentes com fila persistente | Texto simples e entrega ao menos uma vez, sujeita a duplicação em falhas |
| Notas ricas | File IDs de mídia e botões HTTPS | Arquivos continuam dependendo da disponibilidade no Telegram |
| Reputação e níveis | Agradecimento com limite de 24h e níveis | Não evita fraude por contas alternativas |
| Comandos personalizados | Atalhos locais que usam o roteador | Não sobrescrevem comandos nativos |
| Backups | Automáticos, retenção, download do dono e CLI de restauração | Local e sem criptografia; exige cópia externa |
| Monitoramento | Liveness, readiness do worker, integridade e filas | Não é monitoramento externo nem alerta por SMS/e-mail |
| Revisão de legado | Console fechado, validadores, limites OKARUN e fallback de downloads | Não houve teste de cada rota externa ou auditoria exaustiva |
| Testes | 66 testes + cenários Chromium desktop/mobile | Telegram real e infraestrutura de produção pendentes |

A entrega não inclui federações, CAS, classificadores de conteúdo por IA, reconhecimento de imagem ou proteção distribuída multi-instância. Esses itens não foram apresentados como concluídos.

O ZIP não contém credenciais, banco do usuário, backups de produção nem node_modules. Os dados nas capturas e os adaptadores Telegram usados nos testes são de homologação simulada.
