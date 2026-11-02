import {db} from '../db.js';
import botConfig from '../../config/index.js';
const sim=v=>['true','1','on'].includes(String(v).toLowerCase());
export const plataforma={
 mini:sim(process.env.TELEGRAM_MINI_APP_ENABLED),miniUrl:process.env.TELEGRAM_MINI_APP_URL||'',
 stars:sim(process.env.TELEGRAM_STARS_ENABLED),termosUrl:process.env.TELEGRAM_TERMS_URL||'',suporte:process.env.TELEGRAM_PAY_SUPPORT||'',
 business:sim(process.env.TELEGRAM_BUSINESS_ENABLED),inline:sim(process.env.TELEGRAM_INLINE_ENABLED),
 transporte:process.env.TELEGRAM_TRANSPORT||'polling',webhookUrl:process.env.TELEGRAM_WEBHOOK_URL||'',webhookSecret:process.env.TELEGRAM_WEBHOOK_SECRET||'',
};
export function httpsValida(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function requisitosPlataforma(){return{
 mini:{ativado:plataforma.mini,pronto:plataforma.mini&&httpsValida(plataforma.miniUrl)},
 stars:{ativado:plataforma.stars,pronto:plataforma.stars&&httpsValida(plataforma.termosUrl)&&Boolean(plataforma.suporte.trim())},
 business:{ativado:plataforma.business},inline:{ativado:plataforma.inline},transporte:plataforma.transporte,
 webhookPronto:plataforma.transporte==='webhook'&&httpsValida(plataforma.webhookUrl)&&/^[A-Za-z0-9_-]{32,256}$/.test(plataforma.webhookSecret),
};}
export {botConfig,db};
db.exec(`
CREATE TABLE IF NOT EXISTS platform_group(chat_id TEXT PRIMARY KEY,join_mode TEXT NOT NULL DEFAULT 'manual');
CREATE TABLE IF NOT EXISTS platform_join(chat_id TEXT NOT NULL,user_id TEXT NOT NULL,nome TEXT NOT NULL,em INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',PRIMARY KEY(chat_id,user_id));
CREATE TABLE IF NOT EXISTS platform_invites(link TEXT PRIMARY KEY,chat_id TEXT NOT NULL,em INTEGER NOT NULL,expira_em INTEGER NOT NULL,revogado INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS platform_drafts(token TEXT PRIMARY KEY,ator TEXT NOT NULL,chat_id TEXT NOT NULL,dados TEXT NOT NULL,expira_em INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS platform_products(id TEXT PRIMARY KEY,titulo TEXT NOT NULL,plano TEXT NOT NULL,stars INTEGER NOT NULL,dias INTEGER NOT NULL,ativo INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS platform_invoices(id TEXT PRIMARY KEY,payload TEXT UNIQUE NOT NULL,user_id TEXT NOT NULL,produto TEXT NOT NULL,total INTEGER NOT NULL,em INTEGER NOT NULL,expira_em INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'created',charge_id TEXT UNIQUE,vip_antes TEXT,vip_depois TEXT,refund_review INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_invoice_user ON platform_invoices(user_id,em);
CREATE TABLE IF NOT EXISTS platform_mini_sessions(hash TEXT PRIMARY KEY,usuario TEXT NOT NULL,expira_em INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS platform_business(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,is_enabled INTEGER NOT NULL,dados TEXT NOT NULL,ativo INTEGER NOT NULL DEFAULT 0,em INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS platform_business_rules(connection_id TEXT NOT NULL,gatilho TEXT NOT NULL,resposta TEXT NOT NULL,PRIMARY KEY(connection_id,gatilho));
CREATE TABLE IF NOT EXISTS platform_webhook(update_id INTEGER PRIMARY KEY,status TEXT NOT NULL,em INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS platform_events(id INTEGER PRIMARY KEY AUTOINCREMENT,tipo TEXT NOT NULL,chat_id TEXT NOT NULL DEFAULT '',dados TEXT NOT NULL,em INTEGER NOT NULL);
`);
export function eventoPlataforma(tipo,chatId,dados={}){
 db.prepare('INSERT INTO platform_events(tipo,chat_id,dados,em) VALUES (?,?,?,?)').run(tipo,String(chatId||''),JSON.stringify(dados),Date.now());
 db.prepare('DELETE FROM platform_events WHERE id NOT IN (SELECT id FROM platform_events ORDER BY id DESC LIMIT 2000)').run();
}
export function limparPlataforma(agora=Date.now()){
 db.prepare('DELETE FROM platform_mini_sessions WHERE expira_em<?').run(agora);
 db.prepare('DELETE FROM platform_drafts WHERE expira_em<?').run(agora-86400000);
 db.prepare('DELETE FROM platform_webhook WHERE em<?').run(agora-2*86400000);
 db.prepare('DELETE FROM platform_join WHERE em<?').run(agora-30*86400000);
 db.prepare("UPDATE platform_invoices SET status='expired' WHERE status IN ('created','prechecked') AND expira_em<?").run(agora);
}
