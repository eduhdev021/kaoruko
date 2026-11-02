// Homologacao LOCAL: banco em memoria, credencial ficticia, SDK e Telegram simulados.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
process.env.DATABASE_PATH=':memory:';
process.env.BOT_TOKEN='fixture-token-not-real';process.env.BOT_OWNERS='111';
process.env.TELEGRAM_STARS_ENABLED='false';process.env.TELEGRAM_BUSINESS_ENABLED='false';
process.env.TELEGRAM_MINI_APP_ENABLED='true';process.env.TELEGRAM_MINI_APP_URL='https://example.com/miniapp.html';process.env.TELEGRAM_TRANSPORT='polling';
const {db,fecharDb}=await import('../core/db.js');
const {default:config}=await import('../config/index.js');
const {criarConta}=await import('../core/auth.js');
const {receberConexao}=await import('../core/plataforma/business.js');
const {loadCommands}=await import('../commands/registry.js');
const {iniciarPainel}=await import('../painel/server.js');
config.painel.port=0;
criarConta({email:'fixture@example.com',senha:'Credencial-ficticia-123!',papel:'dono',nome:'Homologacao — dados simulados',telegramId:'111'});
const group='-1001234567890';
db.prepare('INSERT INTO grupos(id,titulo,tipo,desde,mensagens) VALUES (?,?,?,?,?)').run(group,'Homologacao — simulacao','supergroup',Date.now(),0);
db.prepare('INSERT INTO platform_join(chat_id,user_id,nome,em) VALUES (?,?,?,?)').run(group,'222','Pessoa ficticia',Date.now());
receberConexao({id:'fixture-business',user:{id:111},is_enabled:true,rights:{can_reply:true}});
await loadCommands();
const tg={getMe:async()=>({id:999,username:'kaoruko_fixture'}),getChatMember:async()=>({status:'administrator'}),getChat:async id=>({id:Number(id),type:'supergroup',permissions:{can_send_messages:true}}),callApi:async method=>{assert.ok(!['sendInvoice','createInvoiceLink','refundStarPayment'].includes(method),'Teste nao deve iniciar operacao financeira');return true;}};
const server=await iniciarPainel({telegram:tg,handleUpdate:async()=>{}});
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'/gestao.html');await page.locator('#email').fill('fixture@example.com');await page.locator('#senha').fill('Credencial-ficticia-123!');await page.locator('#login-form button').click();await page.locator('#workspace').waitFor({state:'visible'});
 await page.goto(base+'/plataforma.html');await page.locator('#product-form').waitFor();
 await page.locator('#product-id').fill('fixture-product');await page.locator('#product-title').fill('Produto simulado');await page.locator('#product-stars').fill('25');await page.locator('#product-form button').click();await page.getByText('Produto salvo.',{exact:true}).waitFor();
 await page.locator('#join-group').selectOption(group);await page.locator('[data-join="222"][data-approve="true"]').click();await page.getByText('Pedido processado.',{exact:true}).waitFor();
 await page.locator('[data-business-rule="fixture-business"] input').fill('horario');await page.locator('[data-business-rule="fixture-business"] textarea').fill('Resposta de homologacao.');await page.locator('[data-business-rule="fixture-business"] button').click();await page.getByText('Resposta salva.',{exact:true}).waitFor();
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),query_id:'fixture-browser',user:JSON.stringify({id:123,first_name:'Homologacao — simulacao'})});
 const text=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(process.env.BOT_TOKEN).digest();p.set('hash',crypto.createHmac('sha256',key).update(text).digest('hex'));
 const mini=await browser.newPage({viewport:{width:390,height:844}});mini.on('pageerror',e=>errors.push(e.message));
 await mini.route('https://telegram.org/js/telegram-web-app.js',route=>route.fulfill({contentType:'application/javascript',body:`window.Telegram={WebApp:{initData:${JSON.stringify(p.toString())},ready(){},expand(){},close(){},openInvoice(){throw new Error('Checkout nao habilitado no teste');}}};`}));
 await mini.goto(base+'/miniapp.html');await mini.getByText('Sua sessão é temporária',{exact:true}).waitFor();
 await mini.locator('[data-view="lembretes"]').click();await mini.locator('#rem-form').waitFor();await mini.locator('#rem-text').fill('Lembrete de homologacao');await mini.locator('#rem-form button').click();await mini.getByText('Lembrete criado.',{exact:true}).waitFor();await mini.locator('[data-cancel]').first().click();await mini.getByText('Lembrete cancelado.',{exact:true}).waitFor();
 await mini.locator('[data-view="planos"]').click();await mini.getByText('Compras desativadas ou nenhum produto disponível.',{exact:true}).waitFor();assert.equal(await mini.locator('[data-buy]').count(),0);
 await mini.locator('[data-view="comandos"]').click();await mini.locator('#cmd-search').waitFor();await mini.locator('#cmd-search').fill('miniapp');assert.match(await mini.locator('#cmd-results').innerText(),/miniapp/);
 await mini.locator('[data-view="conta"]').click();await mini.getByText('Sua sessão é temporária',{exact:true}).waitFor();assert.ok(await mini.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(process.env.UI_SCREENSHOTS_DIR){await fs.mkdir(process.env.UI_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.UI_SCREENSHOTS_DIR,'plataforma-simulada.png'),fullPage:true});await mini.screenshot({path:path.join(process.env.UI_SCREENSHOTS_DIR,'miniapp-simulada.png'),fullPage:true});}
 assert.deepEqual(errors,[]);console.log('PASSOU: plataforma e Mini App em Chromium; identidades, SDK e Telegram simulados; nenhuma cobranca nem chamada real ao Telegram.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fecharDb();}
