import { db } from './db.js';

export const VERSAO = '5.0.0';
export const CONFIG_PADRAO = Object.freeze({captcha: false, captchaPrazo: 120, captchaTimeout: 'liberar', antiraid: false, raidLimite: 6, raidJanela: 10, raidDuracao: 180, duplicadas: false, dominios: [], avisosLimite: 0, avisosAcao: 'nenhuma', avisosDuracao: 600, reputacao: false});
db.exec(`
CREATE TABLE IF NOT EXISTS gestao_config(chat_id TEXT PRIMARY KEY, dados TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS moderacao_historico(id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '', ator TEXT NOT NULL, tipo TEXT NOT NULL, motivo TEXT NOT NULL DEFAULT '', dados TEXT NOT NULL DEFAULT '{}', em INTEGER NOT NULL, desfeito INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_moderacao_grupo ON moderacao_historico(chat_id,em);
CREATE TABLE IF NOT EXISTS captcha_pendente(token TEXT PRIMARY KEY, chat_id TEXT NOT NULL, user_id TEXT NOT NULL, resposta TEXT NOT NULL, expira_em INTEGER NOT NULL, tentativas INTEGER NOT NULL DEFAULT 0, estado TEXT NOT NULL DEFAULT 'ativo', permissoes TEXT NOT NULL, modo TEXT NOT NULL, message_id INTEGER, UNIQUE(chat_id,user_id));
CREATE TABLE IF NOT EXISTS entradas_grupo(id INTEGER PRIMARY KEY AUTOINCREMENT,chat_id TEXT NOT NULL,em INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_entradas_grupo ON entradas_grupo(chat_id,em);
CREATE TABLE IF NOT EXISTS raid_ativo(chat_id TEXT PRIMARY KEY,ate INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS conteudo_grupo(chat_id TEXT NOT NULL,tipo TEXT NOT NULL,chave TEXT NOT NULL,dados TEXT NOT NULL,PRIMARY KEY(chat_id,tipo,chave));
CREATE TABLE IF NOT EXISTS publicacoes(id INTEGER PRIMARY KEY AUTOINCREMENT,chat_id TEXT NOT NULL,autor TEXT NOT NULL,texto TEXT NOT NULL,vence_em INTEGER NOT NULL,intervalo INTEGER NOT NULL DEFAULT 0,tentativas INTEGER NOT NULL DEFAULT 0,estado TEXT NOT NULL DEFAULT 'pendente',erro TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS idx_publicacoes_em ON publicacoes(estado,vence_em);
CREATE TABLE IF NOT EXISTS reputacao_grupo(chat_id TEXT NOT NULL,user_id TEXT NOT NULL,nome TEXT NOT NULL,pontos INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(chat_id,user_id));
CREATE TABLE IF NOT EXISTS votos_reputacao(chat_id TEXT NOT NULL,autor TEXT NOT NULL,alvo TEXT NOT NULL,em INTEGER NOT NULL,PRIMARY KEY(chat_id,autor));
CREATE TABLE IF NOT EXISTS atividade_diaria(chat_id TEXT NOT NULL,dia TEXT NOT NULL,mensagens INTEGER NOT NULL DEFAULT 0,entradas INTEGER NOT NULL DEFAULT 0,saidas INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(chat_id,dia));
`);
export function configGestao(chatId) {
  const row = db.prepare('SELECT dados FROM gestao_config WHERE chat_id=?').get(String(chatId));
  return {...CONFIG_PADRAO, dominios: [], ...(row ? JSON.parse(row.dados) : {})};
}
export function validarGestao(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).some(k => !Object.hasOwn(CONFIG_PADRAO,k))) return null;
  const x = {...CONFIG_PADRAO, ...c};
  if (!['captcha','antiraid','duplicadas','reputacao'].every(k => typeof x[k] === 'boolean')) return null;
  for (const [k,min,max] of [['captchaPrazo',60,600],['raidLimite',3,100],['raidJanela',5,60],['raidDuracao',60,3600],['avisosLimite',0,20],['avisosDuracao',60,2592000]]) if (!Number.isInteger(x[k]) || x[k]<min || x[k]>max) return null;
  if (!['liberar','expulsar'].includes(x.captchaTimeout) || !['nenhuma','silenciar','expulsar'].includes(x.avisosAcao)) return null;
  if (!Array.isArray(x.dominios) || x.dominios.length > 50 || !x.dominios.every(d => typeof d === 'string' && d.length<=253 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(d))) return null;
  return {...x, dominios: [...new Set(x.dominios.map(d => d.toLowerCase()))]};
}
export function salvarGestao(chatId, dados) {
  const c = validarGestao({...configGestao(chatId),...dados});
  if (!c) throw new Error('Configuracao avancada invalida');
  db.prepare('INSERT INTO gestao_config(chat_id,dados) VALUES (?,?) ON CONFLICT(chat_id) DO UPDATE SET dados=excluded.dados').run(String(chatId),JSON.stringify(c));
  return c;
}
export function registrarAcao({chatId,userId='',ator='sistema',tipo,motivo='',dados={}}) {
  const id = db.prepare('INSERT INTO moderacao_historico(chat_id,user_id,ator,tipo,motivo,dados,em) VALUES (?,?,?,?,?,?,?)').run(String(chatId),String(userId),String(ator),String(tipo).slice(0,60),String(motivo).slice(0,500),JSON.stringify(dados),Date.now()).lastInsertRowid;
  // Retencao maxima por grupo, evitando crescimento sem limite por flood.
  db.prepare('DELETE FROM moderacao_historico WHERE chat_id=? AND id NOT IN (SELECT id FROM moderacao_historico WHERE chat_id=? ORDER BY id DESC LIMIT 2000)').run(String(chatId),String(chatId));
  return Number(id);
}
export function historicoModeracao(chatId, limite=50) {
  return db.prepare('SELECT * FROM moderacao_historico WHERE chat_id=? ORDER BY id DESC LIMIT ?').all(String(chatId),Math.min(100,Math.max(1,Number(limite)||50))).map(x=>({...x,dados:JSON.parse(x.dados)}));
}
export function registrarDia(chatId,campo,agora=Date.now()) {
  if (!['mensagens','entradas','saidas'].includes(campo)) throw new Error('Metrica invalida');
  const dia=new Date(agora).toISOString().slice(0,10);
  db.prepare(`INSERT INTO atividade_diaria(chat_id,dia,${campo}) VALUES (?,?,1) ON CONFLICT(chat_id,dia) DO UPDATE SET ${campo}=${campo}+1`).run(String(chatId),dia);
}
export function analiseGrupo(chatId) {
  return db.prepare("SELECT * FROM atividade_diaria WHERE chat_id=? AND dia>=date('now','-29 days') ORDER BY dia").all(String(chatId));
}
