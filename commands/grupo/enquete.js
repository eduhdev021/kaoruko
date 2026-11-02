export const description = 'Cria uma enquete nativa do Telegram';
export const soGrupo = true;
export const uso = '/enquete Pergunta | Opcao 1 | Opcao 2';
export default async function enquete(ctx) {
  const [pergunta, ...opcoes] = ctx.q.split('|').map(s => s.trim());
  if (!pergunta || pergunta.length > 300 || opcoes.length < 2 || opcoes.length > 10 || opcoes.some(s => !s || s.length > 100)) return ctx.erro('Use /enquete Pergunta | Opcao 1 | Opcao 2 (2 a 10 opcoes, ate 100 caracteres cada).');
  return ctx.waguri.telegram.sendPoll(ctx.chatId, pergunta, opcoes, { is_anonymous: true });
}
