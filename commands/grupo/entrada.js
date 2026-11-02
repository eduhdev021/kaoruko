import {db} from '../../core/plataforma/store.js';
import {decidirEntrada,exigirAdminTelegram} from '../../core/plataforma/fluxos.js';
export const description='Lista e aprova/recusa pedidos de entrada manualmente';export const soGrupo=true;export const soAdmin=true;
export default async function entrada(ctx){
 const [acao,user]=ctx.args;
 await exigirAdminTelegram(ctx.waguri.telegram,ctx.chatId,ctx.userId);
 if(!acao||acao==='listar'){
  const rows=db.prepare("SELECT user_id,nome FROM platform_join WHERE chat_id=? AND status='pending' ORDER BY em DESC LIMIT 30").all(String(ctx.chatId));
  try{await ctx.waguri.telegram.sendMessage(Number(ctx.userId),rows.map(x=>`${x.user_id} · ${x.nome}`).join('\n')||'Sem pedidos pendentes.');return ctx.responderComApagar('Lista enviada no seu privado.');}catch{return ctx.erro('Abra o privado da bot e envie /start antes de listar pedidos.');}
 }
 if(!['aprovar','recusar'].includes(acao)||!/^\d+$/.test(user||''))return ctx.erro('/entrada listar | aprovar ID | recusar ID');
 await decidirEntrada(ctx.waguri.telegram,ctx.chatId,user,ctx.userId,acao==='aprovar');return ctx.responderComApagar('Pedido processado.');
}
