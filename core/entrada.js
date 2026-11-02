import { obterAutomacao } from './automacao.js';
import crypto from 'node:crypto';
import { db } from './db.js';
import botConfig from '../config/index.js';
import { configGestao,registrarAcao,registrarDia } from './gestao-store.js';
import { logAviso } from '../utils/logger.js';

export function detectarRaid(chatId,config,quantidade,agora=Date.now()) {
  db.prepare('DELETE FROM entradas_grupo WHERE em<?').run(agora-60000);
  const add=db.prepare('INSERT INTO entradas_grupo(chat_id,em) VALUES (?,?)');
  db.transaction(()=>{for(let i=0;i<Math.min(quantidade,200);i++)add.run(String(chatId),agora);})();
  const total=db.prepare('SELECT count(*) n FROM entradas_grupo WHERE chat_id=? AND em>=?').get(String(chatId),agora-config.raidJanela*1000).n;
  if(config.antiraid&&total>=config.raidLimite) db.prepare('INSERT INTO raid_ativo(chat_id,ate) VALUES (?,?) ON CONFLICT(chat_id) DO UPDATE SET ate=excluded.ate').run(String(chatId),agora+config.raidDuracao*1000);
  return (db.prepare('SELECT ate FROM raid_ativo WHERE chat_id=?').get(String(chatId))?.ate||0)>agora;
}
export function pendenciaCaptcha(chatId,userId) {return db.prepare('SELECT * FROM captcha_pendente WHERE chat_id=? AND user_id=?').get(String(chatId),String(userId));}
async function restaurar(telegram,row) {
  let permissions=JSON.parse(row.permissoes);
  const chat=await telegram.getChat(row.chat_id);
  if(chat.permissions) permissions=chat.permissions;
  await telegram.restrictChatMember(row.chat_id,Number(row.user_id),{permissions,use_independent_chat_permissions:true});
}
export async function criarCaptcha(telegram,chatId,user,config=configGestao(chatId)) {
  if(user.is_bot||botConfig.ehDono(user.id)||pendenciaCaptcha(chatId,user.id)) return null;
  const membro=await telegram.getChatMember(chatId,user.id);
  if(['creator','administrator','restricted','left','kicked'].includes(membro.status)) return null;
  const chat=await telegram.getChat(chatId);
  if(!chat.permissions)throw new Error('CAPTCHA exige supergrupo com permissoes acessiveis');
  const token=crypto.randomBytes(10).toString('hex');
  const x=crypto.randomInt(1,10),y=crypto.randomInt(1,10),resposta=x+y;
  const expira=Date.now()+config.captchaPrazo*1000;
  db.prepare('INSERT INTO captcha_pendente(token,chat_id,user_id,resposta,expira_em,permissoes,modo,estado) VALUES (?,?,?,?,?,?,?,?)')
    .run(token,String(chatId),String(user.id),String(resposta),expira,JSON.stringify(chat.permissions),config.captchaTimeout,'preparando');
  let restrito=false;
  try {
    // Restricao tambem expira no Telegram se o processo ficar indisponivel.
    await telegram.restrictChatMember(chatId,user.id,{permissions:{can_send_messages:false},until_date:Math.floor(expira/1000)+60});
    restrito=true;
    const opcoes=[resposta,resposta+1,resposta+2].sort(()=>crypto.randomInt(0,2)?1:-1);
    const msg=await telegram.sendMessage(chatId,`Verificacao de ${String(user.first_name||user.id).slice(0,80)} (${user.id}): quanto e ${x} + ${y}? Prazo: ${config.captchaPrazo}s.`,
      {reply_markup:{inline_keyboard:[opcoes.map(n=>({text:String(n),callback_data:`captcha:${token}:${n}`}))]}});
    db.prepare("UPDATE captcha_pendente SET estado='ativo',message_id=? WHERE token=?").run(msg.message_id,token);
    registrarAcao({chatId,userId:user.id,tipo:'captcha_criado',dados:{expira}});
    return token;
  } catch(err) {
    const row=pendenciaCaptcha(chatId,user.id);
    if(restrito) {
      try {await restaurar(telegram,row);}
      catch { // Mantem registro para o worker tentar liberar; nunca expulsa por falha na criacao.
        db.prepare("UPDATE captcha_pendente SET estado='ativo',modo='liberar',expira_em=? WHERE token=?").run(Date.now(),token);
        throw err;
      }
    }
    db.prepare('DELETE FROM captcha_pendente WHERE token=?').run(token);
    throw err;
  }
}
const emVerificacao=new Set();
export async function responderCaptcha(ctx) {
  const data=ctx.callbackQuery?.data||'';
  if(!data.startsWith('captcha:'))return false;
  const [,token,resposta]=data.split(':');
  const row=db.prepare('SELECT * FROM captcha_pendente WHERE token=?').get(token);
  if(!row||String(ctx.chat?.id)!==row.chat_id){await ctx.answerCbQuery('Verificacao expirada.');return true;}
  if(String(ctx.from?.id)!==row.user_id) {await ctx.answerCbQuery('Somente o novo membro pode responder.',{show_alert:true});return true;}
  if(row.estado!=='ativo'||row.expira_em<=Date.now()||row.tentativas>=3||emVerificacao.has(token)) {await ctx.answerCbQuery('Aguarde a conclusao ou o prazo.');return true;}
  if(resposta!==row.resposta) {db.prepare('UPDATE captcha_pendente SET tentativas=tentativas+1 WHERE token=?').run(token);await ctx.answerCbQuery('Resposta incorreta. Maximo de 3 tentativas.');return true;}
  emVerificacao.add(token);
  try {
    await restaurar(ctx.telegram,row);
    db.prepare('DELETE FROM captcha_pendente WHERE token=?').run(token);
    registrarAcao({chatId:row.chat_id,userId:row.user_id,tipo:'captcha_aprovado',ator:row.user_id});
    await ctx.answerCbQuery('Verificado!');
    if(row.message_id)await ctx.telegram.deleteMessage(row.chat_id,row.message_id).catch(()=>{});
  } finally {emVerificacao.delete(token);}
  return true;
}
export async function expirarCaptchas(telegram,agora=Date.now()) {
  const rows=db.prepare('SELECT * FROM captcha_pendente WHERE expira_em<=? LIMIT 20').all(agora);
  for(const row of rows) {
    if(emVerificacao.has(row.token))continue;
    emVerificacao.add(row.token);
    try {
      const membro=await telegram.getChatMember(row.chat_id,Number(row.user_id));
      if(['administrator','creator'].includes(membro.status)) {
        db.prepare('DELETE FROM captcha_pendente WHERE token=?').run(row.token);continue;
      }
      if(row.estado==='desbanir') {
        // Se houve queda/falha entre banir e desbanir, conclui a liberacao em vez de esquecer o ban.
        await telegram.unbanChatMember(row.chat_id,Number(row.user_id),{only_if_banned:true});
      } else if(['left','kicked'].includes(membro.status)) {
        db.prepare('DELETE FROM captcha_pendente WHERE token=?').run(row.token);continue;
      } else if(row.modo==='expulsar') {
        db.prepare("UPDATE captcha_pendente SET estado='desbanir' WHERE token=?").run(row.token);
        await telegram.banChatMember(row.chat_id,Number(row.user_id));
        await telegram.unbanChatMember(row.chat_id,Number(row.user_id),{only_if_banned:true});
      } else await restaurar(telegram,row);
      registrarAcao({chatId:row.chat_id,userId:row.user_id,tipo:'captcha_expirado',dados:{acao:row.modo}});
      db.prepare('DELETE FROM captcha_pendente WHERE token=?').run(row.token);
      if(row.message_id)await telegram.deleteMessage(row.chat_id,row.message_id).catch(()=>{});
    } catch(err) {
      logAviso(`CAPTCHA pendente ${row.user_id}: ${err.message}`);
      db.prepare('UPDATE captcha_pendente SET expira_em=? WHERE token=?').run(agora+60000,row.token);
    } finally {emVerificacao.delete(row.token);}
  }
}
export async function processarEntrada(ctx) {
  if(!['group','supergroup'].includes(ctx.chat?.type)||!ctx.message)return false;
  const config=configGestao(ctx.chat.id);
  const novos=(ctx.message.new_chat_members||[]).filter(m=>!m.is_bot);
  if(ctx.message.left_chat_member&&obterAutomacao(ctx.chat.id).ranking)registrarDia(ctx.chat.id,'saidas');
  if(novos.length) {
    const raid=detectarRaid(ctx.chat.id,config,novos.length);
    if(raid)registrarAcao({chatId:ctx.chat.id,tipo:'raid_protecao',dados:{novos:novos.length}});
    for(const membro of novos) {
      if(obterAutomacao(ctx.chat.id).ranking)registrarDia(ctx.chat.id,'entradas');
      if(config.captcha||raid) await criarCaptcha(ctx.telegram,ctx.chat.id,membro,config).catch(e=>logAviso(`CAPTCHA: ${e.message}`));
    }
  }
  if(ctx.from&&pendenciaCaptcha(ctx.chat.id,ctx.from.id)&&!novos.length) {
    await ctx.deleteMessage().catch(()=>{});return true;
  }
  return false;
}
