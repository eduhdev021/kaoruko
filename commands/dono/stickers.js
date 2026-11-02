import {rascunhar} from '../../core/plataforma/fluxos.js';
export const description='Cria/adiciona stickers a conjuntos; exclusao exige confirmacao';export const soDono=true;export const soPrivado=true;
export default async ctx=>{
 const [header,...partes]=ctx.q.split('|'),[acao,nome]=header.trim().split(/\s+/),s=ctx.respondida?.sticker,tg=ctx.waguri.telegram;
 if(!s)return ctx.erro('Responda a uma figurinha: /stickers criar NOME | TITULO | EMOJI, adicionar NOME | EMOJI, ou apagar.');
 if(acao==='apagar'){const token=rascunhar(ctx.userId,ctx.chatId,{tipo:'sticker_apagar',sticker:s.file_id});return ctx.ctx.reply('Remover esta figurinha do conjunto? O Telegram so permite gerenciar conjuntos desta bot.',{reply_markup:{inline_keyboard:[[{text:'Confirmar remocao',callback_data:'plat:confirm:'+token}]]}});}
 const me=await tg.getMe(),sufixo='_by_'+me.username;
 if(!nome||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(nome)||!nome.toLowerCase().endsWith(sufixo.toLowerCase()))return ctx.erro(`O nome precisa terminar em ${sufixo} e ter ate 64 caracteres.`);
 const emoji=(acao==='criar'?partes[1]:partes[0])?.trim()||'🙂';
 const sticker={sticker:s.file_id,format:s.is_video?'video':s.is_animated?'animated':'static',emoji_list:[emoji]};
 if(acao==='criar'){const title=partes[0]?.trim();if(!title||title.length>64)return ctx.erro('Informe titulo de ate 64 caracteres.');await tg.callApi('createNewStickerSet',{user_id:Number(ctx.userId),name:nome,title,stickers:[sticker],sticker_type:'regular'});}
 else if(acao==='adicionar')await tg.callApi('addStickerToSet',{user_id:Number(ctx.userId),name:nome,sticker});
 else return ctx.erro('Use criar, adicionar ou apagar.');
 return ctx.responderComApagar('Conjunto atualizado: https://t.me/addstickers/'+nome);
};
