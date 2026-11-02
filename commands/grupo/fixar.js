export const description='Fixa a mensagem respondida sem notificar todos';export const soGrupo=true;export const soAdmin=true;
export default ctx=>{if(!ctx.respondida?.message_id)return ctx.erro('Responda a mensagem a fixar.');return ctx.waguri.telegram.callApi('pinChatMessage',{chat_id:ctx.chatId,message_id:ctx.respondida.message_id,disable_notification:true});};
