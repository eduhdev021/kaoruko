import { configurarGrupo, configGrupo } from '../../core/comunidade.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Consulta ou configura as regras do grupo';
export const soGrupo = true;
export const uso = '/regras | /regras definir texto | /regras limpar';
export default async function regras(ctx) {
  if (!ctx.q) return ctx.responderComApagar(`<b>REGRAS DO GRUPO</b>\n\n${escapeHtml(configGrupo(ctx.chatId).regras || 'Nenhuma regra configurada.')}`);
  if (!ctx.isDono && !await ctx.garantirAdmin()) return ctx.erro('Somente administradores podem alterar as regras.');
  if (ctx.q.toLowerCase() === 'limpar') configurarGrupo(ctx.chatId, 'regras', '');
  else {
    const texto = ctx.q.replace(/^definir\s+/i, '');
    if (texto.length > 2000) return ctx.erro('Use ate 2000 caracteres.');
    configurarGrupo(ctx.chatId, 'regras', texto);
  }
  return ctx.responderComApagar('Regras atualizadas.');
}
