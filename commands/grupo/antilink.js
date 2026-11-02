import { configurarGrupo, configGrupo } from '../../core/comunidade.js';
export const description = 'Liga ou desliga a remocao de links enviados por membros';
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/antilink on | off';
export default async function antilink(ctx) {
  const acao = ctx.q.toLowerCase();
  if (!acao) return ctx.responderComApagar(`Antilink: ${configGrupo(ctx.chatId).antilink ? 'ativado' : 'desativado'}. Use /antilink on ou off. Administradores sao isentos.`);
  if (!['on', 'off'].includes(acao)) return ctx.erro(uso);
  if (acao === 'on') {
    const eu = await ctx.waguri.telegram.getMe();
    const membro = await ctx.waguri.telegram.getChatMember(ctx.chatId, eu.id);
    if (!['administrator', 'creator'].includes(membro.status) || (membro.status === 'administrator' && !membro.can_delete_messages)) {
      return ctx.erro('Preciso ser administrador com permissao de apagar mensagens.');
    }
  }
  configurarGrupo(ctx.chatId, 'antilink', acao === 'on' ? 1 : 0);
  return ctx.responderComApagar(`Antilink ${acao === 'on' ? 'ativado' : 'desativado'}.`);
}
