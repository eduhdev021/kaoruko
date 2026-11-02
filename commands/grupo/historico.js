import { historicoModeracao } from '../../core/gestao-store.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description='Mostra as ultimas acoes de moderacao do grupo';
export const soGrupo=true;export const soAdmin=true;
export default async function historico(ctx){return ctx.responderComApagar(historicoModeracao(ctx.chatId,15).map(x=>`#${x.id} ${escapeHtml(x.tipo)} · alvo ${escapeHtml(x.user_id||'—')} · ${escapeHtml(x.ator)}${x.desfeito?' (desfeito)':''}`).join('\n')||'Nenhuma acao registrada.');}
