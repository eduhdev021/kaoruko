import { advertirComAcao } from '../../core/moderacao.js';
import botConfig from '../../config/index.js';
export const description = 'Registra, consulta ou limpa advertencias com politica de punicao opcional';
export const soGrupo = true;
export const soAdmin = true;
export const aliases = ['warn'];
export const uso = '/advertir [ver|limpar] respondendo a mensagem';
export default async function advertir(ctx) {
  const alvo = ctx.respondida?.from;
  if (!alvo || alvo.is_bot) return ctx.erro('Responda a mensagem de um membro.');
  const acao = ctx.args[0] || 'adicionar';
  if (!['ver', 'limpar', 'adicionar'].includes(acao)) return ctx.erro(uso);
  if (acao === 'adicionar') {
    const membro = await ctx.waguri.telegram.getChatMember(ctx.chatId, alvo.id);
    if (botConfig.ehDono(alvo.id) || ['creator', 'administrator'].includes(membro.status)) return ctx.erro('Nao aplico advertencias a donos ou administradores.');
  }
  const {total,punicao} = await advertirComAcao(ctx.waguri.telegram,{chatId:ctx.chatId,userId:alvo.id,ator:ctx.userId,acao});
  return ctx.responderComApagar(`Usuario ${alvo.id}: ${total} advertencia(s). ${punicao?`Acao aplicada: ${punicao}.`:"Politica configuravel em /avisosconfig."}`);
}
