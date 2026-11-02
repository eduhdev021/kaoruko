import {requisitosPlataforma,plataforma} from '../../core/plataforma/store.js';
export const description='Abre o painel pessoal como Mini App do Telegram';export const soPrivado=true;
export default async ctx=>{
 if(!requisitosPlataforma().mini.pronto)return ctx.erro('Mini App desativada. O dono precisa configurar URL HTTPS e ativa-la no servidor/BotFather.');
 return ctx.ctx.reply('Abra sua conta, lembretes e planos no Telegram.',{reply_markup:{inline_keyboard:[[{text:'Abrir Kaoruko',web_app:{url:plataforma.miniUrl}}]]}});
};
