import {criarClienteBotApi} from '../core/plataforma/bot-api.js';
const api=criarClienteBotApi({callApi:async()=>true});
void api.call('sendMessage',{chat_id:1,text:'Exemplo de tipos; este arquivo nao e executado.'});
void api.call('getMe',{});
void api.call('getBusinessConnection',{business_connection_id:'exemplo'});
// @ts-expect-error sendMessage exige text
void api.call('sendMessage',{chat_id:1});
// @ts-expect-error metodos inexistentes nao sao aceitos
void api.call('executarShell',{});
