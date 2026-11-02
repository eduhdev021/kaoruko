import { salvarConteudo,obterConteudo,listarConteudos,removerConteudo,conteudoDeMensagem,enviarConteudo } from './recursos.js';
import { escapeHtml } from '../utils/helpers.js';
import { getCommand } from '../commands/registry.js';
export async function gerenciarConteudo(ctx,tipo){
 const [acao,...args]=ctx.args;const texto=args.join(' ');
 if(!acao||acao==='listar')return ctx.responderComApagar(escapeHtml(listarConteudos(ctx.chatId,tipo).map(x=>x.chave).join('\n')||'Nenhum item salvo.'));
 if(acao==='ver'){const d=obterConteudo(ctx.chatId,tipo,texto);return d?enviarConteudo(ctx.waguri.telegram,ctx.chatId,d):ctx.erro('Item nao encontrado.');}
 if(!ctx.isDono&&!await ctx.garantirAdmin())return ctx.erro('Somente administradores alteram conteudos.');
 if(acao==='apagar')return ctx.responderComApagar(removerConteudo(ctx.chatId,tipo,texto)?'Removido.':'Item nao encontrado.');
 try{
   if(acao==='botao'){
     const [chave,titulo,url]=texto.split('|').map(x=>x.trim());const d=obterConteudo(ctx.chatId,tipo,chave);if(!d)throw new Error('Item nao encontrado');
     salvarConteudo(ctx.chatId,tipo,chave,{...d,botoes:[...d.botoes,{texto:titulo,url}]});
   }else if(acao==='salvar'){
     const i=texto.indexOf('|');const chave=(i>=0?texto.slice(0,i):texto).trim();const conteudo=i>=0?texto.slice(i+1).trim():'';
     if(tipo==='comando'&&getCommand(chave))throw new Error('Nome reservado por comando existente');
     salvarConteudo(ctx.chatId,tipo,chave,conteudoDeMensagem(ctx.respondida,conteudo));
   }else throw new Error('Use listar, ver NOME, salvar NOME | TEXTO, apagar NOME ou botao NOME | TITULO | HTTPS_URL. Para midia, responda ao arquivo ao salvar.');
 }catch(e){return ctx.erro(escapeHtml(e.message));}
 return ctx.responderComApagar('Conteudo salvo.');
}
