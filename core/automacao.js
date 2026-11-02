import { registrarAcao } from './gestao-store.js';
import { db } from './db.js';
import botConfig from '../config/index.js';
import { logAviso } from '../utils/logger.js';

db.exec(`
CREATE TABLE IF NOT EXISTS automacao_config(chat_id TEXT PRIMARY KEY, dados TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS respostas_grupo(chat_id TEXT NOT NULL, tipo TEXT NOT NULL, chave TEXT NOT NULL, texto TEXT NOT NULL, PRIMARY KEY(chat_id,tipo,chave));
CREATE TABLE IF NOT EXISTS atividade_grupo(chat_id TEXT NOT NULL, user_id TEXT NOT NULL, nome TEXT NOT NULL, mensagens INTEGER NOT NULL DEFAULT 0, ultima_em INTEGER NOT NULL, PRIMARY KEY(chat_id,user_id));
`);
const padrao = () => ({antiflood: 0, janela: 10, bloqueios: [], palavras: [], ranking: false});
export function obterAutomacao(chatId) {
  const linha = db.prepare('SELECT dados FROM automacao_config WHERE chat_id=?').get(String(chatId));
  return {...padrao(), ...(linha ? JSON.parse(linha.dados) : {})};
}
export function salvarAutomacao(chatId, config) {
  db.prepare('INSERT INTO automacao_config(chat_id,dados) VALUES (?,?) ON CONFLICT(chat_id) DO UPDATE SET dados=excluded.dados')
    .run(String(chatId), JSON.stringify({...obterAutomacao(chatId), ...config}));
}
export function normalizar(texto) { return String(texto).normalize('NFKC').toLocaleLowerCase('pt-BR').trim(); }
export function listarRespostas(chatId, tipo) {
  return db.prepare('SELECT chave,texto FROM respostas_grupo WHERE chat_id=? AND tipo=? ORDER BY chave').all(String(chatId), tipo);
}
export function salvarResposta(chatId, tipo, chave, texto) {
  chave = normalizar(chave);
  if (!['nota', 'filtro'].includes(tipo) || !chave || chave.length > 60 || !texto?.trim() || texto.length > 2000) throw new Error('Chave: 1 a 60 caracteres; texto: 1 a 2000.');
  const lista = listarRespostas(chatId, tipo);
  if (lista.length >= 50 && !lista.some(x => x.chave === chave)) throw new Error('Limite de 50 itens por tipo neste grupo.');
  db.prepare('INSERT INTO respostas_grupo(chat_id,tipo,chave,texto) VALUES (?,?,?,?) ON CONFLICT(chat_id,tipo,chave) DO UPDATE SET texto=excluded.texto')
    .run(String(chatId), tipo, chave, texto.trim());
}
export function removerResposta(chatId, tipo, chave) {
  return db.prepare('DELETE FROM respostas_grupo WHERE chat_id=? AND tipo=? AND chave=?').run(String(chatId), tipo, normalizar(chave)).changes > 0;
}
export function respostaGrupo(chatId, tipo, chave) {
  return db.prepare('SELECT texto FROM respostas_grupo WHERE chat_id=? AND tipo=? AND chave=?').get(String(chatId), tipo, normalizar(chave))?.texto;
}
export const TIPOS_BLOQUEIO = ['stickers', 'fotos', 'videos', 'audios', 'documentos', 'encaminhadas'];
export function motivoBloqueio(msg, config) {
  const tipos = {stickers: msg.sticker, fotos: msg.photo, videos: msg.video || msg.video_note || msg.animation,
    audios: msg.audio || msg.voice, documentos: msg.document, encaminhadas: msg.forward_origin || msg.forward_date};
  if (config.bloqueios.some(tipo => tipos[tipo])) return 'conteudo bloqueado';
  const texto = normalizar(msg.text ?? msg.caption ?? '');
  if (config.palavras.some(p => texto.includes(p))) return 'palavra bloqueada';
  return '';
}
const janelas = new Map();
const respostasRecentes = new Map();
export function detectarFlood(chave, limite, janela, agora = Date.now()) {
  if (!limite) return false;
  if (janelas.size >= 10000) {
    for (const [key, item] of janelas) if (item.ate <= agora) janelas.delete(key);
    if (janelas.size >= 10000 && !janelas.has(chave)) return false;
  }
  let item = janelas.get(chave);
  if (!item || item.ate <= agora) { item = {total: 0, ate: agora + janela * 1000}; janelas.set(chave, item); }
  return ++item.total > limite;
}
export function registrarAtividade(chatId, from, agora = Date.now()) {
  db.prepare(`INSERT INTO atividade_grupo(chat_id,user_id,nome,mensagens,ultima_em) VALUES (?,?,?,1,?)
    ON CONFLICT(chat_id,user_id) DO UPDATE SET nome=excluded.nome,
    mensagens=atividade_grupo.mensagens + CASE WHEN excluded.ultima_em-atividade_grupo.ultima_em>=30000 THEN 1 ELSE 0 END,
    ultima_em=CASE WHEN excluded.ultima_em-atividade_grupo.ultima_em>=30000 THEN excluded.ultima_em ELSE atividade_grupo.ultima_em END`)
    .run(String(chatId), String(from.id), String(from.first_name || 'Membro').slice(0, 80), agora);
}
export function rankingGrupo(chatId) {
  return db.prepare('SELECT user_id,nome,mensagens FROM atividade_grupo WHERE chat_id=? ORDER BY mensagens DESC,user_id LIMIT 10').all(String(chatId));
}
export function limparRanking(chatId) { db.prepare('DELETE FROM atividade_grupo WHERE chat_id=?').run(String(chatId)); }
export async function processarAutomacao(ctx, {mensagem = ctx.message, editada = false} = {}) {
  if (!['group', 'supergroup'].includes(ctx.chat?.type) || !ctx.from || ctx.from.is_bot || !mensagem) return false;
  const msg = mensagem;
  const config = obterAutomacao(ctx.chat.id);
  const temConteudo = ['text','caption','photo','sticker','video','audio','voice','document','animation','video_note'].some(k => msg[k]);
  if (!temConteudo) return false;
  let motivo = motivoBloqueio(msg, config);
  const flood = !editada && detectarFlood(`${ctx.chat.id}:${ctx.from.id}`, config.antiflood, config.janela);
  if (motivo || flood) {
    let isento = botConfig.ehDono(ctx.from.id) || msg.sender_chat?.id === ctx.chat.id;
    if (!isento) {
      try { const m = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id); isento = ['creator','administrator'].includes(m.status); }
      catch (err) { logAviso(`Protecao: falha ao verificar admin: ${err.message}`); return false; }
    }
    if (!isento) {
      try { await ctx.deleteMessage(); registrarAcao({chatId:ctx.chat.id,userId:ctx.from.id,tipo:flood?"antiflood":"bloqueio",motivo}); }
      catch (err) { logAviso(`Protecao: nao consegui apagar mensagem: ${err.message}`); }
      return true;
    }
  }
  if (config.ranking && !editada) registrarAtividade(ctx.chat.id, ctx.from);
  const texto = msg.text ?? '';
  // Nao interfere em comandos; filtros usam igualdade da mensagem inteira.
  if (editada || !texto || botConfig.prefixes.some(p => texto.startsWith(p))) return false;
  const resposta = respostaGrupo(ctx.chat.id, 'filtro', texto);
  if (!resposta) return false;
  const key = String(ctx.chat.id);
  const agora = Date.now();
  if (agora - (respostasRecentes.get(key) || 0) < 5000) return false;
  if (respostasRecentes.size >= 10000) for (const [k, t] of respostasRecentes) if (agora - t >= 5000) respostasRecentes.delete(k);
  if (respostasRecentes.size >= 10000 && !respostasRecentes.has(key)) return false;
  respostasRecentes.set(key, agora);
  await ctx.reply(resposta).catch(err => logAviso(`Filtro: ${err.message}`));
  return true;
}

export function validarAutomacao(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return null;
  const {antiflood, janela, bloqueios, palavras, ranking} = dados;
  if (!Number.isInteger(antiflood) || (antiflood !== 0 && (antiflood < 3 || antiflood > 30)) ||
      !Number.isInteger(janela) || janela < 5 || janela > 60 || typeof ranking !== 'boolean' ||
      !Array.isArray(bloqueios) || bloqueios.length > TIPOS_BLOQUEIO.length || !bloqueios.every(x => TIPOS_BLOQUEIO.includes(x)) ||
      !Array.isArray(palavras) || palavras.length > 50 || !palavras.every(x => typeof x === 'string' && normalizar(x).length >= 2 && normalizar(x).length <= 60)) return null;
  return {antiflood, janela, bloqueios: [...new Set(bloqueios)], palavras: [...new Set(palavras.map(normalizar))], ranking};
}
