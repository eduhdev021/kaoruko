import {albumDoUsuario} from '../../core/plataforma/fluxos.js';
export const description='Reenvia seu ultimo album recebido em ate cinco minutos';
export default async ctx=>{const media=albumDoUsuario(ctx.chatId,ctx.userId);if(!media)return ctx.erro('Envie um album de 2 a 10 midias e use /album em ate cinco minutos. A bot precisa ter recebido as midias.');return ctx.waguri.telegram.callApi('sendMediaGroup',{chat_id:ctx.chatId,media,...(ctx.msg.message_thread_id?{message_thread_id:ctx.msg.message_thread_id}:{})});};
