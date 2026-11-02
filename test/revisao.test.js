import { test, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_PATH = ':memory:';
const auth = await import('../core/auth.js');
const { fecharDb } = await import('../core/db.js');
const { default: config } = await import('../config/index.js');
const { iniciarPainel } = await import('../painel/server.js');
let server;
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  fecharDb();
});

test('primeira conta nao recebe privilegios automaticamente', () => {
  const r = auth.criarConta({email: 'membro@example.com', senha: 'senha-segura123'});
  assert.equal(r.ok, true);
  assert.equal(r.conta.papel, 'membro');
});
test('rejeita papeis desconhecidos', () => {
  assert.equal(auth.criarConta({email: 'outro@example.com', senha: 'senha-segura123', papel: 'admin'}).ok, false);
});
test('entradas de senha invalidas nao causam excecao', () => {
  for (const senha of [undefined, null, {}, [], 123, 'x'.repeat(201)]) {
    assert.equal(auth.entrar({email: 'membro@example.com', senha}).ok, false);
    assert.equal(auth.trocarSenha(1, senha, 'outra-senha123').ok, false);
  }
});
test('cookie malformado nao causa excecao', () => {
  assert.equal(auth.lerToken({headers: {cookie: 'kw_token=%ZZ'}}), '');
});
test('login, sessao e revogacao ao trocar senha', () => {
  auth.criarConta({email: 'login@example.com', senha: 'senha-segura123'});
  const r = auth.entrar({email: 'login@example.com', senha: 'senha-segura123'});
  assert.equal(r.ok, true);
  assert.equal(auth.validarSessao(r.token).email, 'login@example.com');
  assert.equal(auth.trocarSenha(r.usuario.id, 'senha-segura123', 'nova-senha123').ok, true);
  assert.equal(auth.validarSessao(r.token), null);
});
test('painel: registro sem privilegios, JSON invalido e acesso administrativo', async () => {
  config.painel.port = 0;
  config.painel.registroAberto = true;
  server = await iniciarPainel({telegram: {getMe: async () => ({username: 'teste'})}});
  const base = `http://127.0.0.1:${server.address().port}`;
  let r = await fetch(`${base}/api/auth/registrar`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: 'web@example.com', senha: 'senha-segura123', papel: 'dono'})});
  assert.equal(r.status, 200);
  const dados = await r.json();
  assert.equal(dados.usuario.papel, 'membro');
  r = await fetch(`${base}/api/admin/contas`, {headers: {Authorization: `Bearer ${dados.token}`}});
  assert.equal(r.status, 403);
  r = await fetch(`${base}/api/admin/contas`);
  assert.equal(r.status, 401);
  r = await fetch(`${base}/api/auth/login`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{'});
  assert.equal(r.status, 400);
  assert.ok((await r.json()).erro);
  r = await fetch(`${base}/api/inexistente`);
  assert.equal(r.status, 404);
  assert.ok((await r.json()).erro);
});

test('painel: somente dono pode salvar protecoes e payload e validado', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const payload = {antiflood: 6, janela: 10, bloqueios: ['stickers'], palavras: ['spam'], ranking: false};
  const url = `${base}/api/admin/grupo/-900/automacao`;
  let r = await fetch(url, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
  assert.equal(r.status, 401);
  auth.criarConta({email: 'dono@example.com', senha: 'senha-segura123', papel: 'dono'});
  const dono = auth.entrar({email: 'dono@example.com', senha: 'senha-segura123'});
  const headers = {'Content-Type': 'application/json', Authorization: `Bearer ${dono.token}`};
  r = await fetch(url, {method: 'PUT', headers, body: JSON.stringify({...payload, antiflood: -1})});
  assert.equal(r.status, 400);
  r = await fetch(url, {method: 'PUT', headers, body: JSON.stringify(payload)});
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).automacao, payload);
  r = await fetch(`${base}/api/admin/grupo/-900/membros`, {headers});
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).automacao, payload);
  const membro = auth.entrar({email: 'web@example.com', senha: 'senha-segura123'});
  r = await fetch(url, {method: 'PUT', headers: {...headers, Authorization: `Bearer ${membro.token}`}, body: JSON.stringify(payload)});
  assert.equal(r.status, 403);
});
