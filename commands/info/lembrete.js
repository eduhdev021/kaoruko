import { criarLembrete, listarLembretes, cancelarLembrete, duracaoMs } from '../../core/lembretes.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description = 'Agenda lembretes que sobrevivem ao reinicio da bot';
export const aliases = ['lembrar'];
export const uso = '/lembrete 10m beber agua | /lembrete listar | /lembrete cancelar ID';
export default async function lembrete(ctx) {
  const acao = ctx.args[0]?.toLowerCase();
  if (acao === 'listar') {
    const lista = listarLembretes(ctx.userId);
    return ctx.responderComApagar(lista.length ? lista.map(x => `#${x.id} · ${new Date(x.vence_em).toLocaleString('pt-BR', {timeZone: ctx.botConfig.timezone})} · ${escapeHtml(x.texto.slice(0, 100))}`).join('\n') : 'Nenhum lembrete pendente.');
  }
  if (acao === 'cancelar') {
    if (!/^\d+$/.test(ctx.args[1] ?? '')) return ctx.erro('Informe o ID do lembrete.');
    return ctx.responderComApagar(cancelarLembrete(ctx.userId, ctx.args[1]) ? 'Lembrete cancelado.' : 'Lembrete nao encontrado para sua conta.');
  }
  const atraso = duracaoMs(acao);
  if (!atraso) return ctx.erro(`${uso}\nPrazo: 10s ate 30d. Unidades: s, m, h, d.`);
  try {
    const id = criarLembrete(ctx.userId, ctx.chatId, ctx.args.slice(1).join(' '), atraso);
    return ctx.responderComApagar(`Lembrete #${id} agendado neste chat. Use /lembrete listar para consultar.`);
  } catch (err) { return ctx.erro(escapeHtml(err.message)); }
}
