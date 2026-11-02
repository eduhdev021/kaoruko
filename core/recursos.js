import { db } from './db.js';
import { configGestao,registrarDia } from './gestao-store.js';
import { normalizar,obterAutomacao } from './automacao.js';
import { logAviso } from '../utils/logger.js';

// Migra notas de texto antigas uma unica vez sem ressuscitar notas removidas.
db.transaction(()=>{
  for(const r of db.prepare("SELECT chat_id,chave,texto FROM respostas_grupo WHERE tipo='nota'").all()) {
    db.prepare('INSERT OR IGNORE INTO conteudo_grupo(chat_id,tipo,chave,dados) VALUES (?,?,?,?)').run(r.chat_id,'nota',r.chave,JSON.stringify({texto:r.texto,botoes:[]}));
  }
  db.prepare("DELETE FROM respostas_grupo WHERE tipo='nota'").run();
})();

export function validarConteudo(dados) {
  if(!dados||typeof dados!=='object'||Array.isArray(dados))return null;
  const texto=dados.texto??'';
  const tipos=['photo','video','document','audio','voice','animation'];
  if(typeof texto!=='string'||texto.length>2000)return null;
  if(dados.midia&&(!tipos.includes(dados.midia.tipo)||typeof dados.midia.fileId!=='string'||dados.midia.fileId.length>1000||!dados.midia.fileId||!/^[A-Za-z0-9_-]+$/.test(dados.midia.fileId)))return null;
  if(!texto.trim()&&!dados.midia)return null;
  if(dados.midia&&texto.length>1000)return null;
  const botoes=dados.botoes??[];
  if(!Array.isArray(botoes)||botoes.length>5||!botoes.every(b=>b&&typeof b.texto==='string'&&b.texto.trim()&&b.texto.length<=50&&typeof b.url==='string'&&b.url.length<=1000&&(()=>{try{return new URL(b.url).protocol==='https:';}catch{return false;}})()))return null;
  return {texto: texto.trim(),...(dados.midia?{midia:{tipo:dados.midia.tipo,fileId:dados.midia.fileId}}:{}),botoes:botoes.map(b=>({texto:b.texto,url:b.url}))};
}
export function conteudoDeMensagem(msg,texto='') {
  let midia;
  if(msg?.photo?.length)midia={tipo:'photo',fileId:msg.photo.at(-1).file_id};
  else for(const tipo of ['video','document','audio','voice','animation'])if(msg?.[tipo]){midia={tipo,fileId:msg[tipo].file_id};break;}
  return {texto:texto||msg?.caption||msg?.text||'',...(midia?{midia}:{}),botoes:[]};
}
export function salvarConteudo(chatId,tipo,chave,dados) {
  if(typeof chave!=='string')throw new Error('Chave invalida');
  const nome=normalizar(chave);
  const conteudo=validarConteudo(dados);
  if(!['nota','comando'].includes(tipo)||!nome||nome.length>40||!conteudo||(tipo==='comando'&&!/^[a-z0-9_]{2,32}$/.test(nome)))throw new Error('Conteudo/chave invalido; atalhos usam 2–32 letras, numeros ou _');
  if(listarConteudos(chatId,tipo).length>=50&&!obterConteudo(chatId,tipo,nome))throw new Error('Limite de 50 itens por tipo');
  db.prepare('INSERT INTO conteudo_grupo(chat_id,tipo,chave,dados) VALUES (?,?,?,?) ON CONFLICT(chat_id,tipo,chave) DO UPDATE SET dados=excluded.dados').run(String(chatId),tipo,nome,JSON.stringify(conteudo));
  return conteudo;
}
export function obterConteudo(chatId,tipo,chave) {const r=db.prepare('SELECT dados FROM conteudo_grupo WHERE chat_id=? AND tipo=? AND chave=?').get(String(chatId),tipo,normalizar(chave));return r?JSON.parse(r.dados):null;}
export function listarConteudos(chatId,tipo) {return db.prepare('SELECT chave,dados FROM conteudo_grupo WHERE chat_id=? AND tipo=? ORDER BY chave').all(String(chatId),tipo).map(r=>({chave:r.chave,...JSON.parse(r.dados)}));}
export function removerConteudo(chatId,tipo,chave){return db.prepare('DELETE FROM conteudo_grupo WHERE chat_id=? AND tipo=? AND chave=?').run(String(chatId),tipo,normalizar(chave)).changes>0;}
export async function enviarConteudo(telegram,chatId,conteudo) {
  const d=validarConteudo(conteudo);if(!d)throw new Error('Conteudo invalido');
  const extra=d.botoes.length?{reply_markup:{inline_keyboard:d.botoes.map(b=>[{text:b.texto,url:b.url}])}}:{};
  if(!d.midia)return telegram.sendMessage(chatId,d.texto,extra);
  const method={photo:'sendPhoto',video:'sendVideo',document:'sendDocument',audio:'sendAudio',voice:'sendVoice',animation:'sendAnimation'}[d.midia.tipo];
  return telegram[method](chatId,d.midia.fileId,{...extra,caption:d.texto});
}
export function agendarPublicacao(chatId,autor,{texto,venceEm,intervalo=0}) {
  if(typeof texto!=='string'||!texto.trim()||texto.length>3500||!Number.isSafeInteger(venceEm)||venceEm<Date.now()+10000||venceEm>Date.now()+366*86400000||!Number.isInteger(intervalo)||intervalo<0||intervalo>2592000000||(intervalo>0&&intervalo<60000))throw new Error('Texto ate 3500 caracteres, data entre 10s e 366 dias, repeticao >=1min e <=30d');
  if(db.prepare("SELECT count(*) n FROM publicacoes WHERE chat_id=? AND estado='pendente'").get(String(chatId)).n>=30)throw new Error('Limite de 30 publicacoes pendentes por grupo');
  return Number(db.prepare('INSERT INTO publicacoes(chat_id,autor,texto,vence_em,intervalo) VALUES (?,?,?,?,?)').run(String(chatId),String(autor),texto.trim(),venceEm,intervalo).lastInsertRowid);
}
export function listarPublicacoes(chatId){return db.prepare('SELECT * FROM publicacoes WHERE chat_id=? ORDER BY id DESC LIMIT 100').all(String(chatId));}
export function cancelarPublicacao(chatId,id){return db.prepare("UPDATE publicacoes SET estado='cancelada' WHERE chat_id=? AND id=? AND estado='pendente'").run(String(chatId),Number(id)).changes>0;}
export async function entregarPublicacoes(telegram,agora=Date.now()) {
  for(const row of db.prepare("SELECT * FROM publicacoes WHERE estado='pendente' AND vence_em<=? ORDER BY vence_em LIMIT 10").all(agora)) {
    try {
      await telegram.sendMessage(row.chat_id,row.texto);
      // Respeita cancelamento efetuado enquanto o envio estava em andamento.
      if(row.intervalo)db.prepare("UPDATE publicacoes SET vence_em=?,tentativas=0,erro='' WHERE id=? AND estado='pendente'").run(agora+row.intervalo,row.id);
      else db.prepare("UPDATE publicacoes SET estado='enviada',erro='' WHERE id=? AND estado='pendente'").run(row.id);
    } catch(err) {
      const code=err.response?.error_code;
      if([400,403].includes(code)||row.tentativas>=4)db.prepare("UPDATE publicacoes SET estado='falha',erro=? WHERE id=? AND estado='pendente'").run(String(err.message).slice(0,300),row.id);
      else db.prepare("UPDATE publicacoes SET tentativas=tentativas+1,vence_em=?,erro=? WHERE id=? AND estado='pendente'").run(agora+Math.max(60,Number(err.response?.parameters?.retry_after)||60)*1000,String(err.message).slice(0,300),row.id);
      logAviso(`Publicacao ${row.id}: ${err.message}`);
    }
  }
}
export function reputacaoGrupo(chatId){return db.prepare('SELECT user_id,nome,pontos FROM reputacao_grupo WHERE chat_id=? ORDER BY pontos DESC,user_id LIMIT 10').all(String(chatId)).map(x=>({...x,nivel:Math.floor(Math.sqrt(x.pontos/5))+1}));}
export function darReputacao(chatId,autor,alvo,agora=Date.now()) {
  if(!configGestao(chatId).reputacao)throw new Error('Reputacao desativada');
  if(String(autor)===String(alvo.id)||alvo.is_bot)throw new Error('Nao pode votar em si mesmo ou bots');
  return db.transaction(()=>{
    const voto=db.prepare('SELECT * FROM votos_reputacao WHERE chat_id=? AND autor=?').get(String(chatId),String(autor));
    if(voto&&agora-voto.em<86400000)throw new Error('Apenas um voto por pessoa a cada 24 horas neste grupo');
    db.prepare('INSERT INTO votos_reputacao(chat_id,autor,alvo,em) VALUES (?,?,?,?) ON CONFLICT(chat_id,autor) DO UPDATE SET alvo=excluded.alvo,em=excluded.em').run(String(chatId),String(autor),String(alvo.id),agora);
    db.prepare('INSERT INTO reputacao_grupo(chat_id,user_id,nome,pontos) VALUES (?,?,?,1) ON CONFLICT(chat_id,user_id) DO UPDATE SET pontos=pontos+1,nome=excluded.nome').run(String(chatId),String(alvo.id),String(alvo.first_name||'Membro').slice(0,80));
    return true;
  })();
}
export function registrarAnalise(ctx) {
  if(!['group','supergroup'].includes(ctx.chat?.type)||!ctx.from||ctx.from.is_bot)return;
  // Analytics usa a mesma opcao de consentimento do ranking, nao depende de reputacao.
  if(obterAutomacao(ctx.chat.id).ranking)registrarDia(ctx.chat.id,'mensagens');
}
