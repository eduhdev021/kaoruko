import {produtosStars,criarFatura} from '../../core/plataforma/stars.js';
import {requisitosPlataforma,plataforma} from '../../core/plataforma/store.js';
import {escapeHtml} from '../../utils/helpers.js';
export const description='Compra VIP digital em Telegram Stars quando habilitado';export const soPrivado=true;
export default async ctx=>{
 if(!requisitosPlataforma().stars.pronto)return ctx.erro('Compras em Stars estao desativadas. Nenhuma cobranca foi criada.');
 if(!ctx.q)return ctx.responderComApagar(produtosStars().map(p=>`${escapeHtml(p.id)} — ${escapeHtml(p.titulo)} · ${p.stars} Stars · ${p.dias} dias`).join('\n')+`\n\nUse /comprar ID\nTermos: ${escapeHtml(plataforma.termosUrl)}\nSuporte: /paysupport`);
 const r=await criarFatura(ctx.waguri.telegram,ctx.userId,ctx.q);return ctx.responderComApagar(`Fatura ${r.id} enviada. O beneficio so e concedido apos confirmacao do Telegram.`);
};
