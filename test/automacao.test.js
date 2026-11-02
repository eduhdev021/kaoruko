import { test, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_PATH = ':memory:';
const a = await import('../core/automacao.js');
const { fecharDb } = await import('../core/db.js');
after(() => fecharDb());

test('configuracoes novas desligadas por padrao', () => {
  const c = a.obterAutomacao(-100);
  assert.equal(c.antiflood, 0); assert.equal(c.ranking, false);
  assert.deepEqual(c.bloqueios, []); assert.deepEqual(c.palavras, []);
});
test('configuracoes persistem sem afetar outro grupo', () => {
  a.salvarAutomacao(-100, {antiflood: 6, ranking: true});
  assert.equal(a.obterAutomacao(-100).antiflood, 6);
  assert.equal(a.obterAutomacao(-200).antiflood, 0);
});
test('notas e filtros isolados por grupo e tipo', () => {
  a.salvarResposta(-100, 'nota', 'Guia', 'Leia as regras');
  a.salvarResposta(-100, 'filtro', 'GUIA', 'Resposta automatica');
  assert.equal(a.respostaGrupo(-100, 'nota', 'guia'), 'Leia as regras');
  assert.equal(a.respostaGrupo(-100, 'filtro', 'Guia'), 'Resposta automatica');
  assert.equal(a.respostaGrupo(-200, 'nota', 'guia'), undefined);
  a.salvarResposta(-100, 'nota', 'guia', 'Atualizada');
  assert.equal(a.listarRespostas(-100, 'nota').length, 1);
  assert.equal(a.removerResposta(-100, 'nota', 'GUIA'), true);
});
test('limites de notas e validacao de entradas', () => {
  assert.throws(() => a.salvarResposta(-300, 'invalido', 'x', 'y'));
  assert.throws(() => a.salvarResposta(-300, 'nota', 'x', ''));
  for (let i = 0; i < 50; i++) a.salvarResposta(-300, 'nota', `n${i}`, 'texto');
  assert.throws(() => a.salvarResposta(-300, 'nota', 'n51', 'texto'));
  a.salvarResposta(-300, 'nota', 'n0', 'atualizada');
  assert.equal(a.listarRespostas(-300, 'nota').length, 50);
});
test('antiflood bloqueia so excedentes e expira janela', () => {
  for (let i = 0; i < 3; i++) assert.equal(a.detectarFlood('teste', 3, 10, 0), false);
  assert.equal(a.detectarFlood('teste', 3, 10, 1), true);
  assert.equal(a.detectarFlood('outro', 3, 10, 1), false);
  assert.equal(a.detectarFlood('teste', 3, 10, 10001), false);
  assert.equal(a.detectarFlood('desativado', 0, 10, 0), false);
});
test('bloqueios de midia e palavras funcionam em legenda', () => {
  const c = {...a.obterAutomacao(-200), bloqueios: ['stickers', 'encaminhadas'], palavras: ['spam proibido']};
  assert.ok(a.motivoBloqueio({sticker: {}}, c));
  assert.ok(a.motivoBloqueio({forward_origin: {}}, c));
  assert.ok(a.motivoBloqueio({caption: 'SPAM PROIBIDO aqui'}, c));
  assert.equal(a.motivoBloqueio({text: 'bom dia'}, c), '');
});
test('ranking limita pontos e isola grupos', () => {
  a.registrarAtividade(-1, {id: 1, first_name: 'Ana'}, 100000);
  a.registrarAtividade(-1, {id: 1, first_name: 'Ana'}, 100001);
  a.registrarAtividade(-1, {id: 1, first_name: 'Ana'}, 130000);
  assert.equal(a.rankingGrupo(-1)[0].mensagens, 2);
  assert.equal(a.rankingGrupo(-2).length, 0);
  a.limparRanking(-1); assert.equal(a.rankingGrupo(-1).length, 0);
});
test('validacao de payload do painel', () => {
  const c = {antiflood: 6, janela: 10, palavras: ['Spam'], bloqueios: ['stickers'], ranking: true};
  assert.deepEqual(a.validarAutomacao(c).palavras, ['spam']);
  for (const bad of [null, [], {...c, antiflood: 1}, {...c, janela: -1}, {...c, ranking: 'true'}, {...c, palavras: [null]}, {...c, bloqueios: ['tudo']}]) assert.equal(a.validarAutomacao(bad), null);
});
test('pipeline apaga conteudo bloqueado de membro mas nao de admin', async () => {
  a.salvarAutomacao(-500, {bloqueios: ['stickers']});
  let apagadas = 0;
  const ctx = {chat: {id: -500, type: 'supergroup'}, from: {id: 42}, message: {sticker: {}}, telegram: {getChatMember: async () => ({status: 'member'})}, deleteMessage: async () => apagadas++};
  assert.equal(await a.processarAutomacao(ctx), true);
  ctx.telegram.getChatMember = async () => ({status: 'administrator'});
  assert.equal(await a.processarAutomacao(ctx), false);
  assert.equal(apagadas, 1);
});
test('filtro exige igualdade, ignora comandos e limita respostas', async () => {
  a.salvarResposta(-600, 'filtro', 'bom dia', 'Ola!');
  const respostas = [];
  const ctx = {chat: {id: -600, type: 'supergroup'}, from: {id: 55}, message: {text: 'BOM DIA'}, reply: async text => respostas.push(text)};
  assert.equal(await a.processarAutomacao(ctx), true);
  assert.equal(await a.processarAutomacao(ctx), false);
  ctx.message.text = 'bom dia pessoal';
  assert.equal(await a.processarAutomacao(ctx), false);
  ctx.message.text = '/bom dia';
  assert.equal(await a.processarAutomacao(ctx), false);
  assert.deepEqual(respostas, ['Ola!']);
});
test('atividade nao e coletada enquanto ranking estiver desligado', async () => {
  const ctx = {chat: {id: -700, type: 'supergroup'}, from: {id: 1, first_name: 'Ana'}, message: {text: 'Ola'}};
  await a.processarAutomacao(ctx);
  assert.equal(a.rankingGrupo(-700).length, 0);
  a.salvarAutomacao(-700, {ranking: true});
  await a.processarAutomacao(ctx);
  assert.equal(a.rankingGrupo(-700)[0].mensagens, 1);
});
test('registro carrega modulos novos com permissoes', async () => {
  const r = await import('../commands/registry.js'); await r.loadCommands();
  for (const nome of ['notas','filtro','antiflood','bloqueios','palavras','ranking','silenciar','dessilenciar','denunciar']) assert.equal(typeof r.getCommand(nome)?.handler, 'function', nome);
  for (const nome of ['filtro','antiflood','bloqueios','palavras','silenciar','dessilenciar']) assert.equal(r.getCommand(nome).soAdmin, true, nome);
});

test('notas nao permitem alteracao por membro comum', async () => {
  const {default: notas} = await import('../commands/grupo/notas.js');
  const erros = [];
  await notas({args: ['salvar', 'segredo', '|', 'texto'], chatId: -800, isDono: false, garantirAdmin: async () => false, erro: async x => erros.push(x)});
  assert.equal(erros.length, 1);
  assert.equal(a.listarRespostas(-800, 'nota').length, 0);
});
test('silenciamento impede alvo admin e usa prazo temporario para membro', async () => {
  const {default: silenciar} = await import('../commands/grupo/silenciar.js');
  const chamadas = [];
  const erros = [];
  const telegram = {getChat: async () => ({permissions:{can_send_messages:true}}), getChatMember: async () => ({status: 'administrator'}), restrictChatMember: async (...args) => chamadas.push(args)};
  const ctx = {respondida: {from: {id: 23}}, args: ['10m'], chatId: -810, waguri: {telegram}, erro: async x => erros.push(x), responderComApagar: async () => {}};
  await silenciar(ctx); assert.equal(chamadas.length, 0); assert.equal(erros.length, 1);
  telegram.getChatMember = async () => ({status: 'member'});
  await silenciar(ctx); assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0][2].permissions.can_send_messages, false);
  assert.ok(chamadas[0][2].until_date > Date.now() / 1000);
});
test('dessilenciamento respeita permissoes padrao em vez de liberar tudo', async () => {
  const {default: dessilenciar} = await import('../commands/grupo/dessilenciar.js');
  const permissions = {can_send_messages: true, can_send_photos: false};
  let extra;
  await dessilenciar({respondida: {from: {id: 23}}, chatId: -810, waguri: {telegram: {getChatMember:async()=>({status:'member'}), getChat: async () => ({permissions}), restrictChatMember: async (_chat, _id, args) => {extra = args;}}}, responderComApagar: async () => {}});
  assert.deepEqual(extra.permissions, permissions);
  assert.equal(extra.use_independent_chat_permissions, true);
});

test('edicoes sao moderadas mas nao geram pontos nem respostas de filtro', async () => {
  a.salvarAutomacao(-910, {ranking: true, palavras: ['proibido']});
  a.salvarResposta(-910, 'filtro', 'ola', 'Oi');
  let apagadas = 0, respostas = 0;
  const ctx = {chat: {id: -910, type: 'supergroup'}, from: {id: 1}, telegram: {getChatMember: async () => ({status: 'member'})}, deleteMessage: async () => apagadas++, reply: async () => respostas++};
  await a.processarAutomacao(ctx, {mensagem: {text: 'proibido'}, editada: true});
  assert.equal(apagadas, 1);
  await a.processarAutomacao(ctx, {mensagem: {text: 'ola'}, editada: true});
  assert.equal(respostas, 0); assert.equal(a.rankingGrupo(-910).length, 0);
});

test('alias e nome principal compartilham cooldown', async () => {
  const { checarCooldown } = await import('../core/router.js');
  const cmd = {name: 'denunciar', canonicalName: 'denunciar', cooldown: 60};
  assert.equal(checarCooldown('usuario-teste-intervalo', cmd, {cooldown: 0}), 0);
  assert.ok(checarCooldown('usuario-teste-intervalo', {...cmd, name: 'report'}, {cooldown: 0}) > 0);
});
