import {exigirAdminTelegram,rascunhar} from '../../core/plataforma/fluxos.js';
import {conteudoDeMensagem,validarConteudo} from '../../core/recursos.js';
import {escapeHtml} from '../../utils/helpers.js';
export const description='Prepara publicacao em canal com confirmacao do administrador';export const soPrivado=true;
export default async function canal(ctx){
 const [cabecalho,...partes]=ctx.q.split('|');const [acao,destino]=cabecalho.trim().split(/\s+/);
 if(!['info','publicar'].includes(acao)||!destino)return ctx.erro('/canal info @canal | /canal publicar @canal | TEXTO (ou responda a midia)');
 const chat=await exigirAdminTelegram(ctx.waguri.telegram,destino,ctx.userId,{canal:true});
 if(acao==='info')return ctx.responderComApagar(`Canal: ${escapeHtml(chat.title)}\nID: ${chat.id}\nVoce e administrador. A publicacao ainda exige permissao da bot.`);
 const conteudo=validarConteudo(conteudoDeMensagem(ctx.respondida,partes.join('|').trim()));if(!conteudo)return ctx.erro('Texto/midia invalidos.');
 const token=rascunhar(ctx.userId,chat.id,{tipo:'canal',conteudo});return ctx.ctx.reply(`Confirmar publicacao em ${chat.title}?\n${conteudo.texto.slice(0,500)}${conteudo.midia?'\nInclui midia.':''}`,{reply_markup:{inline_keyboard:[[{text:'Publicar no canal',callback_data:'plat:confirm:'+token}]]}});
}
