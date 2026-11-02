import { test, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_PATH = ':memory:';
const { db, fecharDb } = await import('../core/db.js');
const comunidade = await import('../core/comunidade.js');
const lembretes = await import('../core/lembretes.js');
const { limitarHttp } = await import('../core/limite-http.js');
const { registrarLog } = await import('../core/logs.js');
after(() => fecharDb());

test('configuracoes de grupo sao persistidas e isoladas', () => {
  comunidade.configurarGrupo(-1, 'regras', 'Respeito');
  comunidade.configurarGrupo(-1, 'antilink', 1);
  assert.equal(comunidade.configGrupo(-1).regras, 'Respeito');
  assert.equal(comunidade.configGrupo(-2).antilink, 0);
  assert.throws(() => comunidade.configurarGrupo(-1, 'campo_arbitrario', 'x'));
});
test('advertencias isoladas por grupo e usuario', () => {
  assert.equal(comunidade.advertencias(-1, 10, 'adicionar'), 1);
  assert.equal(comunidade.advertencias(-1, 10, 'adicionar'), 2);
  assert.equal(comunidade.advertencias(-2, 10), 0);
  assert.equal(comunidade.advertencias(-1, 11), 0);
  assert.equal(comunidade.advertencias(-1, 10, 'limpar'), 0);
});
test('deteccao de URL em texto, legenda e entidade oculta', () => {
  assert.equal(comunidade.temLink({text: 'https://example.com'}), true);
  assert.equal(comunidade.temLink({caption: 't.me/grupo'}), true);
  assert.equal(comunidade.temLink({entities: [{type: 'text_link', url: 'https://example.com'}]}), true);
  assert.equal(comunidade.temLink({text: 'bom dia'}), false);
});
test('boas-vindas escapam HTML e substituem placeholders', () => {
  assert.equal(comunidade.textoBoasVindas('Ola {nome} em {grupo} <b>', {first_name: '<Ana>', id: 10}, 'A&B'), 'Ola &lt;Ana&gt; em A&amp;B &lt;b&gt;');
});
test('antilink remove mensagem de membro mas preserva admin', async () => {
  let apagadas = 0;
  const ctx = {chat: {id: -1, type: 'supergroup'}, from: {id: 22}, message: {text: 'www.example.com'}, telegram: {getChatMember: async () => ({status: 'member'})}, deleteMessage: async () => apagadas++, reply: async () => {}};
  assert.equal(await comunidade.processarComunidade(ctx), true);
  assert.equal(apagadas, 1);
  ctx.telegram.getChatMember = async () => ({status: 'administrator'});
  assert.equal(await comunidade.processarComunidade(ctx), false);
  assert.equal(apagadas, 1);
});
test('prazos de lembretes aceitam apenas intervalos seguros', () => {
  assert.equal(lembretes.duracaoMs('10m'), 600000);
  assert.equal(lembretes.duracaoMs('1h'), 3600000);
  for (const x of ['0s', '9s', '31d', '-1h', 'Infinity', 'abc']) assert.equal(lembretes.duracaoMs(x), 0);
});
test('cancelamento so pelo criador e limite de pendencias', () => {
  const id = lembretes.criarLembrete(1, -1, 'Teste', 10000);
  assert.equal(lembretes.cancelarLembrete(2, id), false);
  assert.equal(lembretes.cancelarLembrete(1, id), true);
  for (let i = 0; i < 10; i++) lembretes.criarLembrete(2, -1, 'Teste', 10000);
  assert.throws(() => lembretes.criarLembrete(2, -1, 'Teste', 10000), /10 lembretes/);
  for (const item of lembretes.listarLembretes(2)) lembretes.cancelarLembrete(2, item.id);
});
test('lembrete e entregue apenas quando vence e removido apos sucesso', async () => {
  lembretes.criarLembrete(3, -3, 'Agua', 10000);
  const enviadas = [];
  const telegram = {sendMessage: async (...args) => enviadas.push(args)};
  await lembretes.entregarLembretes(telegram, Date.now());
  assert.equal(enviadas.length, 0);
  await lembretes.entregarLembretes(telegram, Date.now() + 20000);
  assert.equal(enviadas.length, 1);
  assert.equal(enviadas[0][0], '-3');
  assert.match(enviadas[0][1], /Agua/);
  assert.equal(lembretes.listarLembretes(3).length, 0);
});
test('falha temporaria reagenda e bloqueio permanente descarta lembrete', async () => {
  lembretes.criarLembrete(4, -4, 'Teste', 10000);
  await lembretes.entregarLembretes({sendMessage: async () => { throw new Error('rede'); }}, Date.now() + 20000);
  assert.equal(lembretes.listarLembretes(4)[0].tentativas, 1);
  await lembretes.entregarLembretes({sendMessage: async () => { throw {message: 'bloqueado', response: {error_code: 403}}; }}, Date.now() + 200000);
  assert.equal(lembretes.listarLembretes(4).length, 0);
});
test('limite HTTP bloqueia excesso e libera apos janela', () => {
  let now = 0; let allowed = 0; let status;
  const middleware = limitarHttp({max: 2, janelaMs: 1000, agora: () => now});
  const req = {ip: 'a'};
  const res = {setHeader() {}, status(s) {status = s; return this;}, json() {}};
  for (let i = 0; i < 3; i++) middleware(req, res, () => allowed++);
  assert.equal(allowed, 2); assert.equal(status, 429);
  now = 1001;
  middleware(req, res, () => allowed++);
  assert.equal(allowed, 3);
});
test('logs nao guardam senhas de comandos de conta', () => {
  registrarLog({comando: 'conta', argumento: 'criar email@example.com senhaSecreta'});
  const row = db.prepare('SELECT argumento FROM logs ORDER BY id DESC LIMIT 1').get();
  assert.equal(row.argumento, '[argumentos privados omitidos]');
});
test('registro dinamico carrega todos os novos comandos', async () => {
  const { loadCommands, getCommand } = await import('../commands/registry.js');
  await loadCommands();
  for (const nome of ['boasvindas', 'regras', 'antilink', 'advertir', 'enquete', 'lembrete', 'diagnostico', 'buscarcmd', 'novidades', 'configgrupo']) {
    assert.equal(typeof getCommand(nome)?.handler, 'function', nome);
  }
  assert.equal(getCommand('antilink').soAdmin, true);
  assert.equal(getCommand('diagnostico').soDono, true);
});
