export const description='Desafixa apenas a mensagem respondida';export const soGrupo=true;export const soAdmin=true;
export default ctx=>{if(!ctx.respondida?.message_id)return ctx.erro('Responda a mensagem a desafixar.');return ctx.waguri.telegram.callApi('unpinChatMessage',{chat_id:ctx.chatId,message_id:ctx.respondida.message_id});};
