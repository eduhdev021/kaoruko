import {operarTopico,rascunhar,exigirAdminTelegram} from '../../core/plataforma/fluxos.js';
export const description='Cria, renomeia, abre, fecha ou solicita exclusao de topicos';export const soGrupo=true;export const soAdmin=true;
export default async function topico(ctx){
 const [acao,...args]=ctx.args;
 const id=Number(args[0]||ctx.msg.message_thread_id),nome=acao==='criar'?args.join(' '):args.slice(1).join(' ');
 if(acao==='apagar'){
  const chat=await exigirAdminTelegram(ctx.waguri.telegram,ctx.chatId,ctx.userId);if(!chat.is_forum||!Number.isSafeInteger(id)||id<=0)return ctx.erro('Informe um ID de topico de um forum.');
  const token=rascunhar(ctx.userId,ctx.chatId,{tipo:'topico_apagar',threadId:id});return ctx.ctx.reply('Excluir este topico e seu historico? Acao irreversivel.',{reply_markup:{inline_keyboard:[[{text:'Confirmar exclusao',callback_data:'plat:confirm:'+token}]]}});
 }
 if(!['criar','editar','fechar','abrir'].includes(acao))return ctx.erro('/topico criar NOME | editar ID NOME | fechar ID | abrir ID | apagar ID');
 const r=await operarTopico(ctx.waguri.telegram,ctx.chatId,ctx.userId,acao,{nome,threadId:id});return ctx.responderComApagar(`Topico ${acao}: ${r?.message_thread_id||id||'concluido'}`);
}
