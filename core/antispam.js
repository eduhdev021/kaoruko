import { configGestao,registrarAcao } from './gestao-store.js';
import botConfig from '../config/index.js';
import { logAviso } from '../utils/logger.js';

export function normalizarLinks(texto) {return String(texto).replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\[\.\]|\(dot\)/gi,'.').replace(/hxxps?:/gi,m=>m.toLowerCase().startsWith('hxxps')?'https:':'http:');}
export function extrairHosts(msg) {
  const texto=normalizarLinks(msg.text??msg.caption??'');
  const entities=[...(msg.entities||[]),...(msg.caption_entities||[])];
  const matches=texto.match(/(?:https?:\/\/|www\.)[^\s<>]+|(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:\/[^\s<>]*)?/gi)||[];
  for(const e of entities)if(e.type==='text_link'&&typeof e.url==='string')matches.push(normalizarLinks(e.url));
  const hosts=[];
  for(const raw of matches)try {hosts.push(new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`).hostname.toLowerCase());}catch{}
  return [...new Set(hosts)];
}
export function linksPermitidos(msg,dominios) {
  const hosts=extrairHosts(msg);
  return hosts.length>0&&hosts.every(host=>dominios.some(d=>host===d||host.endsWith(`.${d}`)));
}
const repetidas=new Map();
export function mensagemRepetida(chatId,userId,texto,agora=Date.now()) {
  const normal=normalizarLinks(texto).trim().toLowerCase().replace(/\s+/g,' ');
  if(normal.length<20)return false;
  const chave=`${chatId}:${userId}`;
  if(repetidas.size>=10000)for(const [k,v]of repetidas)if(v.ate<=agora)repetidas.delete(k);
  if(repetidas.size>=10000&&!repetidas.has(chave))return false;
  let row=repetidas.get(chave);
  if(!row||row.ate<=agora||row.texto!==normal){row={texto:normal,n:0,ate:agora+30000};repetidas.set(chave,row);}
  return ++row.n>=3;
}
export async function processarAntispam(ctx,{mensagem=ctx.message,editada=false}={}) {
  if(!['group','supergroup'].includes(ctx.chat?.type)||!mensagem||!ctx.from||ctx.from.is_bot)return false;
  const c=configGestao(ctx.chat.id);
  if(!c.duplicadas||editada||!mensagemRepetida(ctx.chat.id,ctx.from.id,mensagem.text??mensagem.caption??''))return false;
  if(botConfig.ehDono(ctx.from.id)||mensagem.sender_chat?.id===ctx.chat.id)return false;
  try {
    const m=await ctx.telegram.getChatMember(ctx.chat.id,ctx.from.id);
    if(['administrator','creator'].includes(m.status))return false;
    await ctx.deleteMessage();
    registrarAcao({chatId:ctx.chat.id,userId:ctx.from.id,tipo:'spam_repetido',motivo:'Terceira repeticao em 30s'});
    return true;
  } catch(err){logAviso(`Antispam: ${err.message}`);return false;}
}
