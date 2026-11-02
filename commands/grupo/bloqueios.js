import { obterAutomacao, salvarAutomacao, TIPOS_BLOQUEIO } from '../../core/automacao.js';
export const description = 'Bloqueia tipos de conteudo no grupo';
export const soGrupo = true;
export const soAdmin = true;
export const uso = '/bloqueios stickers on | /bloqueios stickers off';
export default async function bloqueios(ctx) {
  const c = obterAutomacao(ctx.chatId);
  if (!ctx.q) return ctx.responderComApagar(`Bloqueados: ${c.bloqueios.join(', ') || 'nenhum'}\nTipos: ${TIPOS_BLOQUEIO.join(', ')}\n${uso}`);
  const [tipo, estado] = ctx.args;
  if (!TIPOS_BLOQUEIO.includes(tipo) || !['on','off'].includes(estado)) return ctx.erro(uso);
  salvarAutomacao(ctx.chatId, {bloqueios: estado === 'on' ? [...new Set([...c.bloqueios, tipo])] : c.bloqueios.filter(x => x !== tipo)});
  return ctx.responderComApagar('Bloqueios atualizados. Administradores sao isentos. A bot precisa poder apagar mensagens.');
}
