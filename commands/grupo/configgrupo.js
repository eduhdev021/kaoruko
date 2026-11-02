import { configGestao } from '../../core/gestao-store.js';
import { configGrupo } from '../../core/comunidade.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Mostra a configuracao e as permissoes da bot no grupo';
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/configgrupo';
export default async function configgrupo(ctx) {
  const config = configGrupo(ctx.chatId);
  const avancada = configGestao(ctx.chatId);
  const eu = await ctx.waguri.telegram.getMe();
  const membro = await ctx.waguri.telegram.getChatMember(ctx.chatId, eu.id);
  return ctx.responderComApagar([
    '<b>CONFIGURACAO DO GRUPO</b>',
    `Grupo: ${escapeHtml(ctx.nomeChat)}`,
    `CAPTCHA: ${avancada.captcha ? 'ativado' : 'desativado'}`,
    `Anti-raid: ${avancada.antiraid ? 'ativado' : 'desativado'}`,
    `Antispam de repeticoes: ${avancada.duplicadas ? 'ativado' : 'desativado'}`,
    `Reputacao: ${avancada.reputacao ? 'ativada' : 'desativada'}`,
    `Antilink: ${config.antilink ? 'ativado' : 'desativado'}`,
    `Boas-vindas: ${config.boasvindas ? 'configuradas' : 'desativadas'}`,
    `Regras: ${config.regras ? 'configuradas' : 'nao definidas'}`,
    `Bot administradora: ${['administrator', 'creator'].includes(membro.status) ? 'sim' : 'nao'}`,
    `Pode apagar mensagens: ${membro.can_delete_messages || membro.status === 'creator' ? 'sim' : 'nao'}`,
    '',
    'Para receber mensagens comuns e aplicar antilink, desative o modo de privacidade no BotFather (/setprivacy) ou mantenha a bot como administradora.',
    'Use /novidades para ver os comandos de configuracao.',
  ].join('\n'));
}
