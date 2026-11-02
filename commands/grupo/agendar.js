import { agendarPublicacao,listarPublicacoes,cancelarPublicacao } from '../../core/recursos.js';
import { duracaoMs } from '../../core/lembretes.js';
import { escapeHtml } from '../../utils/helpers.js';
export const description='Publicacoes agendadas e recorrentes do grupo';
export const soGrupo=true;export const soAdmin=true;
export default async function agendar(ctx){
 const [acao,...args]=ctx.args;
 if(acao==='listar')return ctx.responderComApagar(listarPublicacoes(ctx.chatId).slice(0,15).map(x=>`#${x.id} · ${x.estado} · ${new Date(x.vence_em).toLocaleString('pt-BR',{timeZone:ctx.botConfig.timezone})} · ${escapeHtml(x.texto.slice(0,80))}`).join('\n')||'Sem publicacoes.');
 if(acao==='cancelar')return ctx.responderComApagar(cancelarPublicacao(ctx.chatId,args[0])?'Publicacao cancelada.':'Nao encontrada ou ja finalizada.');
 const recorrente=acao==='repetir';
 const atraso=duracaoMs(recorrente?args[0]:acao);
 if(!atraso||(recorrente&&atraso<60000))return ctx.erro('/agendar 10m texto | /agendar repetir 1h texto | /agendar listar | /agendar cancelar ID');
 try{const id=agendarPublicacao(ctx.chatId,ctx.userId,{texto:(recorrente?args.slice(1):args).join(' '),venceEm:Date.now()+atraso,intervalo:recorrente?atraso:0});return ctx.responderComApagar(`Publicacao #${id} agendada.`);}catch(e){return ctx.erro(escapeHtml(e.message));}
}
