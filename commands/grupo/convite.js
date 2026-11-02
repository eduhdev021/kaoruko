import {db} from '../../core/plataforma/store.js';
import {criarConviteTelegram,exigirAdminTelegram} from '../../core/plataforma/fluxos.js';
import {duracaoMs} from '../../core/lembretes.js';
import {escapeHtml} from '../../utils/helpers.js';
export const description='Convites temporarios e convites com pedido de entrada';export const soGrupo=true;export const soAdmin=true;
export default async function convite(ctx){
 const [acao,arg]=ctx.args,tg=ctx.waguri.telegram;
 if(acao==='revogar'){
  await exigirAdminTelegram(tg,ctx.chatId,ctx.userId);
  const row=db.prepare('SELECT * FROM platform_invites WHERE link=? AND chat_id=? AND revogado=0').get(arg,String(ctx.chatId));if(!row)return ctx.erro('Informe um convite ativo criado por esta bot neste grupo.');
  await tg.callApi('revokeChatInviteLink',{chat_id:ctx.chatId,invite_link:arg});db.prepare('UPDATE platform_invites SET revogado=1 WHERE link=?').run(arg);return ctx.responderComApagar('Convite revogado.');
 }
 if(!['direto','solicitar'].includes(acao))return ctx.erro('/convite direto 1h | solicitar 1h | revogar LINK');
 const segundos=duracaoMs(arg||'1h')/1000;const r=await criarConviteTelegram(tg,ctx.chatId,ctx.userId,{solicitar:acao==='solicitar',segundos});
 return ctx.responderComApagar(`Convite temporario: ${escapeHtml(r.invite_link)}\n${acao==='solicitar'?'Exige aprovacao; consulte /entrada listar.':'Entrada direta.'}`);
}
