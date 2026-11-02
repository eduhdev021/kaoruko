import { configGestao,salvarGestao } from '../../core/gestao-store.js';
export const description='Remove a terceira repeticao consecutiva de texto em 30s';
export const soGrupo=true;export const soAdmin=true;
export default async function antispam(ctx){
 if(!ctx.q)return ctx.responderComApagar(`Antispam: ${configGestao(ctx.chatId).duplicadas?'on':'off'}. Use /antispam on ou off.`);
 if(!['on','off'].includes(ctx.q))return ctx.erro('/antispam on | off');
 salvarGestao(ctx.chatId,{duplicadas:ctx.q==='on'});return ctx.responderComApagar('Antispam atualizado. Aplica-se a textos/legendas com pelo menos 20 caracteres; administradores sao isentos.');
}
