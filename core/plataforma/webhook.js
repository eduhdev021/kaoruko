import crypto from 'node:crypto';
import {db,plataforma,requisitosPlataforma} from './store.js';
export const UPDATES_PLATAFORMA=['message','edited_message','channel_post','edited_channel_post','business_connection','business_message','edited_business_message','deleted_business_messages','inline_query','chosen_inline_result','callback_query','pre_checkout_query','my_chat_member','chat_member','chat_join_request','poll','poll_answer'];
export function segredoWebhookValido(valor,esperado=plataforma.webhookSecret){
 if(typeof valor!=='string'||typeof esperado!=='string'||esperado.length<32||valor.length!==esperado.length)return false;
 const a=Buffer.from(valor),b=Buffer.from(esperado);return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function criarWebhookHandler(bot){return async(req,res)=>{
 if(!requisitosPlataforma().webhookPronto)return res.status(404).json({erro:'Webhook desativado'});
 if(!segredoWebhookValido(req.get('x-telegram-bot-api-secret-token')))return res.status(401).json({erro:'Webhook nao autenticado'});
 const update=req.body;
 if(!update||!Number.isSafeInteger(update.update_id)||update.update_id<0)return res.status(400).json({erro:'Update invalido'});
 const old=db.prepare('SELECT * FROM platform_webhook WHERE update_id=?').get(update.update_id);
 if(old?.status==='done')return res.json({ok:true,duplicado:true});
 if(old?.status==='processing'&&Date.now()-old.em<120000)return res.status(503).json({erro:'Update em processamento'});
 db.prepare("INSERT INTO platform_webhook(update_id,status,em) VALUES (?,'processing',?) ON CONFLICT(update_id) DO UPDATE SET status='processing',em=excluded.em").run(update.update_id,Date.now());
 try{await bot.handleUpdate(update);db.prepare("UPDATE platform_webhook SET status='done',em=? WHERE update_id=?").run(Date.now(),update.update_id);return res.json({ok:true});}
 catch{db.prepare("UPDATE platform_webhook SET status='retry' WHERE update_id=?").run(update.update_id);return res.status(503).json({erro:'Falha temporaria ao processar update'});}
};}
export async function configurarWebhook(bot){
 if(!requisitosPlataforma().webhookPronto)throw new Error('Webhook exige URL HTTPS e secret_token de 32–256 caracteres permitidos');
 bot.botInfo=await bot.telegram.getMe();
 await bot.telegram.callApi('setWebhook',{url:plataforma.webhookUrl,secret_token:plataforma.webhookSecret,allowed_updates:UPDATES_PLATAFORMA,drop_pending_updates:false,max_connections:10});
}
