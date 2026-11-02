import { db } from './db.js';
import { logAviso } from '../utils/logger.js';

db.exec(`CREATE TABLE IF NOT EXISTS lembretes (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, chat_id TEXT NOT NULL,
 texto TEXT NOT NULL, vence_em INTEGER NOT NULL, tentativas INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lembretes_vence ON lembretes(vence_em);`);
export function duracaoMs(texto) {
  const match = /^(\d+)(s|m|h|d)$/i.exec(texto ?? '');
  if (!match) return 0;
  const ms = Number(match[1]) * {s: 1000, m: 60000, h: 3600000, d: 86400000}[match[2].toLowerCase()];
  return Number.isSafeInteger(ms) && ms >= 10000 && ms <= 30 * 86400000 ? ms : 0;
}
export function listarLembretes(userId) {
  return db.prepare('SELECT * FROM lembretes WHERE user_id=? ORDER BY vence_em').all(String(userId));
}
export function criarLembrete(userId, chatId, texto, atraso) {
  if (!Number.isSafeInteger(atraso) || atraso < 10000 || atraso > 30 * 86400000) throw new Error('Prazo entre 10 segundos e 30 dias');
  if (typeof texto !== 'string' || !texto.trim() || texto.length > 1000) throw new Error('Texto entre 1 e 1000 caracteres');
  if (listarLembretes(userId).length >= 10) throw new Error('Voce ja tem 10 lembretes pendentes');
  return Number(db.prepare('INSERT INTO lembretes(user_id,chat_id,texto,vence_em) VALUES (?,?,?,?)')
    .run(String(userId), String(chatId), texto.trim(), Date.now() + atraso).lastInsertRowid);
}
export function cancelarLembrete(userId, id) {
  return db.prepare('DELETE FROM lembretes WHERE id=? AND user_id=?').run(Number(id), String(userId)).changes > 0;
}
export async function entregarLembretes(telegram, agora = Date.now()) {
  const lista = db.prepare('SELECT * FROM lembretes WHERE vence_em<=? ORDER BY vence_em LIMIT 20').all(agora);
  for (const item of lista) {
    try {
      await telegram.sendMessage(item.chat_id, `⏰ Lembrete para ${item.user_id}\n\n${item.texto}`);
      db.prepare('DELETE FROM lembretes WHERE id=?').run(item.id);
    } catch (err) {
      const code = err.response?.error_code;
      if ([400, 403].includes(code) || item.tentativas >= 4) {
        db.prepare('DELETE FROM lembretes WHERE id=?').run(item.id);
        logAviso(`Lembrete ${item.id} descartado: ${err.message}`);
      } else {
        const retry = Number(err.response?.parameters?.retry_after) || 60;
        db.prepare('UPDATE lembretes SET tentativas=tentativas+1, vence_em=? WHERE id=?')
          .run(agora + Math.max(retry, 60) * 1000, item.id);
      }
    }
  }
}
export function iniciarLembretes(telegram) {
  let executando = false;
  let pendente = Promise.resolve();
  const tick = () => {
    if (executando) return;
    executando = true;
    pendente = entregarLembretes(telegram).catch(e => logAviso(`Lembretes: ${e.message}`))
      .finally(() => { executando = false; });
  };
  const timer = setInterval(tick, 5000);
  timer.unref();
  tick();
  return async () => { clearInterval(timer); await pendente; };
}
