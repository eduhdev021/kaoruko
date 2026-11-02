import { db } from './db.js';
import botConfig from '../config/index.js';
import { registrarAcao,configGestao } from './gestao-store.js';
import { advertencias } from './comunidade.js';

export async function alvoProtegido(telegram,chatId,userId) {
  if (botConfig.ehDono(userId)) return true;
  const m=await telegram.getChatMember(chatId,Number(userId));
  return ['creator','administrator'].includes(m.status) || Boolean(m.user?.is_bot);
}
export async function aplicarModeracao(telegram,{chatId,userId,ator,tipo,duracao=600,motivo=''}) {
  if (!['silenciar','banir','expulsar','dessilenciar'].includes(tipo)) throw new Error('Acao invalida');
  if (!/^\d+$/.test(String(userId))) throw new Error('Usuario invalido');
  if (await alvoProtegido(telegram,chatId,userId)) throw new Error('Donos, bots e administradores sao protegidos');
  const antes=await telegram.getChatMember(chatId,Number(userId));
  const chat=await telegram.getChat(chatId);
  const permissoes={...(chat.permissions||{})};
  if (antes.status==='restricted') for (const key of Object.keys(antes)) if (key.startsWith('can_') && typeof antes[key]==='boolean') permissoes[key]=antes[key];
  if (['silenciar','dessilenciar'].includes(tipo) && !chat.permissions) throw new Error('Nao consegui obter permissoes do supergrupo');
  if (tipo==='silenciar') {
    if (!Number.isInteger(duracao)||duracao<60||duracao>2592000) throw new Error('Duracao entre 60s e 30 dias');
    await telegram.restrictChatMember(chatId,Number(userId),{permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+duracao});
  } else if(tipo==='dessilenciar') await telegram.restrictChatMember(chatId,Number(userId),{permissions:chat.permissions,use_independent_chat_permissions:true});
  else {
    await telegram.banChatMember(chatId,Number(userId));
    if(tipo==='expulsar') {
      try{await telegram.unbanChatMember(chatId,Number(userId),{only_if_banned:true});}
      catch(err){
        registrarAcao({chatId,userId,ator,tipo:'banir',motivo:'Expulsao parcial: falha ao desbanir. Revise/desfaca manualmente.',dados:{permissoes,until_date:antes.until_date||0,antes:antes.status}});
        throw new Error('Membro removido, mas nao foi possivel liberar o retorno. Acao parcial registrada como banimento para revisao.');
      }
    }
  }
  const id=registrarAcao({chatId,userId,ator,tipo,motivo,dados:{permissoes,until_date:antes.until_date||0,antes:antes.status}});
  return {id,tipo};
}
const desfazendo=new Set();
export async function desfazerModeracao(telegram,chatId,id,ator) {
  const row=db.prepare('SELECT * FROM moderacao_historico WHERE id=? AND chat_id=?').get(Number(id),String(chatId));
  if(!row||row.desfeito||!['silenciar','banir','dessilenciar'].includes(row.tipo)) throw new Error('Acao inexistente, nao reversivel ou ja desfeita');
  if(desfazendo.has(row.id)) throw new Error('Acao em andamento');
  const posterior=db.prepare("SELECT id FROM moderacao_historico WHERE chat_id=? AND user_id=? AND id>? AND tipo IN ('silenciar','banir','dessilenciar','expulsar','desfazer') LIMIT 1").get(String(chatId),row.user_id,row.id);
  if(posterior) throw new Error('Existe acao posterior para este membro; revise manualmente');
  desfazendo.add(row.id);
  try {
    if(await alvoProtegido(telegram,chatId,row.user_id)) throw new Error('Alvo atualmente protegido');
    const d=JSON.parse(row.dados);
    if(row.tipo==='banir') {
      if(d.antes==='kicked') throw new Error('O membro ja estava banido antes desta acao');
      await telegram.unbanChatMember(chatId,Number(row.user_id),{only_if_banned:true});
    } else {
      const chat=await telegram.getChat(chatId);
      const restaurar={};
      if(d.antes==='restricted'&&d.until_date>0&&d.until_date<=Math.floor(Date.now()/1000))d.permissoes=chat.permissions;
      if(!chat.permissions) throw new Error('Permissoes do grupo indisponiveis');
      for(const [k,v] of Object.entries(chat.permissions)) restaurar[k]=Boolean(v && (d.permissoes[k]??v));
      const until=d.until_date>Math.floor(Date.now()/1000)?d.until_date:0;
      await telegram.restrictChatMember(chatId,Number(row.user_id),{permissions:restaurar,until_date:until,use_independent_chat_permissions:true});
    }
    db.prepare('UPDATE moderacao_historico SET desfeito=1 WHERE id=?').run(row.id);
    registrarAcao({chatId,userId:row.user_id,ator,tipo:'desfazer',dados:{acao:row.id}});
    return true;
  } finally {desfazendo.delete(row.id);}
}
export async function advertirComAcao(telegram,{chatId,userId,ator,acao='adicionar',motivo=''}) {
  if(acao==='adicionar'&&await alvoProtegido(telegram,chatId,userId)) throw new Error('Alvo protegido');
  const total=advertencias(chatId,userId,acao);
  if(acao==='ver')return {total};
  registrarAcao({chatId,userId,ator,tipo:acao==='limpar'?'avisos_limpar':'advertencia',motivo,dados:{total}});
  const config=configGestao(chatId);
  if(acao==='adicionar'&&config.avisosLimite>0&&total===config.avisosLimite&&config.avisosAcao!=='nenhuma') {
    const resultado=await aplicarModeracao(telegram,{chatId,userId,ator,tipo:config.avisosAcao,duracao:config.avisosDuracao,motivo:`Limite de ${total} advertencias`});
    return {total,punicao:resultado.tipo};
  }
  return {total};
}
