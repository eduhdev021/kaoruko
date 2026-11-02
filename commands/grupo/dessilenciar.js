import { aplicarModeracao } from '../../core/moderacao.js';
export const description = 'Remove restricao individual respeitando permissoes padrao do grupo';
export const aliases = ['unmute'];
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/dessilenciar (respondendo a mensagem)';
export default async function dessilenciar(ctx) {
  const alvo = ctx.respondida?.from;
  if (!alvo || alvo.is_bot) return ctx.erro('Responda a mensagem do membro.');
  await aplicarModeracao(ctx.waguri.telegram,{chatId:ctx.chatId,userId:alvo.id,ator:ctx.userId,tipo:'dessilenciar'});
  return ctx.responderComApagar(`Restricoes de ${alvo.id} ajustadas ao padrao do grupo.`);
}
