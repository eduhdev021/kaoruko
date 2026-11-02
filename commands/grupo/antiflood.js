import { obterAutomacao, salvarAutomacao } from '../../core/automacao.js';
export const description = 'Remove excesso de mensagens por pessoa em uma janela de tempo';
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/antiflood 6 10 | /antiflood off';
export default async function antiflood(ctx) {
  if (!ctx.q) { const c = obterAutomacao(ctx.chatId); return ctx.responderComApagar(c.antiflood ? `Antiflood: ${c.antiflood} mensagens em ${c.janela}s. Excedentes sao apagadas; nao ha banimento.` : `Desativado. ${uso}`); }
  if (ctx.q === 'off') salvarAutomacao(ctx.chatId, {antiflood: 0});
  else {
    const limite = Number(ctx.args[0]), janela = Number(ctx.args[1]);
    if (!Number.isInteger(limite) || limite < 3 || limite > 30 || !Number.isInteger(janela) || janela < 5 || janela > 60) return ctx.erro('Use /antiflood LIMITE SEGUNDOS. Limite: 3 a 30; janela: 5 a 60s.');
    salvarAutomacao(ctx.chatId, {antiflood: limite, janela});
  }
  return ctx.responderComApagar('Antiflood atualizado. Exige permissao para apagar mensagens. Administradores sao isentos.');
}
