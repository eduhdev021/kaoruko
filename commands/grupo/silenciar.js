import { aplicarModeracao } from '../../core/moderacao.js';
import botConfig from '../../config/index.js';
import { duracaoMs } from '../../core/lembretes.js';
export const description = 'Silencia temporariamente um membro por resposta';
export const aliases = ['mute'];
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/silenciar 10m (respondendo a mensagem)';
export default async function silenciar(ctx) {
  const alvo = ctx.respondida?.from;
  const prazo = duracaoMs(ctx.args[0] ?? '10m');
  if (!alvo || alvo.is_bot || prazo < 60000) return ctx.erro('Responda a mensagem de um membro e informe prazo de 1m a 30d. Exemplo: /silenciar 10m');
  const membro = await ctx.waguri.telegram.getChatMember(ctx.chatId, alvo.id);
  if (botConfig.ehDono(alvo.id) || ['creator','administrator'].includes(membro.status)) return ctx.erro('Nao silencio donos ou administradores.');
  await aplicarModeracao(ctx.waguri.telegram,{chatId:ctx.chatId,userId:alvo.id,ator:ctx.userId,tipo:'silenciar',duracao:prazo/1000,motivo:ctx.args.slice(1).join(' ')});
  return ctx.responderComApagar(`Membro ${alvo.id} silenciado pelo prazo solicitado. Exige permissao de restringir membros.`);
}
