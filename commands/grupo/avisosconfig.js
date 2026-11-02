import { salvarGestao,configGestao } from '../../core/gestao-store.js';
import { duracaoMs } from '../../core/lembretes.js';
export const description='Configura punicao ao atingir limite de advertencias';
export const soGrupo=true;export const soAdmin=true;
export default async function avisosconfig(ctx){
 if(!ctx.q){const c=configGestao(ctx.chatId);return ctx.responderComApagar(`Limite: ${c.avisosLimite} · acao: ${c.avisosAcao}. /avisosconfig 3 silenciar 10m | /avisosconfig off`);}
 try{
 if(ctx.q==='off')salvarGestao(ctx.chatId,{avisosLimite:0,avisosAcao:'nenhuma'});
 else salvarGestao(ctx.chatId,{avisosLimite:Number(ctx.args[0]),avisosAcao:ctx.args[1],avisosDuracao:ctx.args[1]==='silenciar'?duracaoMs(ctx.args[2])/1000:600});
 }catch(e){return ctx.erro(e.message);}
 return ctx.responderComApagar('Politica de advertencias salva. A acao ocorre ao atingir exatamente o limite; limpe os avisos para iniciar outro ciclo.');
}
