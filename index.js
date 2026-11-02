import { criarMiddlewarePlataforma } from './core/plataforma/updates.js';
import { plataforma,requisitosPlataforma } from './core/plataforma/store.js';
import { configurarWebhook,UPDATES_PLATAFORMA } from './core/plataforma/webhook.js';
import { iniciarManutencao } from './core/manutencao.js';
import { instalarLimitesTelegram } from './core/telegram-limites.js';
import { adquirirLock } from './core/processo-lock.js';
import { processarAntispam } from './core/antispam.js';
import { processarAutomacao } from "./core/automacao.js";
import { processarComunidade } from "./core/comunidade.js";
import { iniciarLembretes } from "./core/lembretes.js";
import { Telegraf } from "telegraf";
import chalk from "chalk";
import cron from "node-cron";

import botConfig from "./config/index.js";
import { loadCommands, getAllCommands } from "./commands/registry.js";
import { criarHandlerMensagem } from "./events/mensagem.js";
import { criarHandlerCallback } from "./events/callback.js";
import { verificarKey } from "./core/api.js";
import { fecharDb } from "./core/db.js";
import { limparVipsExpirados, limparUsoAntigo } from "./core/vip.js";
import {
  limparSessoesExpiradas,
  garantirContaInicial,
  totalContas,
} from "./core/auth.js";
import { logAviso, logErro, logInfo, logSucesso } from "./utils/logger.js";
import { ligarTelegram, limparAvataresAntigos } from "./core/avatar.js";
import { sincronizarMembros } from "./core/acoes.js";
import { banner2, banner3 } from "./utils/banner.js";

process.on("unhandledRejection", (motivo) =>
  logErro("Promise rejeitada sem tratamento", motivo),
);
process.on("uncaughtException", (err) => logErro("Excecao nao capturada", err));

const problemas = botConfig.validar();

for (const problema of problemas) logAviso(problema);
if (problemas.length > 0) console.log("");

if (problemas.some((p) => p.includes("BOT_TOKEN"))) {
  logErro("Nao da pra iniciar sem o token. Abra o .env e preencha BOT_TOKEN.");
  process.exit(1);
}

const liberarLock = adquirirLock();
const waguri = new Telegraf(botConfig.token, { handlerTimeout: 120000 });

instalarLimitesTelegram(waguri.telegram);
ligarTelegram(waguri.telegram);
let pararManutencao = async () => {};
let servidorPainel = null;
let pararLembretes = async () => {};

await loadCommands();

waguri.use(criarMiddlewarePlataforma());
waguri.on("message", criarHandlerMensagem(waguri));
waguri.on("callback_query", criarHandlerCallback(waguri));
waguri.on("edited_message", async (ctx) => {
  if (ctx.from?.is_bot) return;
  const mensagem = ctx.editedMessage;
  if (await processarAntispam(ctx, {mensagem, editada:true})) return;
  if (await processarComunidade(ctx, {mensagem})) return;
  await processarAutomacao(ctx, {mensagem, editada: true});
});
waguri.catch((err, ctx) => {
  logErro(`Erro nao tratado no update ${ctx.updateType}`, err);
  if(plataforma.transporte==='webhook')throw err;
});

const contaInicial = garantirContaInicial();
if (contaInicial)
  logSucesso(`Conta inicial do painel criada: ${contaInicial.email}`);
else if (totalContas() === 0) {
  logAviso(
    "Nenhuma conta do painel. Use /conta criar email senha, ou preencha PAINEL_ADMIN_EMAIL e PAINEL_ADMIN_SENHA no .env.",
  );
}

const key = await verificarKey();
if (key.ok) logSucesso(`OKARUN API conectada (${botConfig.okarun.baseUrl})`);
else logAviso(`OKARUN API indisponivel: ${key.motivo ?? "desconhecido"}`);

const limpezaDiaria = cron.schedule(
  "0 3 * * *",
  () => {
    const vips = limparVipsExpirados();
    const sessoes = limparSessoesExpiradas();
    const usos = limparUsoAntigo(7);
    limparAvataresAntigos(7);
    sincronizarMembros({ apenasVelhos: true, horas: 6 }).catch(() => undefined);
    logInfo(
      `Limpeza diaria: ${vips} vips, ${sessoes} sessoes, ${usos} registros de uso`,
    );
  },
  { timezone: botConfig.timezone },
);

if (botConfig.painel.enabled) {
  try {
    const { iniciarPainel } = await import("./painel/server.js");
    servidorPainel = await iniciarPainel(waguri);
  } catch (err) {
    logAviso(`Painel web nao subiu: ${err.message}`);
  }
}

const aoConectar = () => {
    pararLembretes = iniciarLembretes(waguri.telegram);
    pararManutencao = iniciarManutencao(waguri.telegram);
    const eu = waguri.botInfo;

    console.log(banner3.string);
    console.log(banner2.string);

    logSucesso(`Bot online: @${eu.username} (${eu.first_name})`);
    console.log(chalk.gray(`  Link:      https://t.me/${eu.username}`));
    console.log(chalk.gray(`  Comandos:  ${getAllCommands().length}`));
    console.log(chalk.gray(`  Prefixos:  ${botConfig.prefixes.join(" ")}`));
    console.log(
      chalk.gray(
        `  Painel:    ${botConfig.painel.urlPublica || `http://localhost:${botConfig.painel.port}`}`,
      ),
    );
    console.log(
      chalk.gray(`  Donos:     ${botConfig.owners.join(", ") || "nenhum"}\n`),
    );
};
if(!['polling','webhook'].includes(plataforma.transporte))throw new Error('TELEGRAM_TRANSPORT invalido');
if(plataforma.transporte==='webhook'){
  if(!servidorPainel)throw new Error('Webhook exige servidor HTTP ativo');
  await configurarWebhook(waguri);aoConectar();
}else{
  waguri.launch({dropPendingUpdates:false,allowedUpdates:UPDATES_PLATAFORMA},aoConectar).catch(err=>{logErro('Falha ao conectar no Telegram',err);process.exit(1);});
}
for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.once(sinal, async () => {
    logInfo(`Recebi ${sinal}, desligando...`);
    try {
      waguri.stop(sinal);
    } catch {
      logInfo("Bot ja estava parado");
    }
    limpezaDiaria.stop();
    await Promise.all([pararLembretes(), pararManutencao()]);
    if(servidorPainel) { servidorPainel.closeIdleConnections?.(); await new Promise(resolve=>servidorPainel.close(resolve)); }
    liberarLock();
    await limpezaDiaria.destroy();
    fecharDb();
    logSucesso("Banco fechado. Ate mais!");
    process.exit(0);
  });
}
