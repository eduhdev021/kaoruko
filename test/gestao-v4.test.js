import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import Database from 'better-sqlite3';
process.env.DATABASE_PATH=':memory:';
const {db,fecharDb}=await import('../core/db.js');
const s=await import('../core/gestao-store.js');
const entrada=await import('../core/entrada.js');
const mod=await import('../core/moderacao.js');
const r=await import('../core/recursos.js');
const spam=await import('../core/antispam.js');
const auth=await import('../core/auth.js');
const {podeGerirGrupo,validarPacote}=await import('../painel/gestao-api.js');
const {instalarLimitesTelegram}=await import('../core/telegram-limites.js');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'kaoruko-v4-'));
process.env.BACKUP_DIR=path.join(temp,'backups');
const manut=await import('../core/manutencao.js');
let server;
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));fecharDb();await fs.rm(temp,{recursive:true,force:true});});
function telegramFake(status='member'){
 const chamadas=[];
 return {chamadas,getMe:async()=>({id:999,username:'homologacao'}),getChatMember:async()=>({status,user:{id:123,is_bot:false}}),getChat:async()=>({permissions:{can_send_messages:true,can_send_photos:false}}),restrictChatMember:async(...args)=>chamadas.push(['restrict',...args]),banChatMember:async(...args)=>chamadas.push(['ban',...args]),unbanChatMember:async(...args)=>chamadas.push(['unban',...args]),sendMessage:async(...args)=>{chamadas.push(['send',...args]);return{message_id:500};},deleteMessage:async(...args)=>chamadas.push(['delete',...args]),sendPhoto:async(...args)=>chamadas.push(['photo',...args])};
}
test('v4: automacoes destrutivas e coleta desativadas por padrao',()=>{
 const c=s.configGestao(-1);assert.equal(c.captcha,false);assert.equal(c.antiraid,false);assert.equal(c.avisosLimite,0);assert.equal(c.avisosAcao,'nenhuma');assert.equal(c.reputacao,false);assert.equal(c.captchaTimeout,'liberar');
});
test('v4: configuracao valida dominios, tipos e limites',()=>{
 for(const c of [{captcha:'true'},{captchaPrazo:1},{raidLimite:0},{avisosAcao:'banir'},{dominios:['evil.com/path']},{campoDesconhecido:true}])assert.equal(s.validarGestao(c),null);
 assert.deepEqual(s.validarGestao({dominios:['EXAMPLE.COM']}).dominios,['example.com']);
});
test('v4: raid e detectado por grupo e expira sem alterar permissoes globais',()=>{
 const c={...s.configGestao(-2),antiraid:true,raidLimite:3,raidJanela:10,raidDuracao:60};
 assert.equal(entrada.detectarRaid(-2,c,2,100000),false);
 assert.equal(entrada.detectarRaid(-2,c,1,100001),true);
 assert.equal(entrada.detectarRaid(-3,c,1,100001),false);
 assert.equal(entrada.detectarRaid(-2,c,0,200000),false);
});
test('v4: CAPTCHA restringe com prazo finito e somente o alvo pode responder',async()=>{
 const tg=telegramFake();const token=await entrada.criarCaptcha(tg,-10,{id:10,first_name:'Ana'},{...s.configGestao(-10),captchaPrazo:120});
 assert.ok(token);assert.ok(tg.chamadas[0][3].until_date>Date.now()/1000);
 const row=entrada.pendenciaCaptcha(-10,10);let resposta;
 await entrada.responderCaptcha({callbackQuery:{data:`captcha:${token}:${row.resposta}`},chat:{id:-10},from:{id:11},telegram:tg,answerCbQuery:async x=>{resposta=x;}});
 assert.match(resposta,/Somente/);assert.ok(entrada.pendenciaCaptcha(-10,10));
});
test('v4: CAPTCHA correto restaura permissoes e remove pendencia',async()=>{
 const tg=telegramFake();const row=entrada.pendenciaCaptcha(-10,10);
 await entrada.responderCaptcha({callbackQuery:{data:`captcha:${row.token}:${row.resposta}`},chat:{id:-10},from:{id:10},telegram:tg,answerCbQuery:async()=>{}});
 assert.equal(entrada.pendenciaCaptcha(-10,10),undefined);
 assert.deepEqual(tg.chamadas[0][3].permissions,{can_send_messages:true,can_send_photos:false});
});
test('v4: CAPTCHA impede quarta tentativa e e liberado ao expirar por padrao',async()=>{
 const tg=telegramFake();const token=await entrada.criarCaptcha(tg,-11,{id:11});
 const row=entrada.pendenciaCaptcha(-11,11);
 for(let i=0;i<3;i++)await entrada.responderCaptcha({callbackQuery:{data:`captcha:${token}:errado`},chat:{id:-11},from:{id:11},telegram:tg,answerCbQuery:async()=>{}});
 await entrada.responderCaptcha({callbackQuery:{data:`captcha:${token}:${row.resposta}`},chat:{id:-11},from:{id:11},telegram:tg,answerCbQuery:async()=>{}});
 assert.ok(entrada.pendenciaCaptcha(-11,11));
 await entrada.expirarCaptchas(tg,row.expira_em+1);
 assert.equal(entrada.pendenciaCaptcha(-11,11),undefined);assert.equal(tg.chamadas.some(x=>x[0]==='ban'),false);
});
test('v4: expulsao por timeout exige politica explicita',async()=>{
 const tg=telegramFake();await entrada.criarCaptcha(tg,-12,{id:12},{...s.configGestao(-12),captchaTimeout:'expulsar'});
 await entrada.expirarCaptchas(tg,Date.now()+700000);
 assert.ok(tg.chamadas.some(x=>x[0]==='ban'));assert.ok(tg.chamadas.some(x=>x[0]==='unban'));
});
test('v4: falha no envio do CAPTCHA tenta restaurar membro',async()=>{
 const tg=telegramFake();tg.sendMessage=async()=>{throw new Error('falha envio');};
 await assert.rejects(()=>entrada.criarCaptcha(tg,-13,{id:13}),/falha envio/);
 assert.equal(entrada.pendenciaCaptcha(-13,13),undefined);
 assert.equal(tg.chamadas.filter(x=>x[0]==='restrict').length,2);
});
test('v4: links ofuscados, dominios e fronteiras de subdominio',()=>{
 assert.ok(spam.extrairHosts({text:'hxxps://evil[.]com/oferta'}).includes('evil.com'));
 assert.equal(spam.linksPermitidos({text:'https://sub.example.com'},['example.com']),true);
 assert.equal(spam.linksPermitidos({text:'https://example.com.evil.com'},['example.com']),false);
 assert.equal(spam.linksPermitidos({entities:[{type:'text_link',url:'https://evil.com'}],text:'https://example.com'},['example.com']),false);
});
test('v4: repeticoes possuem limite minimo e isolamento',()=>{
 const msg='Mensagem promocional suficientemente longa';
 assert.equal(spam.mensagemRepetida(-1,1,msg,0),false);assert.equal(spam.mensagemRepetida(-1,1,msg,1),false);assert.equal(spam.mensagemRepetida(-1,1,msg,2),true);assert.equal(spam.mensagemRepetida(-2,1,msg,2),false);assert.equal(spam.mensagemRepetida(-1,1,msg,40000),false);
});
test('v4: moderacao protege administradores e nao registra sucesso falso',async()=>{
 await assert.rejects(()=>mod.aplicarModeracao(telegramFake('administrator'),{chatId:-20,userId:20,ator:1,tipo:'banir'}),/protegidos/);
 assert.equal(s.historicoModeracao(-20).length,0);
});
test('v4: silenciamento gera historico reversivel e nao desfaz duas vezes',async()=>{
 const tg=telegramFake();const {id}=await mod.aplicarModeracao(tg,{chatId:-21,userId:21,ator:1,tipo:'silenciar',duracao:600});
 assert.equal(s.historicoModeracao(-21)[0].tipo,'silenciar');
 await mod.desfazerModeracao(tg,-21,id,1);
 await assert.rejects(()=>mod.desfazerModeracao(tg,-21,id,1),/desfeita/);
});
test('v4: desfazer recusa acao posterior sobre o mesmo alvo',async()=>{
 const tg=telegramFake();const {id}=await mod.aplicarModeracao(tg,{chatId:-22,userId:22,ator:1,tipo:'silenciar'});
 await mod.aplicarModeracao(tg,{chatId:-22,userId:22,ator:1,tipo:'banir'});
 await assert.rejects(()=>mod.desfazerModeracao(tg,-22,id,1),/posterior/);
});
test('v4: advertencia so pune ao atingir limite explicitamente configurado',async()=>{
 const tg=telegramFake();s.salvarGestao(-23,{avisosLimite:2,avisosAcao:'silenciar',avisosDuracao:600});
 assert.equal((await mod.advertirComAcao(tg,{chatId:-23,userId:23,ator:1})).punicao,undefined);
 assert.equal((await mod.advertirComAcao(tg,{chatId:-23,userId:23,ator:1})).punicao,'silenciar');
 assert.equal((await mod.advertirComAcao(tg,{chatId:-23,userId:23,ator:1})).punicao,undefined);
});
test('v4: notas ricas validam botoes e rejeitam URLs como arquivo',()=>{
 assert.equal(r.validarConteudo({texto:'oi',botoes:[{texto:'clicar',url:'javascript:alert(1)'}]}),null);
 assert.equal(r.validarConteudo({texto:'oi',midia:{tipo:'photo',fileId:'http://localhost/a'}}),null);
 r.salvarConteudo(-30,'nota','foto',{texto:'Veja',midia:{tipo:'photo',fileId:'FILE_ID_1'},botoes:[{texto:'Site',url:'https://example.com'}]});
 assert.equal(r.obterConteudo(-30,'nota','foto').midia.tipo,'photo');
 assert.equal(r.obterConteudo(-31,'nota','foto'),null);
});
test('v4: envio de nota usa file_id Telegram sem baixar arquivo remoto',async()=>{
 const tg=telegramFake();await r.enviarConteudo(tg,-30,r.obterConteudo(-30,'nota','foto'));
 assert.equal(tg.chamadas[0][0],'photo');assert.equal(tg.chamadas[0][2],'FILE_ID_1');
});
test('v4: agendamento recorrente persiste e cancelamento e por grupo',async()=>{
 const tg=telegramFake();const id=r.agendarPublicacao(-40,1,{texto:'Aviso',venceEm:Date.now()+20000,intervalo:60000});
 assert.equal(r.cancelarPublicacao(-41,id),false);
 await r.entregarPublicacoes(tg,Date.now()+30000);
 assert.equal(r.listarPublicacoes(-40)[0].estado,'pendente');
 assert.ok(r.listarPublicacoes(-40)[0].vence_em>Date.now()+30000);
 assert.equal(r.cancelarPublicacao(-40,id),true);
});
test('v4: publicacao com erro permanente nao desaparece sem diagnostico',async()=>{
 const id=r.agendarPublicacao(-42,1,{texto:'Aviso',venceEm:Date.now()+20000});const tg=telegramFake();tg.sendMessage=async()=>{throw{message:'bloqueado',response:{error_code:403}};};
 await r.entregarPublicacoes(tg,Date.now()+30000);
 const row=r.listarPublicacoes(-42).find(x=>x.id===id);assert.equal(row.estado,'falha');assert.match(row.erro,/bloqueado/);
});
test('v4: reputacao rejeita voto proprio, bots e mais de um voto em 24h',()=>{
 s.salvarGestao(-50,{reputacao:true});
 assert.throws(()=>r.darReputacao(-50,1,{id:1}));assert.throws(()=>r.darReputacao(-50,1,{id:2,is_bot:true}));
 r.darReputacao(-50,1,{id:2,first_name:'Ana'},100000);
 assert.throws(()=>r.darReputacao(-50,1,{id:3},100001));
 assert.equal(r.reputacaoGrupo(-50)[0].pontos,1);assert.equal(r.reputacaoGrupo(-50)[0].nivel,1);
});
test('v4: escopo do painel exige identidade vinculada e admin atual',async()=>{
 const tg=telegramFake('administrator');
 assert.equal(await podeGerirGrupo({papel:'membro'},-100,tg),false);
 assert.equal(await podeGerirGrupo({papel:'membro',telegramId:'123'},-100,tg),true);
 tg.getChatMember=async()=>({status:'member'});
 assert.equal(await podeGerirGrupo({papel:'membro',telegramId:'123'},-100,tg),false);
 assert.equal(await podeGerirGrupo({papel:'dono'},-100,tg),true);
 assert.equal(await podeGerirGrupo({papel:'dono'},'invalido',tg),false);
});
test('v4: fila Telegram respeita 429 e nao intercepta polling',async()=>{
 let chamadas=0,now=0;const tg={callApi:async method=>{chamadas++;if(method==='sendMessage'&&chamadas===1)throw{response:{error_code:429,parameters:{retry_after:2}}};return true;}};
 const stats=instalarLimitesTelegram(tg,{agora:()=>now,pausa:async ms=>{now+=ms;}});
 await tg.callApi('sendMessage',{chat_id:-1,text:'Oi'});assert.ok(now>=2000);assert.equal(stats().pendentes,0);
 const antes=now;await tg.callApi('getUpdates',{});assert.equal(now,antes);
});
test('v4: backup e consistente, privado e restauravel pelo CLI',async()=>{
 auth.criarConta({email:'backup@example.com',senha:'segura123456'});
 const b=await manut.criarBackup(),origem=path.join(process.env.BACKUP_DIR,b.nome);
 const check=new Database(origem,{readonly:true});assert.equal(check.pragma('integrity_check',{simple:true}),'ok');check.close();
 assert.equal((await fs.stat(origem)).mode&0o777,0o600);
 const destino=path.join(temp,'restaurado','kaoruko.db');
 const exec=spawnSync(process.execPath,['scripts/restaurar.js',origem],{cwd:process.cwd(),env:{...process.env,DATABASE_PATH:destino},encoding:'utf8'});
 assert.equal(exec.status,0,exec.stderr);const restored=new Database(destino,{readonly:true});assert.equal(restored.prepare('SELECT count(*) n FROM contas').get().n,1);restored.close();
});
test('v4: restauracao e recusada quando runtime.lock aponta processo vivo',async()=>{
 const destino=path.join(temp,'bloqueado','kaoruko.db');await fs.mkdir(path.dirname(destino));await fs.writeFile(path.join(path.dirname(destino),'runtime.lock'),String(process.pid));
 const b=(await manut.listarBackups())[0];const exec=spawnSync(process.execPath,['scripts/restaurar.js',path.join(process.env.BACKUP_DIR,b.nome)],{cwd:process.cwd(),env:{...process.env,DATABASE_PATH:destino},encoding:'utf8'});
 assert.notEqual(exec.status,0);assert.match(exec.stderr,/execucao/);
});
test('v4: HTTP valida escopo, origem e importacao atomica',async()=>{
 const {default:config}=await import('../config/index.js');config.painel.port=0;
 const {iniciarPainel}=await import('../painel/server.js');const tg=telegramFake('administrator');server=await iniciarPainel({telegram:tg});const base=`http://127.0.0.1:${server.address().port}`;
 auth.criarConta({email:'grupo@example.com',senha:'segura123456',telegramId:'123',papel:'membro'});const conta=auth.entrar({email:'grupo@example.com',senha:'segura123456'});
 const headers={'Content-Type':'application/json',Authorization:`Bearer ${conta.token}`};
 let x=await fetch(base+'/api/gestao/-100/config',{headers});assert.equal(x.status,200);
 const pacote=await x.json();assert.ok(validarPacote(pacote));
 x=await fetch(base+'/api/gestao/-100/config',{method:'PUT',headers:{...headers,Origin:'https://evil.com'},body:JSON.stringify(pacote)});assert.equal(x.status,403);
 x=await fetch(base+'/api/gestao/-100/config',{method:'PUT',headers,body:JSON.stringify(pacote)});assert.equal(x.status,200);
 const exp=await(await fetch(base+'/api/gestao/-100/exportar',{headers})).json();exp.config.gestao.captcha=true;exp.notas=[{chave:'teste',texto:'ok',botoes:[]},{chave:null,texto:'invalida'}];
 x=await fetch(base+'/api/gestao/-100/importar',{method:'POST',headers,body:JSON.stringify(exp)});assert.equal(x.status,400);assert.equal(s.configGestao(-100).captcha,false);assert.equal(r.obterConteudo(-100,'nota','teste'),null);
 x=await fetch(base+'/api/gestao/backups',{headers});assert.equal(x.status,403);
 tg.getChatMember=async()=>({status:'member'});
 x=await fetch(base+'/api/gestao/-100/config',{headers});assert.equal(x.status,403);
 x=await fetch(base+'/gestao.html');assert.equal(x.status,200);assert.match(await x.text(),/Central de gestão/);
});

test('v4: timeout completa desbanimento mesmo se a primeira tentativa falhar',async()=>{
 const tg=telegramFake();await entrada.criarCaptcha(tg,-77,{id:77},{...s.configGestao(-77),captchaTimeout:'expulsar'});
 let bloqueado=false,tentativas=0;tg.banChatMember=async()=>{bloqueado=true;};tg.getChatMember=async()=>({status:bloqueado?'kicked':'member'});
 tg.unbanChatMember=async()=>{if(++tentativas===1)throw new Error('rede');bloqueado=false;};
 await entrada.expirarCaptchas(tg,Date.now()+700000);
 assert.equal(entrada.pendenciaCaptcha(-77,77).estado,'desbanir');assert.equal(bloqueado,true);
 await entrada.expirarCaptchas(tg,Date.now()+800000);
 assert.equal(bloqueado,false);assert.equal(entrada.pendenciaCaptcha(-77,77),undefined);
});
test('v4: revisao dos downloads rejeita dominio falso e protocolos perigosos',async()=>{
 const {links,urlHttpValida,escapeHtml}=await import('../utils/helpers.js');
 const {acharUrl,requisitar,OkarunError}=await import('../core/api.js');
 assert.equal(links.youtube('https://youtube.com.evil.com/watch?v=1'),false);
 assert.equal(links.youtube('https://www.youtube.com/watch?v=1'),true);
 for(const u of ['file:///etc/passwd','javascript:alert(1)','http://127.0.0.1/a','http://user:pass@example.com'])assert.equal(urlHttpValida(u),false);
 assert.equal(acharUrl({url:'file:///etc/passwd'}),undefined);
 assert.match(escapeHtml('"<b>'),/&quot;/);
 assert.equal(new OkarunError('<b>erro</b>').paraUsuario(),'&lt;b&gt;erro&lt;/b&gt;');
 await assert.rejects(()=>requisitar('https://evil.com/api'),/Rota/);
});
test('v4: console web nao aceita shell arbitrario ou encadeamentos',async()=>{
 const {executar,analisar}=await import('../core/console.js');
 assert.equal(analisar('node -e "console.log(process.env)"').ok,false);
 const x=await executar('versao; cat .env',{id:1,email:'teste@example.com'});assert.equal(x.bloqueado,true);
});

test('v4: backups concorrentes compartilham a operacao sem duplicar arquivos',async()=>{
 const [a,b]=await Promise.all([manut.criarBackup(),manut.criarBackup()]);assert.equal(a.nome,b.nome);
});
test('v4: publicacoes reagendam retry_after sem loop imediato',async()=>{
 const id=r.agendarPublicacao(-88,1,{texto:'Mensagem',venceEm:Date.now()+20000});
 const tg=telegramFake();tg.sendMessage=async()=>{throw{message:'429',response:{error_code:429,parameters:{retry_after:120}}};};
 const now=Date.now()+30000;await r.entregarPublicacoes(tg,now);
 const row=r.listarPublicacoes(-88).find(x=>x.id===id);assert.equal(row.estado,'pendente');assert.equal(row.vence_em,now+120000);assert.equal(row.tentativas,1);
});
test('v4: analytics exposto por grupo e exclusao respeita escopo',async()=>{
 const conta=auth.entrar({email:'grupo@example.com',senha:'segura123456'});
 const base=`http://127.0.0.1:${server.address().port}`,headers={'Content-Type':'application/json',Authorization:`Bearer ${conta.token}`};
 s.registrarDia(-100,'mensagens');s.registrarDia(-200,'mensagens');
 let x=await fetch(base+'/api/gestao/-100/dados',{method:'DELETE',headers,body:JSON.stringify({tipo:'atividade'})});assert.equal(x.status,403);
 assert.equal(s.analiseGrupo(-100)[0].mensagens,1);assert.equal(s.analiseGrupo(-200)[0].mensagens,1);
 auth.criarConta({email:'dono-v4@example.com',senha:'segura123456',papel:'dono'});const dono=auth.entrar({email:'dono-v4@example.com',senha:'segura123456'});
 x=await fetch(base+'/api/gestao/-100/dados',{method:'DELETE',headers:{...headers,Authorization:`Bearer ${dono.token}`},body:JSON.stringify({tipo:'atividade'})});assert.equal(x.status,200);assert.equal(s.analiseGrupo(-100).length,0);assert.equal(s.analiseGrupo(-200).length,1);
 x=await fetch(base+'/gestao.html');assert.match(x.headers.get('content-security-policy'),/script-src 'self'/);
 x=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.com'},body:JSON.stringify({email:'grupo@example.com',senha:'segura123456'})});assert.equal(x.status,403);
});
