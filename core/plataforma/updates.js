import {plataforma,eventoPlataforma} from './store.js';
import {preCheckout,confirmarPagamento,processarReembolsoRecebido} from './stars.js';
import {receberConexao,responderBusiness} from './business.js';
import {receberEntrada,confirmarRascunho,coletarAlbum} from './fluxos.js';
import {getAllCommands} from '../../commands/registry.js';
import {logAviso} from '../../utils/logger.js';
export function criarMiddlewarePlataforma(){return async(ctx,next)=>{
 const u=ctx.update;
 if(u.pre_checkout_query){await preCheckout(ctx.telegram,u.pre_checkout_query);return;}
 if(u.message?.successful_payment){const resultado=confirmarPagamento(u.message.from.id,u.message.successful_payment);if(!resultado.duplicado)await ctx.reply('Pagamento em Stars confirmado. Beneficio VIP registrado. Use /vip para consultar.').catch(()=>{});return;}
 if(u.message?.refunded_payment){processarReembolsoRecebido(u.message.from.id,u.message.refunded_payment);return;}
 if(u.business_connection){receberConexao(u.business_connection);return;}
 if(u.business_message){await responderBusiness(ctx.telegram,u.business_message);return;}
 if(u.edited_business_message||u.deleted_business_messages)return; // Nao armazena texto das conversas comerciais.
 if(u.chat_join_request){await receberEntrada(ctx.telegram,u.chat_join_request);return;}
 if(u.callback_query?.data?.startsWith('plat:confirm:')){await confirmarRascunho(ctx);return;}
 if(u.inline_query){
  const q=u.inline_query;let results=[];
  if(plataforma.inline){const termo=q.query.toLowerCase().slice(0,100);results=getAllCommands().filter(c=>!c.soDono&&!c.oculto&&`${c.name} ${c.description}`.toLowerCase().includes(termo)).slice(0,20).map(c=>({type:'article',id:c.name,title:'/'+c.name,description:c.description.slice(0,150),input_message_content:{message_text:`/${c.name}\n${c.description}\nUso: ${c.uso||'/'+c.name}`}}));}
  await ctx.telegram.callApi('answerInlineQuery',{inline_query_id:q.id,results,cache_time:30,is_personal:true});return;
 }
 if(u.channel_post||u.edited_channel_post){const p=u.channel_post||u.edited_channel_post;eventoPlataforma('channel_post',p.chat.id,{editado:Boolean(u.edited_channel_post),messageId:p.message_id});return;}
 if(u.my_chat_member){eventoPlataforma('my_chat_member',u.my_chat_member.chat.id,{status:u.my_chat_member.new_chat_member.status});return;}
 if(u.message){
  if(u.message.chat?.type==='private'&&(u.message.contact||u.message.location||u.message.text==='Fechar teclado')){await ctx.reply('Recebido. Contato e coordenadas nao foram armazenados neste modulo.',{reply_markup:{remove_keyboard:true}});return;}
  coletarAlbum(u.message);if(u.message.web_app_data){await ctx.reply('Dados recebidos do teclado. Nenhuma identidade ou privilegio foi aceito a partir desse campo; use a Mini App autenticada.');return;}}
 return next();
};}
