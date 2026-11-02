import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Chama administradores para revisar uma mensagem';
export const aliases = ['report'];
export const soGrupo = true;
export const cooldown = 60;
export const uso = '/denunciar motivo (respondendo a mensagem)';
export default async function denunciar(ctx) {
  if (!ctx.respondida?.from || ctx.respondida.from.is_bot) return ctx.erro('Responda a mensagem de um membro para solicitar revisao.');
  const admins = await ctx.waguri.telegram.getChatAdministrators(ctx.chatId);
  const mencoes = admins.filter(x => !x.user.is_bot).slice(0, 10).map(x => `<a href="tg://user?id=${x.user.id}">${escapeHtml(x.user.first_name)}</a>`).join(', ');
  return ctx.waguri.telegram.sendMessage(ctx.chatId,
    `<b>DENUNCIA PARA REVISAO</b>\nSolicitante: ${escapeHtml(ctx.nome)}\nMembro: ${ctx.respondida.from.id}\nMotivo: ${escapeHtml(ctx.q.slice(0,300) || 'Revisar mensagem respondida')}\n\n${mencoes || 'Administradores nao encontrados.'}\nNenhuma punicao automatica foi aplicada.`,
    {parse_mode: 'HTML', reply_parameters: {message_id: ctx.respondida.message_id, allow_sending_without_reply: true}});
}
