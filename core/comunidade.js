import { configGestao,registrarAcao } from './gestao-store.js';
import { extrairHosts,linksPermitidos } from './antispam.js';
import { db } from './db.js';
import botConfig from '../config/index.js';
import { escapeHtml } from '../utils/helpers.js';
import { logAviso } from '../utils/logger.js';

db.exec(`
CREATE TABLE IF NOT EXISTS comunidade_config (
 chat_id TEXT PRIMARY KEY, boasvindas TEXT NOT NULL DEFAULT '',
 regras TEXT NOT NULL DEFAULT '', antilink INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS comunidade_avisos (
 chat_id TEXT NOT NULL, user_id TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(chat_id,user_id)
);
`);
export function configGrupo(chatId) {
  return db.prepare('SELECT * FROM comunidade_config WHERE chat_id=?').get(String(chatId)) ??
    { chat_id: String(chatId), boasvindas: '', regras: '', antilink: 0 };
}
export function configurarGrupo(chatId, campo, valor) {
  if (!['boasvindas', 'regras', 'antilink'].includes(campo)) throw new Error('Campo invalido');
  db.prepare('INSERT OR IGNORE INTO comunidade_config(chat_id) VALUES (?)').run(String(chatId));
  db.prepare(`UPDATE comunidade_config SET ${campo}=? WHERE chat_id=?`).run(valor, String(chatId));
  return configGrupo(chatId);
}
export function advertencias(chatId, userId, acao = 'ver') {
  const args = [String(chatId), String(userId)];
  if (acao === 'limpar') db.prepare('DELETE FROM comunidade_avisos WHERE chat_id=? AND user_id=?').run(...args);
  if (acao === 'adicionar') db.prepare(`INSERT INTO comunidade_avisos(chat_id,user_id,total) VALUES (?,?,1)
    ON CONFLICT(chat_id,user_id) DO UPDATE SET total=total+1`).run(...args);
  return db.prepare('SELECT total FROM comunidade_avisos WHERE chat_id=? AND user_id=?').get(...args)?.total ?? 0;
}
export function temLink(msg) {
  const entities = [...(msg.entities ?? []), ...(msg.caption_entities ?? [])];
  return entities.some(e => ['url', 'text_link'].includes(e.type)) ||
    /(?:https?:\/\/|www\.|(?:t\.me|telegram\.me)\/)/i.test(msg.text ?? msg.caption ?? '');
}
export function textoBoasVindas(modelo, membro, grupo) {
  const vars = { nome: membro.first_name || 'Membro', grupo: grupo || 'Grupo', id: String(membro.id) };
  return escapeHtml(modelo).replace(/\{(nome|grupo|id)\}/g, (_, key) => escapeHtml(vars[key]));
}
export async function processarComunidade(ctx, {mensagem = ctx.message} = {}) {
  if (!['group', 'supergroup'].includes(ctx.chat?.type)) return false;
  const msg = mensagem;
  if (!msg) return false;
  const config = configGrupo(ctx.chat.id);
  if (msg.new_chat_members?.length && config.boasvindas) {
    for (const membro of msg.new_chat_members.filter(m => !m.is_bot)) {
      await ctx.reply(textoBoasVindas(config.boasvindas, membro, ctx.chat.title), { parse_mode: 'HTML' })
        .catch(err => logAviso(`Boas-vindas: ${err.message}`));
    }
  }
  const avancada=configGestao(ctx.chat.id);
  if (!config.antilink || (!temLink(msg)&&!extrairHosts(msg).length) || !ctx.from || ctx.from.is_bot) return false;
  if(linksPermitidos(msg,avancada.dominios))return false;
  // Administradores anonimos publicam em nome do grupo, nao do usuario ficticio.
  if (msg.sender_chat?.id === ctx.chat.id || botConfig.ehDono(ctx.from.id)) return false;
  try {
    const membro = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    if (['creator', 'administrator'].includes(membro.status)) return false;
  } catch (err) {
    logAviso(`Antilink: nao foi possivel verificar permissoes: ${err.message}`);
    return false;
  }
  try {
    await ctx.deleteMessage();
    registrarAcao({chatId:ctx.chat.id,userId:ctx.from.id,tipo:"antilink"});
    await ctx.reply('Link removido: este grupo esta com o antilink ativado.');
  } catch (err) { logAviso(`Antilink: verifique a permissao de apagar mensagens: ${err.message}`); }
  return true;
}
