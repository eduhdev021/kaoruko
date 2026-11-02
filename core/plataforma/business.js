import {db,botConfig,plataforma,eventoPlataforma} from './store.js';
import {normalizar} from '../automacao.js';
export function receberConexao(c){
 if(!c||typeof c.id!=='string'||!Number.isSafeInteger(c.user?.id))return;
 db.prepare('INSERT INTO platform_business(id,owner_id,is_enabled,dados,em) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET owner_id=excluded.owner_id,is_enabled=excluded.is_enabled,dados=excluded.dados,em=excluded.em,ativo=CASE WHEN excluded.is_enabled=0 OR owner_id!=excluded.owner_id THEN 0 ELSE ativo END').run(c.id,String(c.user.id),c.is_enabled?1:0,JSON.stringify({rights:c.rights||{},can_reply:c.can_reply??c.rights?.can_reply??false}),Date.now());
 eventoPlataforma('business_connection','',{id:c.id,is_enabled:Boolean(c.is_enabled)});
}
export function ativarBusiness(id,ativo){
 const c=db.prepare('SELECT * FROM platform_business WHERE id=?').get(id);if(!c||!botConfig.ehDono(c.owner_id))throw new Error('Conexao deve pertencer a um dono configurado da bot');
 if(ativo&&(!plataforma.business||!c.is_enabled))throw new Error('Business desativado ou conexao indisponivel');
 db.prepare('UPDATE platform_business SET ativo=? WHERE id=?').run(ativo?1:0,id);
}
export function salvarRegraBusiness(id,gatilho,resposta){
 const c=db.prepare('SELECT * FROM platform_business WHERE id=?').get(id);if(!c||!botConfig.ehDono(c.owner_id))throw new Error('Conexao nao autorizada');
 if(typeof gatilho!=='string'||!gatilho.trim()||gatilho.length>100||typeof resposta!=='string'||!resposta.trim()||resposta.length>2000)throw new Error('Gatilho 1–100 e resposta 1–2000 caracteres');
 if(db.prepare('SELECT count(*) n FROM platform_business_rules WHERE connection_id=?').get(id).n>=30&&!db.prepare('SELECT 1 FROM platform_business_rules WHERE connection_id=? AND gatilho=?').get(id,normalizar(gatilho)))throw new Error('Limite de 30 regras');
 db.prepare('INSERT INTO platform_business_rules(connection_id,gatilho,resposta) VALUES (?,?,?) ON CONFLICT(connection_id,gatilho) DO UPDATE SET resposta=excluded.resposta').run(id,normalizar(gatilho),resposta.trim());
}
const recentes=new Map();
export async function responderBusiness(telegram,msg){
 if(!plataforma.business||!msg?.business_connection_id||!msg.from||msg.from.is_bot||msg.sender_business_bot||!msg.text)return false;
 const c=db.prepare('SELECT * FROM platform_business WHERE id=?').get(msg.business_connection_id);
 if(!c||!c.ativo||!c.is_enabled||!botConfig.ehDono(c.owner_id)||String(msg.from.id)===c.owner_id)return false;
 if(!JSON.parse(c.dados).can_reply)return false;
 const r=db.prepare('SELECT resposta FROM platform_business_rules WHERE connection_id=? AND gatilho=?').get(c.id,normalizar(msg.text));if(!r)return false;
 const key=`${c.id}:${msg.chat.id}`,now=Date.now();if(now-(recentes.get(key)||0)<10000)return false;
 if(recentes.size>=10000)for(const[k,t]of recentes)if(now-t>10000)recentes.delete(k);if(recentes.size>=10000&&!recentes.has(key))return false;
 recentes.set(key,now);
 await telegram.callApi('sendMessage',{business_connection_id:c.id,chat_id:msg.chat.id,text:r.resposta});eventoPlataforma('business_reply','',{connectionId:c.id});return true;
}
