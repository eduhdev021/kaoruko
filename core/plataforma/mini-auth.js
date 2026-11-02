import crypto from 'node:crypto';
import {db} from './store.js';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
export function validarInitData(initData,token,{agora=Date.now(),maxIdade=300}={}){
 if(typeof initData!=='string'||initData.length>16384||!token)return null;
 const p=new URLSearchParams(initData),keys=[...p.keys()];
 if(new Set(keys).size!==keys.length)return null;
 const hash=p.get('hash');if(!/^[a-f0-9]{64}$/i.test(hash||''))return null;
 p.delete('hash');
 const texto=[...p.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
 const esperado=crypto.createHmac('sha256',secret).update(texto).digest();
 if(!crypto.timingSafeEqual(esperado,Buffer.from(hash,'hex')))return null;
 const authDate=Number(p.get('auth_date')),now=Math.floor(agora/1000);
 if(!Number.isSafeInteger(authDate)||authDate<=0||authDate>now+30||now-authDate>maxIdade)return null;
 try{const u=JSON.parse(p.get('user'));if(!Number.isSafeInteger(u.id)||u.id<=0||typeof u.first_name!=='string')return null;
 return{id:u.id,first_name:u.first_name.slice(0,80),...(typeof u.username==='string'?{username:u.username.slice(0,40)}:{})};}catch{return null;}
}
export function criarSessaoMini(usuario,agora=Date.now()){
 const token=crypto.randomBytes(32).toString('hex'),expira=agora+15*60000;
 db.prepare('INSERT INTO platform_mini_sessions(hash,usuario,expira_em) VALUES (?,?,?)').run(sha(token),JSON.stringify(usuario),expira);
 return {token,expiraEm:expira};
}
export function usuarioMini(token,agora=Date.now()){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=db.prepare('SELECT * FROM platform_mini_sessions WHERE hash=?').get(sha(token));
 return row&&row.expira_em>agora?JSON.parse(row.usuario):null;
}
export function encerrarMini(token){if(typeof token==='string')db.prepare('DELETE FROM platform_mini_sessions WHERE hash=?').run(sha(token));}
