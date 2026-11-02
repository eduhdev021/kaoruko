import { configurarGrupo, configGrupo } from '../../core/comunidade.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Configura a mensagem para novos membros';
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/boasvindas Bem-vindo, {nome}, ao {grupo}! | /boasvindas off';
export default async function boasvindas(ctx) {
  if (!ctx.q) return ctx.responderComApagar(`Boas-vindas: ${escapeHtml(configGrupo(ctx.chatId).boasvindas || 'desativadas')}\nUse {nome}, {grupo} e {id}.\n${escapeHtml(uso)}`);
  if (ctx.q.length > 1500) return ctx.erro('Use ate 1500 caracteres.');
  configurarGrupo(ctx.chatId, 'boasvindas', ctx.q.toLowerCase() === 'off' ? '' : ctx.q);
  return ctx.responderComApagar('Configuracao de boas-vindas salva.');
}
