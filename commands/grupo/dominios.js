import { configGestao,salvarGestao } from '../../core/gestao-store.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description='Lista de dominios permitidos pelo antilink';
export const soGrupo=true;export const soAdmin=true;
export default async function dominios(ctx){
 const c=configGestao(ctx.chatId),[acao,dominio]=ctx.args;
 if(!acao||acao==='listar')return ctx.responderComApagar(escapeHtml(c.dominios.join('\n')||'Sem dominios permitidos. Use /dominios adicionar example.com'));
 if(!['adicionar','apagar'].includes(acao)||!dominio)return ctx.erro('/dominios adicionar example.com | apagar example.com');
 try{salvarGestao(ctx.chatId,{dominios:acao==='adicionar'?[...new Set([...c.dominios,dominio.toLowerCase()])]:c.dominios.filter(x=>x!==dominio.toLowerCase())});}catch(e){return ctx.erro(e.message);}
 return ctx.responderComApagar('Lista atualizada. Subdominios tambem sao permitidos; todos os links da mensagem precisam estar na lista.');
}
