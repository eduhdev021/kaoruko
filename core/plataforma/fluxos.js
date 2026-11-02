import crypto from 'node:crypto';
import {db,botConfig,plataforma,eventoPlataforma} from './store.js';
import {enviarConteudo,validarConteudo} from '../recursos.js';
export async function exigirAdminTelegram(telegram,chatId,userId,{canal=false}={}){
 if(!/^-\d+$/.test(String(chatId))&&!/^@[a-zA-Z0-9_]{5,}$/.test(String(chatId)))throw new Error('Chat invalido');
 const chat=await telegram.getChat(chatId);
 if(canal&&chat.type!=='channel')throw new Error('O destino nao e um canal');
 const m=await telegram.getChatMember(chat.id,Number(userId));
 if(!['creator','administrator'].includes(m.status))throw new Error('Voce precisa ser administrador atual deste chat');
 return chat;
}
export function rascunhar(ator,chatId,dados){
 const permitidas=['canal','topico_apagar','sticker_apagar'];
 if(!permitidas.includes(dados?.tipo))throw new Error('Tipo de confirmacao invalido');
 const token=crypto.randomBytes(12).toString('hex');
 db.prepare('INSERT INTO platform_drafts(token,ator,chat_id,dados,expira_em) VALUES (?,?,?,?,?)').run(token,String(ator),String(chatId),JSON.stringify(dados),Date.now()+5*60000);return token;
}
export async function confirmarRascunho(ctx){
 const data=ctx.callbackQuery?.data;if(!data?.startsWith('plat:confirm:'))return false;
 const token=data.split(':')[2],r=db.prepare('SELECT * FROM platform_drafts WHERE token=?').get(token);
 if(!r||r.expira_em<Date.now()||r.status!=='pending'){await ctx.answerCbQuery('Confirmacao expirada ou ja processada.');return true;}
 if(r.ator!==String(ctx.from?.id)){await ctx.answerCbQuery('Esta confirmacao pertence a outra pessoa.');return true;}
 const mudou=db.prepare("UPDATE platform_drafts SET status='processing' WHERE token=? AND status='pending'").run(token).changes;if(!mudou){await ctx.answerCbQuery('Operacao em andamento.');return true;}
 const d=JSON.parse(r.dados);
 try{
  if(d.tipo==='canal'){await exigirAdminTelegram(ctx.telegram,r.chat_id,r.ator,{canal:true});await enviarConteudo(ctx.telegram,r.chat_id,d.conteudo);}
  if(d.tipo==='topico_apagar'){await exigirAdminTelegram(ctx.telegram,r.chat_id,r.ator);await ctx.telegram.callApi('deleteForumTopic',{chat_id:Number(r.chat_id),message_thread_id:d.threadId});}
  if(d.tipo==='sticker_apagar'){if(!botConfig.ehDono(r.ator))throw new Error('Apenas dono');await ctx.telegram.callApi('deleteStickerFromSet',{sticker:d.sticker});}
  db.prepare("UPDATE platform_drafts SET status='done' WHERE token=?").run(token);eventoPlataforma(d.tipo,r.chat_id,{ator:r.ator});await ctx.answerCbQuery('Concluido.');
  await ctx.editMessageReplyMarkup({inline_keyboard:[]}).catch(()=>{});
 }catch(e){
  // Nao repete automaticamente uma publicacao com resultado remoto incerto.
  db.prepare("UPDATE platform_drafts SET status='failed' WHERE token=?").run(token);await ctx.answerCbQuery(String(e.response?.description||e.message).slice(0,180),{show_alert:true});
 }
 return true;
}
export async function criarConviteTelegram(telegram,chatId,userId,{solicitar=false,segundos=3600}={}){
 await exigirAdminTelegram(telegram,chatId,userId);
 if(!Number.isInteger(segundos)||segundos<60||segundos>2592000)throw new Error('Convite de 1 minuto a 30 dias');
 const expira=Math.floor(Date.now()/1000)+segundos;
 const r=await telegram.callApi('createChatInviteLink',{chat_id:Number(chatId),name:'Kaoruko',expire_date:expira,creates_join_request:solicitar});
 db.prepare('INSERT OR REPLACE INTO platform_invites(link,chat_id,em,expira_em) VALUES (?,?,?,?)').run(r.invite_link,String(chatId),Date.now(),expira*1000);return r;
}
export async function decidirEntrada(telegram,chatId,userId,ator,aprovar){
 await exigirAdminTelegram(telegram,chatId,ator);
 const row=db.prepare("SELECT * FROM platform_join WHERE chat_id=? AND user_id=? AND status='pending'").get(String(chatId),String(userId));
 if(!row)throw new Error('Solicitacao pendente nao encontrada');
 await telegram.callApi(aprovar?'approveChatJoinRequest':'declineChatJoinRequest',{chat_id:Number(chatId),user_id:Number(userId)});
 db.prepare('UPDATE platform_join SET status=? WHERE chat_id=? AND user_id=?').run(aprovar?'approved':'declined',String(chatId),String(userId));eventoPlataforma('join_decision',chatId,{userId:String(userId),ator:String(ator),aprovar});
}
export async function receberEntrada(telegram,q){
 db.prepare("INSERT INTO platform_join(chat_id,user_id,nome,em,status) VALUES (?,?,?,?,'pending') ON CONFLICT(chat_id,user_id) DO UPDATE SET nome=excluded.nome,em=excluded.em,status='pending'").run(String(q.chat.id),String(q.from.id),String(q.from.first_name||'Membro').slice(0,80),Date.now());
 // Decisao manual por padrao. Autorizacao para automacao nunca e inferida de um pedido.
 eventoPlataforma('join_request',q.chat.id,{userId:String(q.from.id)});
}
export async function operarTopico(telegram,chatId,userId,acao,{nome='',threadId}={}){
 const chat=await exigirAdminTelegram(telegram,chatId,userId);if(!chat.is_forum)throw new Error('Este supergrupo nao esta com topicos habilitados');
 const mapa={criar:'createForumTopic',editar:'editForumTopic',fechar:'closeForumTopic',abrir:'reopenForumTopic'};
 if(!mapa[acao])throw new Error('Acao de topico invalida');
 if(['criar','editar'].includes(acao)&&(!nome.trim()||nome.length>128))throw new Error('Nome do topico de 1 a 128 caracteres');
 if(acao!=='criar'&&(!Number.isSafeInteger(threadId)||threadId<=0))throw new Error('Informe um ID de topico valido');
 const r=await telegram.callApi(mapa[acao],{chat_id:chat.id,...(acao!=='criar'?{message_thread_id:threadId}:{}),...(['criar','editar'].includes(acao)?{name:nome}:{})});eventoPlataforma('topico_'+acao,chat.id,{ator:String(userId),threadId});return r;
}
const albums=new Map();
export function coletarAlbum(msg){
 if(!msg?.media_group_id||!msg.from||!msg.chat)return;
 const tipo=msg.photo?.length?'photo':msg.video?'video':msg.document?'document':msg.audio?'audio':null;if(!tipo)return;
 const key=`${msg.chat.id}:${msg.from.id}`,now=Date.now();
 if(albums.size>=1000)for(const[k,v]of albums)if(v.ate<now)albums.delete(k);
 if(albums.size>=1000&&!albums.has(key))return;
 let a=albums.get(key);if(!a||a.id!==msg.media_group_id||a.ate<now){a={id:msg.media_group_id,ate:now+300000,itens:[]};albums.set(key,a);}
 if(a.itens.length>=10)return;
 a.itens.push({type:tipo,media:tipo==='photo'?msg.photo.at(-1).file_id:msg[tipo].file_id,...(msg.caption?{caption:msg.caption.slice(0,1000)}:{})});
}
export function albumDoUsuario(chatId,userId){const a=albums.get(`${chatId}:${userId}`);return a&&a.ate>Date.now()&&a.itens.length>=2?a.itens.map(x=>({...x})):null;}
