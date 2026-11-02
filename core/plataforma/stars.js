import crypto from 'node:crypto';
import {db,plataforma,requisitosPlataforma,eventoPlataforma} from './store.js';
import {PLANOS,ORDEM_PLANOS,obterVip,adicionarVip} from '../vip.js';
export function salvarProduto(d){
 if(!d||typeof d.id!=='string'||!/^[a-z0-9_-]{2,40}$/.test(d.id)||typeof d.titulo!=='string'||!d.titulo.trim()||d.titulo.length>32||!Object.hasOwn(PLANOS,d.plano)||!Number.isInteger(d.stars)||d.stars<1||d.stars>100000||!Number.isInteger(d.dias)||d.dias<1||d.dias>365||typeof d.ativo!=='boolean')throw new Error('Produto invalido: ID, titulo ate 32 caracteres, plano, 1–100000 Stars e 1–365 dias');
 db.prepare('INSERT INTO platform_products(id,titulo,plano,stars,dias,ativo) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET titulo=excluded.titulo,plano=excluded.plano,stars=excluded.stars,dias=excluded.dias,ativo=excluded.ativo').run(d.id,d.titulo.trim(),d.plano,d.stars,d.dias,d.ativo?1:0);
 return {...d};
}
export function produtosStars(todos=false){return db.prepare(`SELECT * FROM platform_products ${todos?'':'WHERE ativo=1'} ORDER BY stars`).all().map(x=>({...x,ativo:Boolean(x.ativo)}));}
export async function criarFatura(telegram,userId,produtoId,{link=false}={}){
 if(!requisitosPlataforma().stars.pronto)throw new Error('Stars desativado ou termos/suporte nao configurados');
 if(!Number.isSafeInteger(Number(userId))||Number(userId)<=0)throw new Error('Usuario invalido');
 const produto=produtosStars().find(x=>x.id===produtoId);if(!produto)throw new Error('Produto indisponivel');
 const atual=obterVip(userId);if(atual?.vitalicio)throw new Error('Conta ja possui VIP vitalicio; compra bloqueada para evitar cobranca sem beneficio');
 if(db.prepare("SELECT count(*) n FROM platform_invoices WHERE user_id=? AND status IN ('created','prechecked') AND expira_em>?").get(String(userId),Date.now()).n>=5)throw new Error('Ja existem 5 faturas pendentes; aguarde expirarem');
 const id=crypto.randomUUID(),payload='kw5_'+crypto.randomBytes(24).toString('hex');
 db.prepare('INSERT INTO platform_invoices(id,payload,user_id,produto,total,em,expira_em) VALUES (?,?,?,?,?,?,?)').run(id,payload,String(userId),JSON.stringify(produto),produto.stars,Date.now(),Date.now()+30*60000);
 const params={title:produto.titulo,description:`VIP ${produto.plano} por ${produto.dias} dias. Termos: ${plataforma.termosUrl}`.slice(0,255),payload,provider_token:'',currency:'XTR',prices:[{label:produto.titulo,amount:produto.stars}]};
 try{const resultado=await telegram.callApi(link?'createInvoiceLink':'sendInvoice',link?params:{...params,chat_id:Number(userId)});return{id,...(link?{link:resultado}:{mensagem:resultado})};}
 catch(e){db.prepare("UPDATE platform_invoices SET status='send_failed' WHERE id=?").run(id);throw e;}
}
export async function preCheckout(telegram,q){
 const r=db.prepare('SELECT * FROM platform_invoices WHERE payload=?').get(q.invoice_payload);
 let erro='Fatura invalida, expirada ou pagamento desativado.';
 const ok=requisitosPlataforma().stars.pronto&&r&&['created','prechecked'].includes(r.status)&&r.expira_em>Date.now()&&r.user_id===String(q.from?.id)&&q.currency==='XTR'&&q.total_amount===r.total;
 if(ok)db.prepare("UPDATE platform_invoices SET status='prechecked' WHERE id=?").run(r.id);
 await telegram.callApi('answerPreCheckoutQuery',{pre_checkout_query_id:q.id,ok:Boolean(ok),...(!ok?{error_message:erro}:{})});return Boolean(ok);
}
export function confirmarPagamento(userId,p){
 if(!p||p.currency!=='XTR'||typeof p.telegram_payment_charge_id!=='string'||!p.telegram_payment_charge_id)throw new Error('Pagamento invalido');
 return db.transaction(()=>{
 const r=db.prepare('SELECT * FROM platform_invoices WHERE payload=?').get(p.invoice_payload);
 if(!r||r.user_id!==String(userId)||r.total!==p.total_amount)throw new Error('Pagamento nao corresponde a fatura');
 if(['paid','refunded','refund_pending','refund_review'].includes(r.status)){if(r.charge_id!==p.telegram_payment_charge_id)throw new Error('Fatura ja liquidada com outro charge');return{duplicado:true,id:r.id};}
 if(!['created','prechecked','expired'].includes(r.status))throw new Error('Estado de fatura invalido');
 const charge=db.prepare('SELECT id FROM platform_invoices WHERE charge_id=?').get(p.telegram_payment_charge_id);if(charge)throw new Error('Charge duplicado em outra fatura');
 const produto=JSON.parse(r.produto),antes=obterVip(userId);let depois=antes;
 // Mantem plano superior ja adquirido e nunca reduz um vitalicio concorrente.
 if(!antes?.vitalicio){const ativo=antes&&antes.expira_em>Date.now();const plano=ativo&&ORDEM_PLANOS.indexOf(antes.plano)>ORDEM_PLANOS.indexOf(produto.plano)?antes.plano:produto.plano;
 depois=adicionarVip(userId,{plano,duracaoMs:produto.dias*86400000,por:`Stars:${r.id}`});}
 db.prepare("UPDATE platform_invoices SET status='paid',charge_id=?,vip_antes=?,vip_depois=? WHERE id=?").run(p.telegram_payment_charge_id,JSON.stringify(antes),JSON.stringify(depois),r.id);
 eventoPlataforma('stars_paid','',{invoice:r.id,userId:String(userId)});return{id:r.id,duplicado:false};
 })();
}
const reembolsando=new Set();
export async function reembolsarStars(telegram,id){
 const r=db.prepare('SELECT * FROM platform_invoices WHERE id=?').get(id);
 if(!r||r.status!=='paid'||!r.charge_id||reembolsando.has(id))throw new Error('Fatura nao reembolsavel ou operacao em andamento');
 reembolsando.add(id);
 try{
 db.prepare("UPDATE platform_invoices SET status='refund_pending' WHERE id=?").run(id);
 try{await telegram.callApi('refundStarPayment',{user_id:Number(r.user_id),telegram_payment_charge_id:r.charge_id});}
 catch(err){
  const code=err.response?.error_code;
  // Falha de rede/5xx nao prova que a operacao financeira nao aconteceu.
  const revisar=!code||code>=500;
  db.prepare('UPDATE platform_invoices SET status=?,refund_review=? WHERE id=?').run(revisar?'refund_review':'paid',revisar?1:0,id);
  if(revisar)eventoPlataforma('refund_uncertain','',{invoice:id});
  throw err;
 }
 try{return concluirReembolso(r);}
 catch(err){db.prepare("UPDATE platform_invoices SET status='refund_review',refund_review=1 WHERE id=?").run(id);throw err;}
 }finally{reembolsando.delete(id);}
}
function concluirReembolso(r){return db.transaction(()=>{
 const atual=obterVip(r.user_id),depois=JSON.parse(r.vip_depois),antes=JSON.parse(r.vip_antes);let revisar=true;
 if(JSON.stringify(atual)===JSON.stringify(depois)){
  db.prepare('DELETE FROM vip WHERE id=?').run(r.user_id);
  if(antes){const keys=Object.keys(antes);if(keys.some(k=>!['id','plano','expira_em','vitalicio','desde','concedido_por','usos_hoje','usos_total','reset_em'].includes(k)))throw new Error('Snapshot VIP invalido');db.prepare(`INSERT INTO vip (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>antes[k]));}
  revisar=false;
 }
 db.prepare("UPDATE platform_invoices SET status='refunded',refund_review=? WHERE id=?").run(revisar?1:0,r.id);
 eventoPlataforma('stars_refunded','',{invoice:r.id,revisar});return{ok:true,revisarBeneficio:revisar};
 })();}
export function processarReembolsoRecebido(userId,p){
 const r=db.prepare('SELECT * FROM platform_invoices WHERE charge_id=? AND user_id=?').get(p.telegram_payment_charge_id,String(userId));
 if(!r||p.currency!=='XTR'||p.total_amount!==r.total)throw new Error('Reembolso desconhecido');
 if(r.status==='refunded')return {duplicado:true};return concluirReembolso(r);
}
export function faturasStars(userId=null){return db.prepare(`SELECT id,user_id,produto,total,em,status,refund_review FROM platform_invoices ${userId?'WHERE user_id=?':''} ORDER BY em DESC LIMIT 100`).all(...(userId?[String(userId)]:[])).map(x=>({...x,produto:JSON.parse(x.produto)}));}
