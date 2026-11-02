import { configGestao,salvarGestao } from '../../core/gestao-store.js';
export const description='Ativa verificacao temporaria quando ha muitas entradas';
export const soGrupo=true;export const soAdmin=true;
export const uso='/antiraid on | off | limite 6 10 180';
export default async function antiraid(ctx){
 const [acao,limite,janela,duracao]=ctx.args;
 if(!acao){const c=configGestao(ctx.chatId);return ctx.responderComApagar(`Anti-raid: ${c.antiraid?'ativo':'inativo'} · ${c.raidLimite} entradas/${c.raidJanela}s · protecao ${c.raidDuracao}s. ${uso}`);}
 const patch=['on','off'].includes(acao)?{antiraid:acao==='on'}:acao==='limite'?{raidLimite:Number(limite),raidJanela:Number(janela),raidDuracao:Number(duracao)}:null;
 if(!patch)return ctx.erro(uso);
 try{salvarGestao(ctx.chatId,patch);}catch(e){return ctx.erro(e.message);}
 return ctx.responderComApagar('Anti-raid atualizado. Quando o limite e atingido, os proximos novos membros recebem CAPTCHA enquanto a protecao estiver ativa. Nao bloqueia nem expulsa todos os membros do grupo. Requer permissao de restringir.');
}
