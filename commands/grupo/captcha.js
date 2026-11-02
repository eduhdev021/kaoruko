import { configGestao,salvarGestao } from '../../core/gestao-store.js';
export const description='Verificacao de entrada com desafio matematico e botoes';
export const soGrupo=true;export const soAdmin=true;
export const uso='/captcha on | off | prazo 120 | timeout liberar | timeout expulsar';
export default async function captcha(ctx){
 const [acao,valor]=ctx.args;
 if(!acao){const c=configGestao(ctx.chatId);return ctx.responderComApagar(`CAPTCHA: ${c.captcha?'ativo':'inativo'} · ${c.captchaPrazo}s · prazo expirado: ${c.captchaTimeout}. ${uso}`);}
 let patch;
 if(['on','off'].includes(acao))patch={captcha:acao==='on'};
 else if(acao==='prazo')patch={captchaPrazo:Number(valor)};
 else if(acao==='timeout')patch={captchaTimeout:valor};
 else return ctx.erro(uso);
 if(acao==='on'){
   const eu=await ctx.waguri.telegram.getMe(),m=await ctx.waguri.telegram.getChatMember(ctx.chatId,eu.id);
   if(m.status!=='administrator'||!m.can_restrict_members)return ctx.erro('Preciso ser admin com permissao de restringir membros em um supergrupo.');
 }
 try{salvarGestao(ctx.chatId,patch);}catch(e){return ctx.erro(e.message);}
 return ctx.responderComApagar('CAPTCHA atualizado. O modo padrao libera quem nao responder; expulsao exige configuracao explicita. Pendencias existentes mantem a politica de criacao.');
}
