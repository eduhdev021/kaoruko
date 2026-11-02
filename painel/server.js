import { criarMiniApi,criarPlataformaAdminApi } from './plataforma-api.js';
import { criarWebhookHandler } from '../core/plataforma/webhook.js';
import { runtime } from '../core/manutencao.js';
import { criarGestaoApi } from './gestao-api.js';
import { obterAutomacao, salvarAutomacao, validarAutomacao } from "../core/automacao.js";
import { limitarHttp } from "../core/limite-http.js";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import botConfig from "../config/index.js";
import {
  getAllCommands,
  getByCategory,
  getCategories,
} from "../commands/registry.js";
import {
  contarUsuarios,
  contarGrupos,
  topComandos,
  topUsuarios,
  listarGrupos,
} from "../core/storage.js";
import {
  listarVips,
  estatisticasVip,
  usoDe,
  historicoDe,
  obterVip,
  adicionarVip,
  removerVip,
  PLANOS,
  PLANO_FREE,
  ORDEM_PLANOS,
} from "../core/vip.js";
import {
  entrar,
  criarConta,
  trocarSenha,
  validarSessao,
  encerrarSessao,
  exigirAuth,
  lerToken,
  listarContas,
  excluirConta,
  vincularTelegram,
  emailValido,
} from "../core/auth.js";
import {
  listarUsuarios,
  detalheUsuario,
  listarGruposDetalhado,
  listarDonos,
  resumoGeral,
  usoUltimosDias,
} from "../core/painel-dados.js";
import { bloquear, desbloquear } from "../core/storage.js";
import {
  gruposDoUsuario,
  membrosDoGrupo,
  contarMembrosVistos,
  salvarMembros,
} from "../core/storage.js";
import { obterAvatar } from "../core/avatar.js";
import { lerLogs, resumoLogs, limparLogs } from "../core/logs.js";
import { executar as executarConsole, atalhos } from "../core/console.js";
import {
  ligarTelegram as ligarAcoes,
  trocarPlano,
  sairDoGrupo,
  enviarMensagem,
  transmitir,
  removerDoGrupo,
  alternarBloqueio,
  infoDoChat,
  criarConvite,
  linkParaAdicionar,
  sincronizarMembros,
} from "../core/acoes.js";
import { verificarKey } from "../core/api.js";
import { logAviso, logSucesso } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function iniciarPainel(waguri) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
    next();
  });
  const limiteAuth = limitarHttp();
  app.use(["/api/auth/login", "/api/auth/registrar"], limiteAuth);
  app.use((req,res,next)=>{
    if(req.path.startsWith('/api')&&!['GET','HEAD','OPTIONS'].includes(req.method)){
      const origin=req.get('origin');let valido=true;
      if(origin)try{valido=new URL(origin).host===req.get('host')||Boolean(botConfig.painel.urlPublica&&origin===new URL(botConfig.painel.urlPublica).origin);}catch{valido=false;}
      if(!valido||req.get('sec-fetch-site')==='cross-site')return res.status(403).json({erro:'Origem nao permitida'});
    }
    if(['/gestao.html','/plataforma.html'].includes(req.path))res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'");
    if(req.path==='/miniapp.html')res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'");
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.use(express.static(path.join(__dirname, "public")));

  let username = "";
  try {
    const eu = await waguri.telegram.getMe();
    username = eu.username ?? "";
  } catch {
    username = "";
  }

  ligarAcoes(waguri.telegram, username);
  app.use("/api/gestao", criarGestaoApi(waguri.telegram));
  app.use('/api/mini',criarMiniApi(waguri.telegram));
  app.use('/api/plataforma',criarPlataformaAdminApi(waguri.telegram));
  app.post('/telegram/webhook',criarWebhookHandler(waguri));
  app.get("/healthz", (_req,res)=>res.json({ok:true,versao:"5.0.0"}));
  app.get('/readyz',(_req,res)=>{
    const ok=Boolean(runtime.ultimoCiclo&&Date.now()-runtime.ultimoCiclo<60000);
    res.status(ok?200:503).json({ok});
  });

  const ipDe = (req) => req.ip || req.socket.remoteAddress || "";

  const cookieSessao = (token) =>
    `kw_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${botConfig.painel.urlPublica.startsWith("https://") ? "; Secure" : ""}`;

  app.post("/api/auth/registrar", (req, res) => {
    if (!botConfig.painel.registroAberto) {
      res
        .status(403)
        .json({ erro: "O registro esta fechado. Peca uma conta ao dono." });
      return;
    }

    const { email, senha, nome } = req.body ?? {};
    const r = criarConta({ email, senha, nome, papel: "membro" });

    if (!r.ok) {
      res.status(400).json({ erro: r.motivo });
      return;
    }

    const login = entrar({ email, senha, ip: ipDe(req) });
    res.setHeader("Set-Cookie", cookieSessao(login.token));
    res.json({ ok: true, token: login.token, usuario: login.usuario });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, senha } = req.body ?? {};

    if (!emailValido(email)) {
      res.status(400).json({ erro: "Digite um e-mail valido" });
      return;
    }
    if (!senha) {
      res.status(400).json({ erro: "Digite sua senha" });
      return;
    }

    const r = entrar({ email, senha, ip: ipDe(req) });
    if (!r.ok) {
      res.status(401).json({ erro: r.motivo });
      return;
    }

    res.setHeader("Set-Cookie", cookieSessao(r.token));
    res.json({ ok: true, token: r.token, usuario: r.usuario });
  });

  app.post("/api/auth/logout", (req, res) => {
    encerrarSessao(lerToken(req));
    res.setHeader("Set-Cookie", "kw_token=; Path=/; HttpOnly; Max-Age=0");
    res.json({ ok: true });
  });

  app.post("/api/auth/senha", exigirAuth(), (req, res) => {
    const { atual, nova } = req.body ?? {};
    const r = trocarSenha(req.usuario.id, atual, nova);
    if (!r.ok) {
      res.status(400).json({ erro: r.motivo });
      return;
    }
    res.setHeader("Set-Cookie", "kw_token=; Path=/; HttpOnly; Max-Age=0");
    res.json({ ok: true });
  });

  app.get("/api/sessao", (req, res) => {
    const usuario = validarSessao(lerToken(req));
    res.json({
      autenticado: Boolean(usuario),
      usuario,
      registroAberto: botConfig.painel.registroAberto,
    });
  });

  app.get("/api/auth/eu", exigirAuth(), (req, res) => {
    const tg = req.usuario.telegramId;
    const uso = tg
      ? usoDe(tg)
      : {
          usados: 0,
          limite: PLANO_FREE.limiteDiario,
          restantes: PLANO_FREE.limiteDiario,
        };
    const registro = tg ? obterVip(tg) : null;

    res.json({
      usuario: req.usuario,
      uso: {
        usados: uso.usados,
        limite: uso.limite === Infinity ? null : uso.limite,
        restantes: uso.restantes === Infinity ? null : uso.restantes,
      },
      vip: registro
        ? {
            plano: registro.plano,
            vitalicio: Boolean(registro.vitalicio),
            expiraEm: registro.expira_em,
            desde: registro.desde,
            usosTotal: registro.usos_total,
          }
        : null,
      historico: tg ? historicoDe(tg, 8) : [],
    });
  });

  app.get("/api/status", async (req, res) => {
    const key = await verificarKey();
    const usuario = validarSessao(lerToken(req));

    const publico = {
      bot: { nome: botConfig.name, username, online: true },
      api: { conectada: key.ok },
      estatisticas: { comandos: getAllCommands().length },
    };

    if (usuario?.papel !== "dono") {
      res.json(publico);
      return;
    }

    res.json({
      ...publico,
      bot: { ...publico.bot, uptime: Math.floor(process.uptime()) },
      estatisticas: {
        comandos: getAllCommands().length,
        usuarios: contarUsuarios(),
        grupos: contarGrupos(),
        vips: estatisticasVip().total,
      },
    });
  });

  app.get("/api/comandos", (_req, res) => {
    const saida = {};
    for (const categoria of getCategories())
      saida[categoria] = getByCategory(categoria);
    res.json(saida);
  });

  app.get("/api/planos", (_req, res) => {
    res.json({
      free: { chave: "free", ...PLANO_FREE },
      planos: ORDEM_PLANOS.map((c) => ({
        chave: c,
        ...PLANOS[c],
        limiteDiario:
          PLANOS[c].limiteDiario === Infinity ? null : PLANOS[c].limiteDiario,
      })),
    });
  });

  app.get("/api/admin/vips", exigirAuth(["dono"]), (_req, res) => {
    res.json({ vips: listarVips(), stats: estatisticasVip() });
  });

  app.post("/api/admin/vip", exigirAuth(["dono"]), (req, res) => {
    const {
      userId,
      plano = "bronze",
      dias = 30,
      vitalicio = false,
    } = req.body ?? {};

    if (!userId || !/^\d+$/.test(String(userId))) {
      res.status(400).json({ erro: "ID do Telegram invalido" });
      return;
    }
    if (!Object.hasOwn(PLANOS, plano)) {
      res.status(400).json({ erro: "Plano invalido" });
      return;
    }

    if (typeof vitalicio !== "boolean" || (!vitalicio &&
        (!Number.isFinite(Number(dias)) || Number(dias) <= 0 || Number(dias) > 36500))) {
      res.status(400).json({ erro: "Duracao do VIP invalida" });
      return;
    }

    const registro = adicionarVip(String(userId), {
      plano,
      duracaoMs: vitalicio ? null : Number(dias) * 86400000,
      por: String(req.usuario.email),
    });
    res.json({ ok: true, vip: registro });
  });

  app.delete("/api/admin/vip/:id", exigirAuth(["dono"]), (req, res) => {
    res.json({ ok: removerVip(req.params.id, String(req.usuario.email)) });
  });

  app.get("/api/admin/contas", exigirAuth(["dono"]), (_req, res) => {
    res.json({ contas: listarContas() });
  });

  app.post("/api/admin/conta", exigirAuth(["dono"]), (req, res) => {
    const { email, senha, nome, papel = "membro", telegramId } = req.body ?? {};
    const r = criarConta({ email, senha, nome, papel });

    if (!r.ok) {
      res.status(400).json({ erro: r.motivo });
      return;
    }
    if (telegramId) vincularTelegram(email, telegramId);
    res.json({ ok: true });
  });

  app.delete("/api/admin/conta/:email", exigirAuth(["dono"]), (req, res) => {
    const alvo = req.params.email;
    if (alvo === req.usuario.email) {
      res.status(400).json({ erro: "Voce nao pode excluir a propria conta" });
      return;
    }
    res.json({ ok: excluirConta(alvo) });
  });

  app.get("/api/admin/stats", exigirAuth(["dono"]), (_req, res) => {
    res.json({
      resumo: resumoGeral(),
      topComandos: topComandos(12),
      topUsuarios: topUsuarios(12),
      grafico: usoUltimosDias(14),
    });
  });

  app.get("/api/admin/usuarios", exigirAuth(["dono"]), (req, res) => {
    res.json(
      listarUsuarios({
        busca: req.query.busca ?? "",
        filtro: req.query.filtro ?? "todos",
        pagina: req.query.pagina ?? 1,
        porPagina: req.query.porPagina ?? 25,
      }),
    );
  });

  app.get("/api/admin/usuario/:id", exigirAuth(["dono"]), (req, res) => {
    const dados = detalheUsuario(req.params.id);
    if (!dados) {
      res.status(404).json({ erro: "Usuario nao encontrado" });
      return;
    }
    res.json({ ...dados, grupos: gruposDoUsuario(req.params.id) });
  });

  app.post(
    "/api/admin/usuario/:id/bloquear",
    exigirAuth(["dono"]),
    (req, res) => {
      const alvo = String(req.params.id);
      if (botConfig.ehDono(alvo)) {
        res.status(400).json({ erro: "Nao da pra bloquear um dono" });
        return;
      }
      bloquear(alvo, String(req.body?.motivo ?? "Bloqueado pelo painel"));
      res.json({ ok: true });
    },
  );

  app.post(
    "/api/admin/usuario/:id/desbloquear",
    exigirAuth(["dono"]),
    (req, res) => {
      desbloquear(String(req.params.id));
      res.json({ ok: true });
    },
  );

  app.get("/api/admin/grupos", exigirAuth(["dono"]), (req, res) => {
    res.json(
      listarGruposDetalhado({
        busca: req.query.busca ?? "",
        pagina: req.query.pagina ?? 1,
        porPagina: req.query.porPagina ?? 25,
      }),
    );
  });

  app.get("/api/admin/donos", exigirAuth(["dono"]), (_req, res) => {
    res.json({ donos: listarDonos() });
  });

  app.get(
    "/api/admin/avatar/:tipo/:id",
    exigirAuth(["dono"]),
    async (req, res) => {
      const tipo = req.params.tipo === "grupo" ? "grupo" : "usuario";

      if (!/^-?\d+$/.test(req.params.id)) {
        res.status(400).end();
        return;
      }

      const foto = await obterAvatar(tipo, req.params.id);

      if (!foto) {
        res.status(404).json({ erro: "sem foto" });
        return;
      }

      res.setHeader("Content-Type", foto.mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.end(foto.dados);
    },
  );

  app.get("/api/admin/grupo/:id/membros", exigirAuth(["dono"]), (req, res) => {
    const grupo = listarGruposDetalhado({ busca: req.params.id, porPagina: 1 })
      .grupos[0];

    res.json({
      grupo: grupo ?? null,
      total: contarMembrosVistos(req.params.id),
      membros: membrosDoGrupo(req.params.id, 60),
      automacao: obterAutomacao(req.params.id),
    });
  });

  app.put("/api/admin/grupo/:id/automacao", exigirAuth(["dono"]), (req, res) => {
    const config = validarAutomacao(req.body);
    if (!/^-\d+$/.test(req.params.id) || !config) {
      return res.status(400).json({erro: "Configuracao de grupo invalida"});
    }
    salvarAutomacao(req.params.id, config);
    res.json({ok: true, automacao: obterAutomacao(req.params.id)});
  });

  app.get("/api/admin/logs", exigirAuth(["dono"]), (req, res) => {
    res.json({
      ...lerLogs({
        nivel: req.query.nivel ?? "todos",
        busca: req.query.busca ?? "",
        pagina: req.query.pagina ?? 1,
        porPagina: req.query.porPagina ?? 50,
      }),
      resumo: resumoLogs(),
    });
  });

  app.delete("/api/admin/logs", exigirAuth(["dono"]), (_req, res) => {
    res.json({ ok: true, apagados: limparLogs() });
  });

  app.post("/api/admin/console", exigirAuth(["dono"]), async (req, res) => {
    const comando = String(req.body?.comando ?? "");

    if (!comando.trim()) {
      res.status(400).json({ erro: "Digite um comando" });
      return;
    }

    const r = await executarConsole(comando, req.usuario);
    res.json(r);
  });

  app.get("/api/admin/console/atalhos", exigirAuth(["dono"]), (_req, res) => {
    res.json({ atalhos });
  });

  const tratar = (fn) => async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  };

  app.post(
    "/api/admin/usuario/:id/plano",
    exigirAuth(["dono"]),
    tratar((req) =>
      trocarPlano(
        {
          userId: req.params.id,
          plano: req.body?.plano,
          dias: req.body?.dias,
          vitalicio: Boolean(req.body?.vitalicio),
        },
        req.usuario,
      ),
    ),
  );

  app.post(
    "/api/admin/usuario/:id/bloqueio",
    exigirAuth(["dono"]),
    tratar((req) =>
      alternarBloqueio(
        {
          userId: req.params.id,
          bloquear: Boolean(req.body?.bloquear),
          motivo: req.body?.motivo,
        },
        req.usuario,
      ),
    ),
  );

  app.post(
    "/api/admin/mensagem",
    exigirAuth(["dono"]),
    tratar((req) =>
      enviarMensagem(
        {
          destino: req.body?.destino,
          texto: req.body?.texto,
          imagem: req.body?.imagem,
          botoes: req.body?.botoes,
        },
        req.usuario,
      ),
    ),
  );

  app.post(
    "/api/admin/transmitir",
    exigirAuth(["dono"]),
    tratar((req) =>
      transmitir(
        {
          texto: req.body?.texto,
          imagem: req.body?.imagem,
          alvo: req.body?.alvo,
        },
        req.usuario,
      ),
    ),
  );

  app.delete(
    "/api/admin/grupo/:id",
    exigirAuth(["dono"]),
    tratar((req) => sairDoGrupo(req.params.id, req.usuario)),
  );

  app.get(
    "/api/admin/grupo/:id/info",
    exigirAuth(["dono"]),
    tratar(async (req) => {
      const info = await infoDoChat(req.params.id);
      if (info.membros !== null) {
        salvarMembros(req.params.id, {
          membros: info.membros,
          botAdmin: info.botEhAdmin,
          username: info.username,
        });
      }
      return info;
    }),
  );

  app.post(
    "/api/admin/grupo/:id/convite",
    exigirAuth(["dono"]),
    tratar((req) => criarConvite(req.params.id, req.usuario)),
  );

  app.post(
    "/api/admin/grupo/:id/remover",
    exigirAuth(["dono"]),
    tratar((req) =>
      removerDoGrupo(
        {
          grupoId: req.params.id,
          userId: req.body?.userId,
          banir: Boolean(req.body?.banir),
        },
        req.usuario,
      ),
    ),
  );

  app.post(
    "/api/admin/grupos/sincronizar",
    exigirAuth(["dono"]),
    tratar(() => sincronizarMembros({ apenasVelhos: false })),
  );

  app.get("/api/admin/link-adicionar", exigirAuth(["dono"]), (_req, res) => {
    res.json({ link: linkParaAdicionar() });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ erro: "Rota nao encontrada" });
  });

  app.use((err, _req, res, _next) => {
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) logAviso(`Erro no painel: ${err.message}`);
    res.status(status).json({ erro: status === 500 ? "Erro interno do servidor" : "Requisicao invalida" });
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  return new Promise((resolve) => {
    const servidor = app.listen(botConfig.painel.port, () => {
      logSucesso(`Painel web em http://localhost:${botConfig.painel.port}`);
      resolve(servidor);
    });
    servidor.on("error", (err) => {
      logAviso(
        `Painel nao subiu na porta ${botConfig.painel.port}: ${err.message}`,
      );
      resolve(null);
    });
  });
}
