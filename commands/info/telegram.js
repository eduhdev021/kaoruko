import {requisitosPlataforma,plataforma} from '../../core/plataforma/store.js';
import {getAllCommands} from '../registry.js';
import {escapeHtml} from '../../utils/helpers.js';
export const description='Configura perfil e menu nativo da bot; consulta capacidades';export const soDono=true;export const soPrivado=true;
export default async function telegram(ctx){
 const [acao,...args]=ctx.args,tg=ctx.waguri.telegram;
 if(!acao||acao==='status'){const me=await tg.getMe(),w=await tg.getWebhookInfo();return ctx.responderComApagar(escapeHtml(JSON.stringify({username:me.username,inline:me.supports_inline_queries,business:me.can_connect_to_business,mini:me.has_main_web_app,privacidadeDesligada:me.can_read_all_group_messages,webhook:Boolean(w.url),pendentes:w.pending_update_count,modulos:requisitosPlataforma()},null,2)));}
 if(acao==='stars'){
  const r=await tg.callApi('getStarTransactions',{limit:20});
  return ctx.responderComApagar(escapeHtml((r.transactions||[]).map(t=>`${t.id} · ${t.amount} XTR · ${t.source?.type||t.receiver?.type||'transacao'}`).join('\n')||'Sem transacoes.'));
 }
 if(acao==='sincronizar'){
  const comandos=getAllCommands().filter(c=>!c.soDono&&!c.oculto&&/^[a-z0-9_]{1,32}$/.test(c.name)).slice(0,100).map(c=>({command:c.name,description:(c.description||c.name).slice(0,256)}));
  await tg.callApi('setMyCommands',{commands:comandos,scope:{type:'all_private_chats'}});
  await tg.callApi('setMyCommands',{commands:comandos.filter(c=>!['comprar','miniapp'].includes(c.command)),scope:{type:'all_group_chats'}});
  return ctx.responderComApagar('Menus nativos sincronizados. Os comandos continuam verificando permissoes no servidor.');
 }
 if(acao==='menu'){
  const ready=requisitosPlataforma().mini.pronto;
  await tg.callApi('setChatMenuButton',{menu_button:ready?{type:'web_app',text:'Kaoruko',web_app:{url:plataforma.miniUrl}}:{type:'commands'}});
  return ctx.responderComApagar(ready?'Botao da Mini App configurado.':'Botao de comandos configurado; Mini App nao esta pronta.');
 }
 const texto=args.join(' '),m={nome:['setMyName','name',64],descricao:['setMyDescription','description',512],resumo:['setMyShortDescription','short_description',120]}[acao];
 if(!m||!texto||texto.length>m[2])return ctx.erro('/telegram status | sincronizar | menu | nome TEXTO | descricao TEXTO | resumo TEXTO');
 await tg.callApi(m[0],{[m[1]]:texto});return ctx.responderComApagar('Perfil atualizado no Telegram.');
}
