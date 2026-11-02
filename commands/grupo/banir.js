import { aplicarModeracao } from '../../core/moderacao.js';
import botConfig from '../../config/index.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Expulsa um membro do grupo';
export const aliases = ['kick', 'expulsar'];
export const uso = '/banir (respondendo a mensagem)';
export const soGrupo = true;
export const soAdmin = true;
export default async function banir(ctx) {
  const respondida = ctx.respondida;
  const alvo =
    respondida && 'from' in respondida && respondida.from
      ? { id: String(respondida.from.id), nome: respondida.from.first_name }
      : /^\d+$/.test(ctx.args[0] ?? '')
        ? { id: ctx.args[0] ?? '', nome: `ID ${ctx.args[0]}` }
        : null;
  if (!alvo) {
    await ctx.uso(
      `${ctx.prefix}banir (respondendo a mensagem)`,
      'Responda a mensagem de quem voce quer expulsar.'
    );
    return;
  }
  if (botConfig.ehDono(alvo.id)) {
    await ctx.erro('Nao vou expulsar o dono do bot. ');
    return;
  }
  try {
    await aplicarModeracao(ctx.waguri.telegram,{chatId:ctx.chatId,userId:alvo.id,ator:ctx.userId,tipo:'banir',motivo:ctx.q});
    await ctx.responderComApagar(` <b>${escapeHtml(alvo.nome)}</b> foi removido do grupo.`);
  } catch {
    await ctx.erro(
      'Nao consegui remover. Confere se eu sou admin e se essa pessoa nao e admin tambem.'
    );
  }
}
