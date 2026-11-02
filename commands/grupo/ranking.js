import { obterAutomacao, salvarAutomacao, rankingGrupo, limparRanking } from '../../core/automacao.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Ranking local de atividade com coleta opcional';
export const soGrupo = true;
export const uso = '/ranking | /ranking on | /ranking off | /ranking limpar';
export default async function ranking(ctx) {
  const acao = ctx.q.toLowerCase();
  if (acao) {
    if (!ctx.isDono && !await ctx.garantirAdmin()) return ctx.erro('Somente administradores configuram o ranking.');
    if (!['on','off','limpar'].includes(acao)) return ctx.erro(uso);
    if (acao === 'limpar') limparRanking(ctx.chatId);
    else salvarAutomacao(ctx.chatId, {ranking: acao === 'on'});
    return ctx.responderComApagar('Ranking atualizado. Coleta somente ID, primeiro nome e contagem; nao salva o texto das mensagens.');
  }
  const config = obterAutomacao(ctx.chatId);
  const lista = rankingGrupo(ctx.chatId);
  return ctx.responderComApagar(`<b>RANKING DO GRUPO</b>\nColeta: ${config.ranking ? 'ativa' : 'desativada'}\n\n` +
    (lista.map((x,i) => `${i+1}. ${escapeHtml(x.nome)} — ${x.mensagens} pontos`).join('\n') || 'Sem dados. Um admin pode ativar com /ranking on.') + '\n\nNo maximo 1 ponto por pessoa a cada 30s. Nao e uma contagem exata de mensagens.');
}
