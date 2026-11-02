import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
process.env.DATABASE_PATH=':memory:';process.env.BOT_OWNERS='111';
const store=await import('../core/plataforma/store.js');const {db,plataforma,botConfig}=store;
const authMini=await import('../core/plataforma/mini-auth.js');
const stars=await import('../core/plataforma/stars.js');
const fluxos=await import('../core/plataforma/fluxos.js');
const business=await import('../core/plataforma/business.js');
const webhook=await import('../core/plataforma/webhook.js');
const vip=await import('../core/vip.js');
const {criarMiddlewarePlataforma}=await import('../core/plataforma/updates.js');
const {fecharDb}=await import('../core/db.js');
const {criarConta,entrar}=await import('../core/auth.js');
let server;
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));fecharDb();});
const tokenTeste='credencial-ficticia-para-assinatura-sem-acesso-externo';
function initData(id=123,{data=Math.floor(Date.now()/1000),token=tokenTeste}={}){
 const p=new URLSearchParams({auth_date:String(data),query_id:'fixture',user:JSON.stringify({id,first_name:'Ana',username:'fixture'})});
 const text=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(token).digest();p.set('hash',crypto.createHmac('sha256',key).update(text).digest('hex'));return p.toString();
}
function fakeTelegram(){const chamadas=[];return{chamadas,getMe:async()=>({id:999,username:'kaoruko_fixture'}),getChat:async id=>({id:typeof id==='number'?id:-100,title:'Fixture',type:'supergroup',is_forum:true,permissions:{can_send_messages:true}}),getChatMember:async()=>({status:'administrator'}),callApi:async(method,payload)=>{chamadas.push({method,payload});if(method==='createInvoiceLink')return'https://t.me/$fixture';if(method==='createChatInviteLink')return{invite_link:'https://t.me/+fixture'};return true;},sendMessage:async(...args)=>{chamadas.push({method:'sendMessage',args});return{message_id:1};},sendPhoto:async(...args)=>{chamadas.push({method:'sendPhoto',args});return{message_id:2};}};}
function estrelasOn(){plataforma.stars=true;plataforma.termosUrl='https://example.com/termos';plataforma.suporte='Suporte de teste';}
function produto(id='bronze30',starsValue=20){return stars.salvarProduto({id,titulo:'VIP de teste',plano:'bronze',stars:starsValue,dias:30,ativo:true});}
function pagamento(userId,charge){const r=db.prepare('SELECT * FROM platform_invoices WHERE user_id=? ORDER BY em DESC,rowid DESC LIMIT 1').get(String(userId));return{currency:'XTR',total_amount:r.total,invoice_payload:r.payload,telegram_payment_charge_id:charge};}
function response(){return{statusCode:200,body:null,status(n){this.statusCode=n;return this;},json(d){this.body=d;return this;}};}

test('v5: modulos comerciais e Mini App ficam desativados por padrao',()=>{
 assert.equal(plataforma.stars,false);assert.equal(plataforma.mini,false);assert.equal(plataforma.business,false);assert.equal(plataforma.inline,false);assert.equal(store.requisitosPlataforma().stars.pronto,false);
});
test('v5: Mini App valida assinatura HMAC e identidade',()=>{
 const u=authMini.validarInitData(initData(),tokenTeste);assert.equal(u.id,123);assert.equal(u.first_name,'Ana');
 assert.equal(authMini.validarInitData(initData(),tokenTeste+'errado'),null);
 const p=new URLSearchParams(initData());p.set('user',JSON.stringify({id:111,first_name:'Falso'}));assert.equal(authMini.validarInitData(p.toString(),tokenTeste),null);
});
test('v5: Mini App rejeita dados expirados, futuros e chaves duplicadas',()=>{
 const now=Math.floor(Date.now()/1000);assert.equal(authMini.validarInitData(initData(123,{data:now-301}),tokenTeste),null);assert.equal(authMini.validarInitData(initData(123,{data:now+60}),tokenTeste),null);assert.equal(authMini.validarInitData(initData()+'&auth_date=1',tokenTeste),null);assert.equal(authMini.validarInitData('user={"id":111}',tokenTeste),null);
});
test('v5: sessao Mini guarda so hash, expira e pode ser revogada',()=>{
 const s=authMini.criarSessaoMini({id:123,first_name:'Ana'},1000);assert.equal(authMini.usuarioMini(s.token,2000).id,123);assert.equal(authMini.usuarioMini(s.token,s.expiraEm),null);
 assert.equal(db.prepare('SELECT 1 FROM platform_mini_sessions WHERE hash=?').get(s.token),undefined);authMini.encerrarMini(s.token);assert.equal(authMini.usuarioMini(s.token,2000),null);
});
test('v5: produto rejeita valores negativos e plano arbitrario',()=>{
 for(const p of [{id:'produto',titulo:'Teste',plano:'root',stars:10,dias:30,ativo:true},{id:'produto',titulo:'Teste',plano:'bronze',stars:-1,dias:30,ativo:true},{id:'produto',titulo:'Teste',plano:'bronze',stars:10.5,dias:30,ativo:true}])assert.throws(()=>stars.salvarProduto(p));
});
test('v5: Stars desativado nao cria cobranca',async()=>{
 produto();const tg=fakeTelegram();await assert.rejects(()=>stars.criarFatura(tg,123,'bronze30'),/desativado/);assert.equal(tg.chamadas.length,0);
});
test('v5: fatura usa XTR e snapshot do preco definido no servidor',async()=>{
 estrelasOn();const tg=fakeTelegram();produto('bronze30',20);const f=await stars.criarFatura(tg,201,'bronze30',{link:true});assert.ok(f.link);assert.equal(tg.chamadas[0].payload.currency,'XTR');assert.equal(tg.chamadas[0].payload.provider_token,'');assert.equal(tg.chamadas[0].payload.prices[0].amount,20);produto('bronze30',50);assert.equal(pagamento(201,'charge201').total_amount,20);
});
test('v5: precheckout rejeita usuario, moeda e valor falsificados',async()=>{
 const tg=fakeTelegram(),p=pagamento(201,'c201');const q={id:'q1',from:{id:202},invoice_payload:p.invoice_payload,currency:'XTR',total_amount:20};assert.equal(await stars.preCheckout(tg,q),false);assert.equal(await stars.preCheckout(tg,{...q,from:{id:201},total_amount:1}),false);assert.equal(await stars.preCheckout(tg,{...q,from:{id:201},currency:'BRL'}),false);assert.equal(await stars.preCheckout(tg,{...q,from:{id:201}}),true);
});
test('v5: pagamento duplicado nao concede VIP duas vezes',()=>{
 const p=pagamento(201,'c201');const a=stars.confirmarPagamento(201,p);assert.equal(a.duplicado,false);const expira=vip.obterVip(201).expira_em;assert.equal(stars.confirmarPagamento(201,p).duplicado,true);assert.equal(vip.obterVip(201).expira_em,expira);assert.throws(()=>stars.confirmarPagamento(202,p));
});
test('v5: charge nao pode liquidar duas faturas',async()=>{
 await stars.criarFatura(fakeTelegram(),202,'bronze30');assert.throws(()=>stars.confirmarPagamento(202,pagamento(202,'c201')),/duplicado/);
});
test('v5: sucesso real e honrado mesmo apos desativar novas vendas',async()=>{
 await stars.criarFatura(fakeTelegram(),203,'bronze30');plataforma.stars=false;assert.equal(stars.confirmarPagamento(203,pagamento(203,'c203')).duplicado,false);estrelasOn();
});
test('v5: reembolso sem alteracao posterior restaura beneficio anterior',async()=>{
 const tg=fakeTelegram();const inv=db.prepare('SELECT id FROM platform_invoices WHERE user_id=?').get('201');const r=await stars.reembolsarStars(tg,inv.id);assert.equal(r.revisarBeneficio,false);assert.equal(vip.obterVip(201),null);assert.equal(tg.chamadas[0].method,'refundStarPayment');await assert.rejects(()=>stars.reembolsarStars(tg,inv.id),/nao reembolsavel/);
});
test('v5: reembolso nao revoga outra concessao posterior',async()=>{
 const inv=db.prepare('SELECT id FROM platform_invoices WHERE user_id=?').get('203');vip.adicionarVip(203,{plano:'ouro',duracaoMs:86400000,por:'teste-posterior'});const r=await stars.reembolsarStars(fakeTelegram(),inv.id);assert.equal(r.revisarBeneficio,true);assert.equal(vip.obterVip(203).plano,'ouro');
});
test('v5: falha incerta de reembolso impede repeticao automatica e exige revisao',async()=>{
 await stars.criarFatura(fakeTelegram(),204,'bronze30');stars.confirmarPagamento(204,pagamento(204,'c204'));const inv=db.prepare('SELECT id FROM platform_invoices WHERE user_id=?').get('204');const tg=fakeTelegram();tg.callApi=async()=>{throw new Error('rede');};await assert.rejects(()=>stars.reembolsarStars(tg,inv.id),/rede/);assert.equal(stars.faturasStars(204)[0].status,'refund_review');await assert.rejects(()=>stars.reembolsarStars(tg,inv.id),/nao reembolsavel/);
});
test('v5: Business recebe conexao mas nao responde sem ativacao explicita',async()=>{
 plataforma.business=true;business.receberConexao({id:'bc1',user:{id:111},is_enabled:true,rights:{can_reply:true}});business.salvarRegraBusiness('bc1','bom dia','Olá!');const tg=fakeTelegram(),m={business_connection_id:'bc1',chat:{id:222},from:{id:222},text:'BOM DIA'};assert.equal(await business.responderBusiness(tg,m),false);business.ativarBusiness('bc1',true);assert.equal(await business.responderBusiness(tg,m),true);assert.equal(tg.chamadas[0].payload.business_connection_id,'bc1');assert.equal(await business.responderBusiness(tg,m),false);
});
test('v5: Business ignora mensagem do dono, bots e conexao revogada',async()=>{
 const tg=fakeTelegram();assert.equal(await business.responderBusiness(tg,{business_connection_id:'bc1',chat:{id:111},from:{id:111},text:'bom dia'}),false);business.receberConexao({id:'bc1',user:{id:111},is_enabled:false,rights:{can_reply:false}});assert.equal(await business.responderBusiness(tg,{business_connection_id:'bc1',chat:{id:223},from:{id:223},text:'bom dia'}),false);
 business.receberConexao({id:'bc2',user:{id:9999},is_enabled:true,rights:{can_reply:true}});assert.throws(()=>business.ativarBusiness('bc2',true),/dono/);
});
test('v5: canal so publica apos confirmacao do ator e revalida admin',async()=>{
 const tg=fakeTelegram();tg.getChat=async()=>({id:-100,type:'channel'});const token=fluxos.rascunhar(111,-100,{tipo:'canal',conteudo:{texto:'Publicação de teste',botoes:[]}});let aviso;
 const ctx={callbackQuery:{data:'plat:confirm:'+token},from:{id:222},telegram:tg,answerCbQuery:async x=>{aviso=x;},editMessageReplyMarkup:async()=>{}};await fluxos.confirmarRascunho(ctx);assert.equal(tg.chamadas.length,0);assert.match(aviso,/outra pessoa/);ctx.from.id=111;await fluxos.confirmarRascunho(ctx);assert.equal(tg.chamadas.filter(x=>x.method==='sendMessage').length,1);await fluxos.confirmarRascunho(ctx);assert.equal(tg.chamadas.filter(x=>x.method==='sendMessage').length,1);
});
test('v5: confirmacao expirada e falha de privilegio nao publicam',async()=>{
 const tg=fakeTelegram(),token=fluxos.rascunhar(111,-100,{tipo:'canal',conteudo:{texto:'Teste',botoes:[]}});tg.getChat=async()=>({id:-100,type:'channel'});tg.getChatMember=async()=>({status:'member'});await fluxos.confirmarRascunho({callbackQuery:{data:'plat:confirm:'+token},from:{id:111},telegram:tg,answerCbQuery:async()=>{},editMessageReplyMarkup:async()=>{}});assert.equal(tg.chamadas.length,0);assert.equal(db.prepare('SELECT status FROM platform_drafts WHERE token=?').get(token).status,'failed');
});
test('v5: convite e topico requerem admin remoto atual',async()=>{
 const tg=fakeTelegram();const r=await fluxos.criarConviteTelegram(tg,-100,111,{solicitar:true});assert.ok(r.invite_link);assert.equal(tg.chamadas[0].payload.creates_join_request,true);await fluxos.operarTopico(tg,-100,111,'criar',{nome:'Novidades'});assert.equal(tg.chamadas[1].method,'createForumTopic');tg.getChatMember=async()=>({status:'member'});await assert.rejects(()=>fluxos.operarTopico(tg,-100,111,'fechar',{threadId:1}),/administrador/);
});
test('v5: pedido de entrada permanece manual e decisao usa API adequada',async()=>{
 const tg=fakeTelegram();await fluxos.receberEntrada(tg,{chat:{id:-101},from:{id:333,first_name:'Membro'}});assert.equal(tg.chamadas.length,0);await fluxos.decidirEntrada(tg,-101,333,111,true);assert.equal(tg.chamadas[0].method,'approveChatJoinRequest');assert.equal(db.prepare('SELECT status FROM platform_join WHERE chat_id=? AND user_id=?').get('-101','333').status,'approved');
});
test('v5: album e temporario e isolado pelo remetente',()=>{
 for(let i=0;i<2;i++)fluxos.coletarAlbum({media_group_id:'a1',from:{id:111},chat:{id:-100},photo:[{file_id:'file'+i}]});assert.equal(fluxos.albumDoUsuario(-100,111).length,2);assert.equal(fluxos.albumDoUsuario(-100,222),null);
});
test('v5: webhook valida segredo e rejeita encoding malicioso sem excecao',()=>{
 const secret='a'.repeat(40);assert.equal(webhook.segredoWebhookValido(secret,secret),true);assert.equal(webhook.segredoWebhookValido('b'.repeat(40),secret),false);assert.equal(webhook.segredoWebhookValido('é'.repeat(40),secret),false);
});
test('v5: webhook deduplica updates e permite retentativa apos falha',async()=>{
 plataforma.transporte='webhook';plataforma.webhookUrl='https://example.com/telegram/webhook';plataforma.webhookSecret='a'.repeat(40);let chamadas=0;const bot={handleUpdate:async()=>{chamadas++;}};const handler=webhook.criarWebhookHandler(bot),req={get:()=>plataforma.webhookSecret,body:{update_id:500,message:{}}};let res=response();await handler({...req,get:()=>''},res);assert.equal(res.statusCode,401);res=response();await handler(req,res);assert.equal(res.statusCode,200);res=response();await handler(req,res);assert.equal(res.body.duplicado,true);assert.equal(chamadas,1);
 const retry=webhook.criarWebhookHandler({handleUpdate:async()=>{throw new Error('rede');}});res=response();await retry({...req,body:{update_id:501}},res);assert.equal(res.statusCode,503);res=response();await handler({...req,body:{update_id:501}},res);assert.equal(res.statusCode,200);plataforma.transporte='polling';
});
test('v5: webhook indica processamento concorrente em vez de repetir acao',async()=>{
 plataforma.transporte='webhook';let release;const pending=new Promise(resolve=>{release=resolve;});const h=webhook.criarWebhookHandler({handleUpdate:()=>pending}),req={get:()=>plataforma.webhookSecret,body:{update_id:502}};const first=h(req,response());const second=response();await h(req,second);assert.equal(second.statusCode,503);release();await first;plataforma.transporte='polling';
});
test('v5: modo inline so expoe comandos publicos quando ativado',async()=>{
 const {loadCommands}=await import('../commands/registry.js');await loadCommands();plataforma.inline=true;const tg=fakeTelegram();await criarMiddlewarePlataforma()({update:{inline_query:{id:'inline1',query:'',from:{id:222}}},telegram:tg},()=>{});const rows=tg.chamadas[0].payload.results;assert.ok(rows.length>0&&rows.length<=20);assert.ok(!rows.some(x=>['telegram','business','backup'].includes(x.id)));
});
test('v5: middleware nao executa comandos comerciais nem confia em web_app_data',async()=>{
 let resposta='';await criarMiddlewarePlataforma()({update:{message:{chat:{type:'private'},web_app_data:{data:'{"user_id":111}'}}},reply:async x=>{resposta=x;}},()=>assert.fail('Nao deve despachar comando'));assert.match(resposta,/Nenhuma identidade/);
});
test('v5: Mini API valida assinatura, isola sessao e exige dono para produtos',async()=>{
 const {default:config}=await import('../config/index.js');config.painel.port=0;config.token=tokenTeste;plataforma.mini=true;plataforma.miniUrl='https://example.com/miniapp.html';const {iniciarPainel}=await import('../painel/server.js');server=await iniciarPainel({telegram:fakeTelegram(),handleUpdate:async()=>{}});const base=`http://127.0.0.1:${server.address().port}`;
 let x=await fetch(base+'/api/mini/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:'user={"id":111}'})});assert.equal(x.status,401);
 x=await fetch(base+'/api/mini/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:initData(777)})});assert.equal(x.status,200);const ses=await x.json();const headers={'Content-Type':'application/json',Authorization:'Mini '+ses.token};
 x=await fetch(base+'/api/mini/me',{headers});assert.equal((await x.json()).usuario.id,777);
 x=await fetch(base+'/api/mini/lembretes',{method:'POST',headers,body:JSON.stringify({texto:'Lembrete de teste',atrasoMs:60000,userId:111,chatId:-100})});assert.equal(x.status,200);const rows=await(await fetch(base+'/api/mini/lembretes',{headers})).json();assert.equal(rows[0].user_id,'777');assert.equal(rows[0].chat_id,'777');
 x=await fetch(base+'/api/plataforma/produtos',{headers});assert.equal(x.status,401);
 criarConta({email:'membro-v5@example.com',senha:'segura123456'});const member=entrar({email:'membro-v5@example.com',senha:'segura123456'});x=await fetch(base+'/api/plataforma/produtos',{headers:{Authorization:'Bearer '+member.token}});assert.equal(x.status,403);
 x=await fetch(base+'/miniapp.html');assert.equal(x.status,200);assert.match(x.headers.get('content-security-policy'),/https:\/\/telegram.org/);
});
test('v5: novos comandos estao registrados com restricoes',async()=>{
 const {getCommand}=await import('../commands/registry.js');for(const nome of ['telegram','topico','canal','convite','entrada','miniapp','comprar','paysupport','termos','business','album','figurinha','stickers','compartilhar','local','contato','reagir','fixar','desafixar','quiz'])assert.equal(typeof getCommand(nome)?.handler,'function',nome);assert.equal(getCommand('comprar').soPrivado,true);assert.equal(getCommand('telegram').soDono,true);assert.equal(getCommand('topico').soAdmin,true);
});

test('v5: cliente interno cobre o catalogo sem aceitar metodos arbitrarios',async()=>{
 const {criarClienteBotApi,metodosDisponiveis}=await import('../core/plataforma/bot-api.js');const tg=fakeTelegram(),client=criarClienteBotApi(tg);
 assert.equal(metodosDisponiveis().length,185);assert.ok(metodosDisponiveis().includes('getBusinessConnection'));await assert.rejects(()=>client.call('eval',{}),/fora do catalogo/);await assert.rejects(()=>client.call('sendMessage',{chat_id:1}),/text/);await client.call('getMe',{});assert.equal(tg.chamadas[0].method,'getMe');
});

test('v5: compras nao rebaixam plano superior nem cobram VIP vitalicio',async()=>{
 vip.adicionarVip(301,{plano:'ouro',duracaoMs:86400000,por:'fixture'});const antes=vip.obterVip(301);await stars.criarFatura(fakeTelegram(),301,'bronze30');stars.confirmarPagamento(301,pagamento(301,'c301'));assert.equal(vip.obterVip(301).plano,'ouro');assert.ok(vip.obterVip(301).expira_em>antes.expira_em);
 vip.adicionarVip(302,{plano:'diamante',duracaoMs:null,por:'fixture'});await assert.rejects(()=>stars.criarFatura(fakeTelegram(),302,'bronze30'),/vitalicio/);
});
test('v5: falha ao criar invoice nao deixa compra pendente ativa',async()=>{
 const tg=fakeTelegram();tg.callApi=async()=>{throw new Error('rede indisponivel');};await assert.rejects(()=>stars.criarFatura(tg,303,'bronze30'));assert.equal(stars.faturasStars(303)[0].status,'send_failed');
});
test('v5: fatura expirada e recusada antes de cobrar',async()=>{
 await stars.criarFatura(fakeTelegram(),304,'bronze30');db.prepare('UPDATE platform_invoices SET expira_em=0 WHERE user_id=?').run('304');const p=pagamento(304,'c304');assert.equal(await stars.preCheckout(fakeTelegram(),{id:'expired',from:{id:304},invoice_payload:p.invoice_payload,currency:'XTR',total_amount:p.total_amount}),false);assert.equal(vip.obterVip(304),null);
});
test('v5: sessao mini de outro usuario nao cancela lembrete alheio',async()=>{
 const {criarLembrete}=await import('../core/lembretes.js');const id=criarLembrete(888,888,'Privado',60000);const ses=authMini.criarSessaoMini({id:777,first_name:'Outro'});const base=`http://127.0.0.1:${server.address().port}`;const x=await fetch(`${base}/api/mini/lembretes/${id}`,{method:'DELETE',headers:{Authorization:'Mini '+ses.token}});assert.equal((await x.json()).ok,false);
});

test('v5: registro de webhook exige configuracao valida e nao descarta updates',async()=>{
 plataforma.transporte='webhook';plataforma.webhookUrl='https://example.com/telegram/webhook';plataforma.webhookSecret='fixture_'.repeat(6);const tg=fakeTelegram(),bot={telegram:tg};await webhook.configurarWebhook(bot);const call=tg.chamadas.find(x=>x.method==='setWebhook');assert.equal(call.payload.drop_pending_updates,false);assert.ok(call.payload.allowed_updates.includes('pre_checkout_query'));assert.ok(call.payload.allowed_updates.includes('business_message'));assert.equal(bot.botInfo.id,999);plataforma.webhookSecret='curto';await assert.rejects(()=>webhook.configurarWebhook(bot),/secret_token/);plataforma.transporte='polling';
});

test('v5: restore invalida sessoes e drafts sem apagar registros financeiros',async()=>{
 const {default:Database}=await import('better-sqlite3');const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');const {execFileSync}=await import('node:child_process');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kaoruko-restore-v5-'));let ver;
 try{
  const origem=path.join(dir,'origem.db'),destino=path.join(dir,'destino.db'),b=new Database(origem);
  b.exec("CREATE TABLE usuarios(id TEXT);CREATE TABLE grupos(id TEXT);CREATE TABLE contas(id TEXT);CREATE TABLE sessoes(token TEXT);INSERT INTO sessoes VALUES('fixture');CREATE TABLE platform_mini_sessions(hash TEXT);INSERT INTO platform_mini_sessions VALUES('fixture');CREATE TABLE platform_drafts(token TEXT);INSERT INTO platform_drafts VALUES('fixture');CREATE TABLE platform_business(id TEXT,ativo INTEGER);INSERT INTO platform_business VALUES('fixture',1);CREATE TABLE platform_invoices(charge_id TEXT);INSERT INTO platform_invoices VALUES('fixture-charge');");b.close();
  execFileSync(process.execPath,['scripts/restaurar.js',origem],{cwd:new URL('../',import.meta.url),env:{...process.env,DATABASE_PATH:destino},stdio:'pipe'});ver=new Database(destino);
  for(const table of ['sessoes','platform_mini_sessions','platform_drafts'])assert.equal(ver.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);assert.equal(ver.prepare('SELECT ativo FROM platform_business').get().ativo,0);assert.equal(ver.prepare('SELECT charge_id FROM platform_invoices').get().charge_id,'fixture-charge');
 }finally{ver?.close();await fs.rm(dir,{recursive:true,force:true});}
});
