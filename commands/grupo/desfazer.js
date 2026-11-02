import { desfazerModeracao } from '../../core/moderacao.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description='Desfaz acao reversivel registrada no historico';
export const soGrupo=true;export const soAdmin=true;
export default async function desfazer(ctx){
 if(!/^\d+$/.test(ctx.args[0]||''))return ctx.erro('/desfazer ID_DO_HISTORICO');
 try{await desfazerModeracao(ctx.waguri.telegram,ctx.chatId,ctx.args[0],ctx.userId);}catch(e){return ctx.erro(escapeHtml(e.message));}
 return ctx.responderComApagar('Acao desfeita. Um desbanimento permite retornar, mas nao reinsere o membro automaticamente.');
}
