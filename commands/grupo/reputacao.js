import { db } from '../../core/db.js';
import { salvarGestao } from '../../core/gestao-store.js';
import { reputacaoGrupo,darReputacao } from '../../core/recursos.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description='Reputacao por agradecimento, com niveis e limite diario';
export const soGrupo=true;
export default async function reputacao(ctx){
 if(['on','off','limpar'].includes(ctx.q)){
   if(!ctx.isDono&&!await ctx.garantirAdmin())return ctx.erro('Somente administradores configuram reputacao.');
   if(ctx.q==='limpar')db.transaction(()=>{db.prepare('DELETE FROM reputacao_grupo WHERE chat_id=?').run(String(ctx.chatId));db.prepare('DELETE FROM votos_reputacao WHERE chat_id=?').run(String(ctx.chatId));})();
   else salvarGestao(ctx.chatId,{reputacao:ctx.q==='on'});
   return ctx.responderComApagar('Reputacao atualizada.');
 }
 if(ctx.q==='+'){
   const alvo=ctx.respondida?.from;if(!alvo)return ctx.erro('Responda a mensagem de quem deseja agradecer com /reputacao +');
   try{darReputacao(ctx.chatId,ctx.userId,alvo);return ctx.responderComApagar('Agradecimento registrado: +1 de reputacao.');}catch(e){return ctx.erro(escapeHtml(e.message));}
 }
 return ctx.responderComApagar(reputacaoGrupo(ctx.chatId).map((x,i)=>`${i+1}. ${escapeHtml(x.nome)} · ${x.pontos} pontos · nivel ${x.nivel}`).join('\n')||'Sem dados. Admin: /reputacao on. Para agradecer, responda com /reputacao +');
}
