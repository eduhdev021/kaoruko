// Smoke test de leitura. Use credenciais de homologacao, nunca segredos no codigo.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const {UI_URL,UI_EMAIL,UI_SENHA,UI_GRUPO}=process.env;
if(!UI_URL||!UI_EMAIL||!UI_SENHA||!UI_GRUPO){console.error('Defina UI_URL, UI_EMAIL, UI_SENHA e UI_GRUPO para uma instancia de homologacao em execucao.');process.exit(1);}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),erros=[];
 page.on('pageerror',e=>erros.push(e.message));
 await page.goto(new URL('/gestao.html',UI_URL).href);
 await page.locator('#email').fill(UI_EMAIL);await page.locator('#senha').fill(UI_SENHA);await page.locator('#login-form button').click();
 await page.locator('#workspace').waitFor({state:'visible'});
 const options=await page.locator('#grupos option').evaluateAll(els=>els.map(e=>e.value));
 assert.ok(options.includes(UI_GRUPO),'Grupo deve estar visivel para esta conta de homologacao');
 await page.locator('#grupos').selectOption(UI_GRUPO);
 for(const secao of ['protecao','conteudos','agenda','moderacao','atividade']){
  await page.locator(`#menu [data-page="${secao}"]`).click();
  await page.waitForFunction(()=>!document.querySelector('#conteudo').textContent.includes('Carregando…'));
  assert.ok(!(await page.locator('#conteudo').innerText()).includes('Não foi possível'),secao);
 }
 if(await page.locator('#nav-operacao').isVisible()){
  await page.locator('#nav-operacao').click();await page.getByRole('heading',{name:'Backups do banco'}).waitFor();
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#menu [data-page="protecao"]').click();await page.locator('#config-form').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Overflow horizontal no celular');
 assert.deepEqual(erros,[]);console.log('Interface: login, secoes acessiveis, viewport mobile e ausencia de pageerror passaram. Nenhuma configuracao foi alterada.');
}finally{await browser.close();}
