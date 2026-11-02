const app = document.getElementById("app");
const modal = document.getElementById("modal-auth");
const authErro = document.getElementById("auth-erro");
const formAuth = document.getElementById("form-auth");
const inNome = document.getElementById("in-nome");
const inEmail = document.getElementById("in-email");
const inSenha = document.getElementById("in-senha");

let sessao = null;
let registroAberto = false;
let modoRegistro = false;
let statusCache = null;

const api = async (rota, opcoes = {}) => {
  const r = await fetch(rota, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...opcoes,
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro ?? `Erro ${r.status}`);
  return dados;
};

const esc = (t) =>
  String(t ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function toast(texto, erro = false) {
  document.querySelector(".toast")?.remove();

  const el = document.createElement("div");
  el.className = `toast${erro ? " toast-erro" : ""}`;
  el.innerHTML = `<i class="fa-solid ${erro ? "fa-circle-exclamation" : "fa-circle-check"}"></i><span>${esc(texto)}</span>`;
  document.body.appendChild(el);

  setTimeout(() => el.classList.add("saindo"), 3600);
  setTimeout(() => el.remove(), 4000);
}

const avatarImg = (tipo, id, nome) =>
  `<img class="av" loading="lazy" src="/api/admin/avatar/${tipo}/${encodeURIComponent(id)}"
        alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),
        {className:'av av-vazio', textContent:'${esc(String(nome || "?"))
          .slice(0, 1)
          .toUpperCase()}'}))">`;

const ICONE_PLANO = {
  free: "fa-leaf",
  bronze: "fa-medal",
  prata: "fa-award",
  ouro: "fa-trophy",
  diamante: "fa-gem",
  dono: "fa-crown",
};

const ICONE_CATEGORIA = {
  download: "fa-download",
  ia: "fa-robot",
  pesquisa: "fa-magnifying-glass",
  logos: "fa-palette",
  diversao: "fa-face-laugh",
  grupo: "fa-users",
  dono: "fa-crown",
  info: "fa-circle-info",
};

function petalas() {
  const alvo = document.getElementById("petalas");
  for (let i = 0; i < 12; i += 1) {
    const p = document.createElement("i");
    p.className = "petala fa-solid fa-fan";
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDuration = `${12 + Math.random() * 15}s`;
    p.style.animationDelay = `${Math.random() * 15}s`;
    p.style.fontSize = `${9 + Math.random() * 9}px`;
    alvo.appendChild(p);
  }
}

async function carregarSessao() {
  try {
    const r = await api("/api/sessao");
    sessao = r.autenticado ? r.usuario : null;
    registroAberto = Boolean(r.registroAberto);
  } catch {
    sessao = null;
  }
  renderTopo();
}

function renderTopo() {
  const btn = document.getElementById("btn-entrar");
  const perfil = document.getElementById("perfil");
  const navPainel = document.getElementById("nav-painel");
  const navAdmin = document.getElementById("nav-admin");

  if (sessao) {
    btn.classList.add("oculto");
    perfil.classList.remove("oculto");
    navPainel.classList.remove("oculto");
    document.getElementById("perfil-nome").textContent = sessao.nome;

    const p = sessao.plano ?? {};
    const ico = ICONE_PLANO[p.chave] ?? "fa-leaf";
    document.getElementById("perfil-plano").innerHTML =
      `<i class="fa-solid ${ico}"></i> ${esc(p.nome ?? "Free")}`;

    navAdmin.classList.toggle("oculto", sessao.papel !== "dono");
  } else {
    btn.classList.remove("oculto");
    perfil.classList.add("oculto");
    navPainel.classList.add("oculto");
    navAdmin.classList.add("oculto");
  }
}

async function status() {
  if (!statusCache) statusCache = await api("/api/status");
  return statusCache;
}

const rotas = {
  "/": async () => {
    const s = await status();
    const e = s.estatisticas;
    const link = s.bot.username ? `https://t.me/${s.bot.username}` : "#";

    return `
      <section class="hero">
        <i class="fa-solid fa-fan hero-icone"></i>
        <h1>Sua bot favorita<br><span>tem nome de flor</span></h1>
        <p>
          ${e.comandos} comandos de download, inteligencia artificial, pesquisa e logos.
          Tudo pelo chat, sem sair do Telegram.
        </p>
        <div class="hero-botoes">
          <a class="btn" href="${link}" target="_blank" rel="noopener">
            <i class="fa-brands fa-telegram"></i> Adicionar no Telegram
          </a>
          <a class="btn btn-fantasma" href="#/comandos">
            <i class="fa-solid fa-terminal"></i> Ver comandos
          </a>
        </div>
      </section>

      <div class="numeros">
        <div class="numero"><i class="fa-solid fa-terminal"></i><b>${e.comandos}</b><span>Comandos</span></div>
        <div class="numero"><i class="fa-solid fa-download"></i><b>13</b><span>Downloads</span></div>
        <div class="numero"><i class="fa-solid fa-palette"></i><b>146</b><span>Logos</span></div>
        <div class="numero"><i class="fa-solid fa-robot"></i><b>8</b><span>IA</span></div>
      </div>

      <div class="secao-titulo">
        <h2>O que ela faz</h2>
        <p>Recursos que voce usa todo dia</p>
      </div>

      <div class="recursos">
        <div class="recurso">
          <i class="fa-solid fa-download ico"></i>
          <h3>Downloads</h3>
          <p>YouTube, Instagram, TikTok, Spotify, MediaFire e mais. Manda o link, recebe o arquivo.</p>
        </div>
        <div class="recurso">
          <i class="fa-solid fa-palette ico"></i>
          <h3>146 logos</h3>
          <p>Neon, metal, glitch, galaxy, graffiti. Escreve o texto e ela desenha pra voce.</p>
        </div>
        <div class="recurso">
          <i class="fa-solid fa-robot ico"></i>
          <h3>Inteligencia artificial</h3>
          <p>Converse, gere imagens, remova o fundo e transforme fotos em estilo anime.</p>
        </div>
        <div class="recurso">
          <i class="fa-solid fa-magnifying-glass ico"></i>
          <h3>Pesquisa</h3>
          <p>YouTube, Google, Play Store, letras de musica, IMDb, Pinterest e Wattpad.</p>
        </div>
        <div class="recurso">
          <i class="fa-solid fa-users-gear ico"></i>
          <h3>Grupos</h3>
          <p>Ferramentas de administracao com controle de permissao por cargo.</p>
        </div>
        <div class="recurso">
          <i class="fa-solid fa-gem ico"></i>
          <h3>Planos VIP</h3>
          <p>Limite maior, cooldown menor e comandos exclusivos em quatro niveis.</p>
        </div>
      </div>
    `;
  },

  "/comandos": async () => {
    const cats = await api("/api/comandos");
    const nomes = Object.keys(cats);
    const total = nomes.reduce((a, c) => a + cats[c].length, 0);

    const abas = [
      `<button class="aba ativa" data-cat="todos"><i class="fa-solid fa-border-all"></i> Todos (${total})</button>`,
      ...nomes.map(
        (c) =>
          `<button class="aba" data-cat="${c}"><i class="fa-solid ${
            ICONE_CATEGORIA[c] ?? "fa-folder"
          }"></i> ${esc(c)} (${cats[c].length})</button>`,
      ),
    ].join("");

    const itens = nomes
      .flatMap((cat) =>
        cats[cat].map(
          (cmd) => `
        <div class="cmd" data-cat="${cat}" data-busca="${esc(cmd.name)} ${esc(cmd.description)}">
          <code>/${esc(cmd.name)}</code>
          <p>${esc(cmd.description) || "Sem descricao"}</p>
        </div>`,
        ),
      )
      .join("");

    return `
      <div class="secao-titulo" style="margin-top:48px">
        <h2>Comandos</h2>
        <p>${total} disponiveis &mdash; filtre por categoria ou busque</p>
      </div>
      <div class="busca-caixa">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="busca" placeholder="Buscar comando..." autocomplete="off">
      </div>
      <div class="abas" id="abas">${abas}</div>
      <div class="grade-cmd" id="grade">${itens}</div>
      <div class="aviso oculto" id="vazio">
        <i class="fa-solid fa-magnifying-glass ico"></i>
        <h3>Nada encontrado</h3>
        <p>Tente outro termo de busca.</p>
      </div>
    `;
  },

  "/planos": async () => {
    const { free, planos } = await api("/api/planos");
    const meu = sessao?.plano?.chave ?? null;

    const carta = (p, destaque) => {
      const limite =
        p.limiteDiario === null
          ? "Ilimitado"
          : `${p.limiteDiario} comandos por dia`;
      const classe = ["plano"];
      if (p.chave === meu) classe.push("atual");
      else if (destaque) classe.push("destaque");

      return `
        <div class="${classe.join(" ")}">
          <i class="fa-solid ${ICONE_PLANO[p.chave] ?? "fa-leaf"} plano-icone"></i>
          <h3>${esc(p.nome)}</h3>
          <div class="plano-limite">${limite}</div>
          <ul>${p.beneficios.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>`;
    };

    return `
      <div class="secao-titulo" style="margin-top:48px">
        <h2>Planos VIP</h2>
        <p>Mais comandos por dia, menos tempo de espera</p>
      </div>
      <div class="planos">
        ${carta(free, false)}
        ${planos.map((p) => carta(p, p.chave === "ouro")).join("")}
      </div>
      <div class="aviso" style="padding-top:36px">
        <p>Pra assinar, fale com o dono pelo Telegram. O VIP entra na hora.</p>
      </div>
    `;
  },

  "/painel": async () => {
    if (!sessao) {
      return `
        <div class="aviso" style="padding-top:100px">
          <i class="fa-solid fa-lock ico"></i>
          <h3>Voce precisa entrar</h3>
          <p>Faca login com seu e-mail e senha pra ver seu painel.</p>
          <button class="btn" id="ir-login"><i class="fa-solid fa-right-to-bracket"></i> Entrar</button>
        </div>`;
    }

    const d = await api("/api/auth/eu");
    const uso = d.uso;
    const pct =
      uso.limite === null
        ? 100
        : Math.min(100, (uso.usados / uso.limite) * 100);
    const limiteTxt = uso.limite === null ? "ilimitado" : uso.limite;
    const p = sessao.plano ?? {};

    const semTelegram = !sessao.telegramId
      ? `<div class="alerta">
           <i class="fa-solid fa-triangle-exclamation"></i>
           Sua conta ainda nao esta ligada ao Telegram. Peca ao dono pra vincular seu ID
           e o painel passa a mostrar seu uso real.
         </div>`
      : "";

    const hist =
      d.historico.length > 0
        ? d.historico
            .map((h) => {
              const dt = new Date(h.em).toLocaleDateString("pt-BR");
              return `<div class="linha"><b>${esc(h.acao)} ${esc(h.plano ?? "")}</b><span>${dt}</span></div>`;
            })
            .join("")
        : '<div class="linha"><span>Nenhum registro ainda</span></div>';

    const vipInfo = d.vip
      ? `
        <div class="linha"><span>Plano</span><b>${esc(d.vip.plano)}</b></div>
        <div class="linha"><span>Validade</span><b>${
          d.vip.vitalicio
            ? "Vitalicio"
            : new Date(d.vip.expiraEm).toLocaleDateString("pt-BR")
        }</b></div>
        <div class="linha"><span>VIP desde</span><b>${new Date(d.vip.desde).toLocaleDateString("pt-BR")}</b></div>
        <div class="linha"><span>Comandos usados</span><b>${d.vip.usosTotal}</b></div>`
      : `<div class="linha"><span>Voce ainda nao e VIP</span></div>
         <div style="margin-top:12px"><a class="btn btn-fantasma" href="#/planos"><i class="fa-solid fa-gem"></i> Ver planos</a></div>`;

    return `
      <div class="painel-topo">
        <div class="avatar"><i class="fa-solid ${ICONE_PLANO[p.chave] ?? "fa-user"}"></i></div>
        <div>
          <h2>${esc(sessao.nome)}</h2>
          <div class="id mono">${esc(sessao.email)}</div>
        </div>
        <div class="selo">
          <b><i class="fa-solid ${ICONE_PLANO[p.chave] ?? "fa-leaf"}"></i> ${esc(p.nome ?? "Free")}</b>
          <span>${esc(sessao.papel)}</span>
        </div>
      </div>

      ${semTelegram}

      <div class="carta" style="margin-bottom:16px">
        <h4><i class="fa-solid fa-chart-simple"></i> Uso de hoje</h4>
        <div class="barra-uso">
          <div class="trilho"><div class="preenche" style="width:${pct}%"></div></div>
          <div class="legenda">
            <span>${uso.usados} usados</span>
            <span>limite ${limiteTxt}</span>
          </div>
        </div>
      </div>

      <div class="cartas">
        <div class="carta"><h4><i class="fa-solid fa-gem"></i> Assinatura</h4><div class="lista">${vipInfo}</div></div>
        <div class="carta"><h4><i class="fa-solid fa-clock-rotate-left"></i> Historico</h4><div class="lista">${hist}</div></div>
      </div>

      <div class="carta" style="margin-top:16px">
        <h4><i class="fa-solid fa-key"></i> Trocar senha</h4>
        <div class="form-linha">
          <div class="campo">
            <label>Senha atual</label>
            <input type="password" id="s-atual" autocomplete="current-password">
          </div>
          <div class="campo">
            <label>Senha nova</label>
            <input type="password" id="s-nova" autocomplete="new-password">
          </div>
          <div class="campo" style="flex:0 0 auto">
            <label>&nbsp;</label>
            <button class="btn" id="s-salvar">Salvar</button>
          </div>
        </div>
        <div class="modal-erro oculto" id="s-msg" style="margin:14px 0 0"></div>
      </div>
    `;
  },

  "/admin": async () => {
    if (sessao?.papel !== "dono") {
      return `
        <div class="aviso" style="padding-top:100px">
          <i class="fa-solid fa-ban ico"></i>
          <h3>Area restrita</h3>
          <p>Somente o dono do bot acessa esta pagina.</p>
        </div>`;
    }

    const s = await api("/api/admin/stats");
    const r = s.resumo;

    return `
      <div class="secao-titulo" style="margin-top:44px">
        <h2>Administracao</h2>
        <p>Visao geral do bot em tempo real</p>
      </div>

      <div class="numeros admin-numeros">
        <div class="numero"><i class="fa-solid fa-user"></i><b>${r.usuarios.total}</b><span>Usuarios</span></div>
        <div class="numero destaque-humano"><i class="fa-solid fa-user-check"></i><b>${r.usuarios.humanos}</b><span>Pessoas</span></div>
        <div class="numero destaque-bot"><i class="fa-solid fa-robot"></i><b>${r.usuarios.bots}</b><span>Bots</span></div>
        <div class="numero"><i class="fa-solid fa-bolt"></i><b>${r.usuarios.ativosHoje}</b><span>Ativos hoje</span></div>
        <div class="numero"><i class="fa-solid fa-user-plus"></i><b>${r.usuarios.novos7d}</b><span>Novos 7d</span></div>
        <div class="numero"><i class="fa-solid fa-star"></i><b>${r.usuarios.tgPremium}</b><span>TG Premium</span></div>
        <div class="numero"><i class="fa-solid fa-users"></i><b>${r.grupos.total}</b><span>Grupos</span></div>
        <div class="numero"><i class="fa-solid fa-user-group"></i><b>${r.grupos.membros ?? 0}</b><span>Membros</span></div>
        <div class="numero"><i class="fa-solid fa-gem"></i><b>${r.vips.total}</b><span>VIPs</span></div>
        <div class="numero"><i class="fa-solid fa-crown"></i><b>${r.donos}</b><span>Donos</span></div>
        <div class="numero"><i class="fa-solid fa-terminal"></i><b>${r.comandos.hoje}</b><span>Cmds hoje</span></div>
        <div class="numero"><i class="fa-solid fa-ban"></i><b>${r.usuarios.bloqueados}</b><span>Bloqueados</span></div>
        <div class="numero"><i class="fa-solid fa-comment"></i><b>${r.usuarios.noPrivado}</b><span>No privado</span></div>
      </div>

      <div class="abas" id="abas-admin">
        <button class="aba ativa" data-painel="usuarios"><i class="fa-solid fa-user"></i> Usuarios</button>
        <button class="aba" data-painel="grupos"><i class="fa-solid fa-users"></i> Grupos</button>
        <button class="aba" data-painel="donos"><i class="fa-solid fa-crown"></i> Donos</button>
        <button class="aba" data-painel="vips"><i class="fa-solid fa-gem"></i> VIPs</button>
        <button class="aba" data-painel="contas"><i class="fa-solid fa-key"></i> Contas</button>
        <button class="aba" data-painel="metricas"><i class="fa-solid fa-chart-line"></i> Metricas</button>
        <button class="aba" data-painel="mensagens"><i class="fa-solid fa-paper-plane"></i> Mensagens</button>
        <button class="aba" data-painel="logs"><i class="fa-solid fa-list-ul"></i> Logs</button>
        <button class="aba" data-painel="console"><i class="fa-solid fa-terminal"></i> Console</button>
      </div>

      <div id="admin-conteudo"></div>
      <div class="modal-fundo oculto" id="modal-user"><div class="modal modal-largo" id="modal-user-corpo"></div></div>
    `;
  },
};

function ligarEventos(rota) {
  if (rota === "/comandos") {
    const busca = document.getElementById("busca");
    const grade = document.getElementById("grade");
    const vazio = document.getElementById("vazio");
    let catAtiva = "todos";

    const filtrar = () => {
      const termo = (busca?.value ?? "").toLowerCase().trim();
      let visiveis = 0;
      for (const el of grade.children) {
        const okCat = catAtiva === "todos" || el.dataset.cat === catAtiva;
        const okBusca =
          !termo || el.dataset.busca.toLowerCase().includes(termo);
        const mostra = okCat && okBusca;
        el.style.display = mostra ? "" : "none";
        if (mostra) visiveis += 1;
      }
      vazio.classList.toggle("oculto", visiveis > 0);
    };

    busca?.addEventListener("input", filtrar);
    document.getElementById("abas")?.addEventListener("click", (ev) => {
      const aba = ev.target.closest(".aba");
      if (!aba) return;
      document
        .querySelectorAll(".aba")
        .forEach((a) => a.classList.remove("ativa"));
      aba.classList.add("ativa");
      catAtiva = aba.dataset.cat;
      filtrar();
    });
  }

  if (rota === "/painel") {
    document.getElementById("ir-login")?.addEventListener("click", abrirModal);

    document.getElementById("s-salvar")?.addEventListener("click", async () => {
      const msg = document.getElementById("s-msg");
      msg.classList.add("oculto");
      try {
        await api("/api/auth/senha", {
          method: "POST",
          body: JSON.stringify({
            atual: document.getElementById("s-atual").value,
            nova: document.getElementById("s-nova").value,
          }),
        });
        sessao = null;
        renderTopo();
        toast("Senha trocada. Entre de novo.");
        location.hash = "#/";
        navegar("/");
      } catch (err) {
        msg.textContent = err.message;
        msg.classList.remove("oculto");
      }
    });
  }

  if (rota === "/admin" && sessao?.papel === "dono") {
    const conteudo = document.getElementById("admin-conteudo");
    const modalUser = document.getElementById("modal-user");
    const corpoUser = document.getElementById("modal-user-corpo");
    const estado = {
      painel: "usuarios",
      busca: "",
      filtro: "todos",
      pagina: 1,
    };

    const dataBr = (v) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");
    const dataHora = (v) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

    const paginador = (d) =>
      d.paginas <= 1
        ? ""
        : `<div class="paginador">
             <button class="pag" data-pag="${d.pagina - 1}" ${d.pagina <= 1 ? "disabled" : ""}>
               <i class="fa-solid fa-chevron-left"></i>
             </button>
             <span>${d.pagina} de ${d.paginas} &middot; ${d.total} registros</span>
             <button class="pag" data-pag="${d.pagina + 1}" ${d.pagina >= d.paginas ? "disabled" : ""}>
               <i class="fa-solid fa-chevron-right"></i>
             </button>
           </div>`;

    async function abrirGrupo(id) {
      corpoUser.innerHTML =
        '<div class="aviso"><i class="fa-solid fa-fan ico girando"></i></div>';
      modalUser.classList.remove("oculto");

      try {
        const d = await api(
          `/api/admin/grupo/${encodeURIComponent(id)}/membros`,
        );

        const membros = d.membros.length
          ? d.membros
              .map(
                (m) => `
            <div class="linha linha-grupo" data-ver="${esc(m.id)}" style="cursor:pointer">
              <div class="cel-user">
                ${avatarImg("usuario", m.id, m.nome)}
                <div>
                  <b>${esc(m.nome)}</b>
                  ${m.eh_bot ? '<span class="tag tag-bot">bot</span>' : ""}
                  <br><span class="mono menor">${m.username ? "@" + esc(m.username) : esc(m.id)}</span>
                </div>
              </div>
              <span>${m.mensagens} msg(s)</span>
            </div>`,
              )
              .join("")
          : '<div class="linha"><span>Ninguem usou o bot nesse grupo ainda</span></div>';

        corpoUser.innerHTML = `
          <button class="modal-x" id="fechar-user"><i class="fa-solid fa-xmark"></i></button>
          <div class="user-topo">
            <div class="avatar-grande">${avatarImg("grupo", id, d.grupo?.titulo)}</div>
            <div>
              <h2>${esc(d.grupo?.titulo ?? "Grupo")}</h2>
              <div class="id mono">${esc(id)}</div>
            </div>
          </div>

          <div class="lista" style="margin:16px 0">
            <div class="linha"><span>Membros no grupo</span><b>${
              d.grupo?.membros > 0 ? d.grupo.membros : "clique em Detalhes"
            }</b></div>
            <div class="linha"><span>Bot e admin</span><b>${d.grupo?.botAdmin ? "sim" : "nao"}</b></div>
            <div class="linha"><span>Mensagens vistas</span><b>${d.grupo?.mensagens ?? 0}</b></div>
            <div class="linha"><span>Pessoas que usaram o bot aqui</span><b>${d.total}</b></div>
            <div class="linha"><span>No bot desde</span><b>${dataBr(d.grupo?.desde)}</b></div>
          </div>

          <details class="bloco">
            <summary>Protecoes e atividade · v3.2</summary>
            <p>As protecoes exigem permissao de apagar mensagens; administradores sao isentos.</p>
            <div class="form-linha">
              <div class="campo"><label>Antiflood (0 desativa, ou 3–30)</label><input id="g-flood" type="number" min="0" max="30" value="${d.automacao.antiflood}"></div>
              <div class="campo"><label>Janela em segundos (5–60)</label><input id="g-janela" type="number" min="5" max="60" value="${d.automacao.janela}"></div>
            </div>
            <p>Tipos bloqueados</p>
            ${['stickers','fotos','videos','audios','documentos','encaminhadas'].map(tipo => `<label style="display:inline-block;margin:8px"><input type="checkbox" name="g-bloqueio" value="${tipo}" ${d.automacao.bloqueios.includes(tipo) ? 'checked' : ''}> ${tipo}</label>`).join('')}
            <div class="campo"><label>Termos bloqueados (um por linha, ate 50)</label><textarea id="g-palavras" class="area" rows="4">${esc(d.automacao.palavras.join('\n'))}</textarea></div>
            <p><label><input id="g-ranking" type="checkbox" ${d.automacao.ranking ? 'checked' : ''}> Ativar coleta de ranking (ID, nome e pontos; sem texto de mensagens)</label></p>
            <button class="btn" data-salvar-automacao="${esc(id)}">Salvar protecoes</button>
            <p id="g-resultado" role="status"></p>
          </details>

          <details class="bloco">
            <summary><i class="fa-solid fa-paper-plane"></i> Mandar mensagem</summary>
            <textarea id="m-texto" class="area" rows="3" placeholder="Escreva aqui..."></textarea>
            <div class="form-linha" style="margin-top:10px">
              <div class="campo"><label>Imagem (opcional)</label><input id="m-img" placeholder="https://..."></div>
              <div class="campo" style="flex:0 0 auto">
                <label>&nbsp;</label>
                <button class="btn" data-enviar-msg="${esc(id)}"><i class="fa-solid fa-paper-plane"></i> Enviar</button>
              </div>
            </div>
          </details>

          <details class="bloco">
            <summary><i class="fa-solid fa-user-group"></i> Quem usa o bot aqui (${d.total})</summary>
            <div class="lista">${membros}</div>
          </details>

          <div class="acoes-modal">
            <button class="btn btn-fantasma" data-info-grupo="${esc(id)}"><i class="fa-solid fa-circle-info"></i> Detalhes</button>
            <button class="btn btn-fantasma" data-convite="${esc(id)}"><i class="fa-solid fa-link"></i> Gerar convite</button>
            <button class="btn btn-perigo" data-sair="${esc(id)}"><i class="fa-solid fa-right-from-bracket"></i> Sair do grupo</button>
          </div>
          <div class="modal-erro oculto" id="acao-msg"></div>`;
      } catch (err) {
        corpoUser.innerHTML = `<div class="aviso"><i class="fa-solid fa-heart-crack ico"></i><h3>Erro</h3><p>${esc(err.message)}</p></div>`;
      }
    }

    async function abrirUsuario(id) {
      corpoUser.innerHTML =
        '<div class="aviso"><i class="fa-solid fa-fan ico girando"></i></div>';
      modalUser.classList.remove("oculto");

      try {
        const u = await api(`/api/admin/usuario/${id}`);

        const dias = u.ultimosDias.length
          ? u.ultimosDias
              .map(
                (d) =>
                  `<div class="linha"><b>${d.dia}</b><span>${d.usos} cmds</span></div>`,
              )
              .join("")
          : '<div class="linha"><span>Sem uso registrado</span></div>';

        const hist = u.historico.length
          ? u.historico
              .map(
                (h) =>
                  `<div class="linha"><b>${esc(h.acao)} ${esc(h.plano ?? "")}</b><span>${dataBr(h.em)}</span></div>`,
              )
              .join("")
          : '<div class="linha"><span>Sem historico</span></div>';

        corpoUser.innerHTML = `
          <button class="modal-x" id="fechar-user"><i class="fa-solid fa-xmark"></i></button>
          <div class="user-topo">
            <div class="avatar-grande">${avatarImg("usuario", u.id, u.nome)}</div>
            <div>
              <h2>${esc(u.nome)}</h2>
              <div class="id mono">${u.username ? "@" + esc(u.username) + " &middot; " : ""}${esc(u.id)}</div>
            </div>
          </div>

          <div class="user-tags">
            <span class="tag">${esc(u.plano.nome)}</span>
            ${
              u.ehBot
                ? '<span class="tag tag-bot"><i class="fa-solid fa-robot"></i> Bot</span>'
                : '<span class="tag tag-humano"><i class="fa-solid fa-user"></i> Pessoa</span>'
            }
            ${u.dono ? '<span class="tag tag-dono"><i class="fa-solid fa-crown"></i> Dono</span>' : ""}
            ${u.tgPremium ? '<span class="tag tag-dono"><i class="fa-solid fa-star"></i> TG Premium</span>' : ""}
            ${u.idioma ? `<span class="tag">${esc(u.idioma.toUpperCase())}</span>` : ""}
            ${u.vitalicio ? '<span class="tag tag-ok">Vitalicio</span>' : ""}
            ${u.bloqueado ? '<span class="tag tag-erro"><i class="fa-solid fa-ban"></i> Bloqueado</span>' : ""}
          </div>

          <div class="lista" style="margin:18px 0">
            <div class="linha"><span>Tipo de conta</span><b>${u.ehBot ? "Bot" : "Pessoa"}</b></div>
            <div class="linha"><span>Idioma do app</span><b>${u.idioma ? esc(u.idioma.toUpperCase()) : "nao informado"}</b></div>
            <div class="linha"><span>Fala por</span><b>${u.tipoChat === "group" ? "grupo" : "privado"}</b></div>
            <div class="linha"><span>Comandos no total</span><b>${u.comandos}</b></div>
            <div class="linha"><span>Usou hoje</span><b>${u.usosHoje}</b></div>
            <div class="linha"><span>Primeiro uso</span><b>${dataBr(u.primeiroUso)}</b></div>
            <div class="linha"><span>Ultimo uso</span><b>${dataHora(u.ultimoUso)}</b></div>
            ${u.vip ? `<div class="linha"><span>VIP desde</span><b>${dataBr(u.vipDesde)}</b></div>` : ""}
            ${u.vip && !u.vitalicio ? `<div class="linha"><span>VIP expira</span><b>${dataBr(u.expiraEm)}</b></div>` : ""}
            ${u.bloqueado && u.bloqueioMotivo ? `<div class="linha"><span>Motivo</span><b>${esc(u.bloqueioMotivo)}</b></div>` : ""}
          </div>

          <details class="bloco">
            <summary><i class="fa-solid fa-users"></i> Grupos em comum (${u.grupos?.length ?? 0})</summary>
            <div class="lista">${
              u.grupos?.length
                ? u.grupos
                    .map(
                      (g) => `
                  <div class="linha linha-grupo">
                    <div class="cel-user">
                      ${avatarImg("grupo", g.id, g.titulo)}
                      <div>
                        <b>${esc(g.titulo)}</b>
                        <br><span class="mono menor">${esc(g.id)}</span>
                      </div>
                    </div>
                    <span>${g.mensagens} msg(s)</span>
                  </div>`,
                    )
                    .join("")
                : '<div class="linha"><span>Nao esta em nenhum grupo com o bot</span></div>'
            }</div>
          </details>

          <details class="bloco">
            <summary><i class="fa-solid fa-clock-rotate-left"></i> Uso e historico</summary>
            <div class="lista">${dias}</div>
            <div class="lista" style="margin-top:8px">${hist}</div>
          </details>

          <details class="bloco">
            <summary><i class="fa-solid fa-gem"></i> Trocar plano</summary>
            <div class="form-linha">
              <div class="campo">
                <label>Plano</label>
                <select id="p-plano">
                  <option value="free"${u.plano.chave === "free" ? " selected" : ""}>Free</option>
                  <option value="bronze"${u.plano.chave === "bronze" ? " selected" : ""}>Bronze</option>
                  <option value="prata"${u.plano.chave === "prata" ? " selected" : ""}>Prata</option>
                  <option value="ouro"${u.plano.chave === "ouro" ? " selected" : ""}>Ouro</option>
                  <option value="diamante"${u.plano.chave === "diamante" ? " selected" : ""}>Diamante</option>
                </select>
              </div>
              <div class="campo"><label>Dias</label><input id="p-dias" type="number" value="30" min="1"></div>
              <div class="campo campo-check">
                <label>Vitalicio</label>
                <input id="p-vital" type="checkbox"${u.vitalicio ? " checked" : ""}>
              </div>
              <div class="campo" style="flex:0 0 auto">
                <label>&nbsp;</label>
                <button class="btn" data-salvar-plano="${esc(u.id)}"><i class="fa-solid fa-check"></i> Aplicar</button>
              </div>
            </div>
          </details>

          <details class="bloco">
            <summary><i class="fa-solid fa-paper-plane"></i> Mandar mensagem</summary>
            <textarea id="m-texto" class="area" rows="3" placeholder="Escreva aqui... aceita &lt;b&gt;negrito&lt;/b&gt;"></textarea>
            <div class="form-linha" style="margin-top:10px">
              <div class="campo"><label>Imagem (opcional)</label><input id="m-img" placeholder="https://..."></div>
              <div class="campo" style="flex:0 0 auto">
                <label>&nbsp;</label>
                <button class="btn" data-enviar-msg="${esc(u.id)}"><i class="fa-solid fa-paper-plane"></i> Enviar</button>
              </div>
            </div>
          </details>

          ${
            u.dono
              ? ""
              : `<div class="acoes-modal">
                   ${
                     u.bloqueado
                       ? `<button class="btn" data-desbloquear="${esc(u.id)}"><i class="fa-solid fa-lock-open"></i> Desbloquear</button>`
                       : `<button class="btn btn-perigo" data-bloquear="${esc(u.id)}"><i class="fa-solid fa-ban"></i> Bloquear</button>`
                   }
                 </div>`
          }
          <div class="modal-erro oculto" id="acao-msg"></div>
        `;
      } catch (err) {
        corpoUser.innerHTML = `<div class="aviso"><i class="fa-solid fa-heart-crack ico"></i><h3>Erro</h3><p>${esc(err.message)}</p></div>`;
      }
    }

    const paineis = {
      async usuarios() {
        const q = new URLSearchParams({
          busca: estado.busca,
          filtro: estado.filtro,
          pagina: estado.pagina,
        });
        const d = await api(`/api/admin/usuarios?${q}`);

        const linhas = d.usuarios.length
          ? d.usuarios
              .map(
                (u) => `
            <tr data-ver="${esc(u.id)}" class="clicavel">
              <td>
                <div class="cel-user">
                  ${avatarImg("usuario", u.id, u.nome)}
                  <div>
                    <b>${esc(u.nome)}</b>
                    ${u.dono ? '<i class="fa-solid fa-crown dourado"></i>' : ""}
                    ${u.tgPremium ? '<i class="fa-solid fa-star dourado"></i>' : ""}
                    ${u.bloqueado ? '<i class="fa-solid fa-ban vermelho"></i>' : ""}
                    <br><span class="mono menor">${u.username ? "@" + esc(u.username) : esc(u.id)}</span>
                  </div>
                </div>
              </td>
              <td>${
                u.ehBot
                  ? '<span class="tag tag-bot"><i class="fa-solid fa-robot"></i> bot</span>'
                  : '<span class="tag tag-humano"><i class="fa-solid fa-user"></i> pessoa</span>'
              }</td>
              <td>${u.idioma ? esc(u.idioma.toUpperCase()) : "&mdash;"}</td>
              <td>${esc(u.plano.nome)}</td>
              <td>${u.comandos}</td>
              <td>${dataBr(u.ultimoUso)}</td>
            </tr>`,
              )
              .join("")
          : '<tr><td colspan="6" class="vazio-td">Nenhum usuario encontrado</td></tr>';

        return `
          <div class="filtros">
            <div class="busca-caixa busca-inline">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input id="f-busca" placeholder="Buscar por nome, @user ou ID..." value="${esc(estado.busca)}">
            </div>
            <select id="f-filtro">
              <option value="todos"${estado.filtro === "todos" ? " selected" : ""}>Todos</option>
              <option value="vip"${estado.filtro === "vip" ? " selected" : ""}>Somente VIP</option>
              <option value="humanos"${estado.filtro === "humanos" ? " selected" : ""}>Somente pessoas</option>
              <option value="bots"${estado.filtro === "bots" ? " selected" : ""}>Somente bots</option>
              <option value="premium"${estado.filtro === "premium" ? " selected" : ""}>Telegram Premium</option>
              <option value="donos"${estado.filtro === "donos" ? " selected" : ""}>Somente donos</option>
              <option value="bloqueados"${estado.filtro === "bloqueados" ? " selected" : ""}>Bloqueados</option>
            </select>
          </div>
          <div class="carta">
            <div class="rolagem">
              <table class="tabela">
                <thead><tr><th>Usuario</th><th>Tipo</th><th>Idioma</th><th>Plano</th><th>Cmds</th><th>Ultimo uso</th></tr></thead>
                <tbody id="tb-usuarios">${linhas}</tbody>
              </table>
            </div>
            ${paginador(d)}
          </div>`;
      },

      async grupos() {
        const q = new URLSearchParams({
          busca: estado.busca,
          pagina: estado.pagina,
        });
        const d = await api(`/api/admin/grupos?${q}`);

        const linhas = d.grupos.length
          ? d.grupos
              .map(
                (g) => `
            <tr data-grupo="${esc(g.id)}" class="clicavel">
              <td>
                <div class="cel-user">
                  ${avatarImg("grupo", g.id, g.titulo)}
                  <div>
                    <b>${esc(g.titulo)}</b>
                    ${g.botAdmin ? '<i class="fa-solid fa-shield dourado" title="bot e admin"></i>' : ""}
                    <br><span class="mono menor">${esc(g.id)}</span>
                  </div>
                </div>
              </td>
              <td><b>${g.membros > 0 ? g.membros : "&mdash;"}</b></td>
              <td>${g.mensagens}</td>
              <td>${dataBr(g.desde)}</td>
            </tr>`,
              )
              .join("")
          : '<tr><td colspan="4" class="vazio-td">O bot ainda nao esta em nenhum grupo</td></tr>';

        return `
          <div class="filtros">
            <div class="busca-caixa busca-inline">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input id="f-busca" placeholder="Buscar grupo..." value="${esc(estado.busca)}">
            </div>
            <button class="btn btn-fantasma" id="sinc-grupos">
              <i class="fa-solid fa-rotate"></i> Atualizar membros
            </button>
          </div>
          <div class="carta">
            <div class="rolagem">
              <table class="tabela">
                <thead><tr><th>Grupo</th><th>Membros</th><th>Msgs</th><th>Desde</th></tr></thead>
                <tbody>${linhas}</tbody>
              </table>
            </div>
            ${paginador(d)}
          </div>`;
      },

      async donos() {
        const { donos } = await api("/api/admin/donos");

        const linhas = donos
          .map(
            (d) => `
          <tr ${d.registrado ? `data-ver="${esc(d.id)}" class="clicavel"` : ""}>
            <td><b>${esc(d.nome)}</b> <i class="fa-solid fa-crown dourado"></i>
              <br><span class="mono menor">${d.username ? "@" + esc(d.username) : esc(d.id)}</span></td>
            <td>${d.comandos}</td>
            <td>${dataBr(d.ultimoUso)}</td>
            <td>${d.registrado ? '<span class="tag tag-ok">ativo</span>' : '<span class="menor">nunca usou</span>'}</td>
          </tr>`,
          )
          .join("");

        return `
          <div class="carta">
            <h4><i class="fa-solid fa-crown"></i> Donos do bot</h4>
            <p class="ajuda">Definidos em <code>BOT_OWNERS</code> no arquivo .env. Tem acesso total e nao gastam limite.</p>
            <div class="rolagem">
              <table class="tabela">
                <thead><tr><th>Dono</th><th>Comandos</th><th>Ultimo uso</th><th>Status</th></tr></thead>
                <tbody id="tb-donos">${linhas}</tbody>
              </table>
            </div>
          </div>`;
      },

      async vips() {
        const { vips, stats } = await api("/api/admin/vips");

        const linhas = vips.length
          ? vips
              .map(
                (v) => `
            <tr>
              <td><b>${esc(v.nome || v.id)}</b><br><span class="mono menor">${esc(v.id)}</span></td>
              <td>${esc(v.plano)}</td>
              <td>${v.vitalicio ? "Vitalicio" : dataBr(v.expira_em)}</td>
              <td>${v.usos_total}</td>
              <td><button class="acao" data-remover-vip="${esc(v.id)}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`,
              )
              .join("")
          : '<tr><td colspan="5" class="vazio-td">Nenhum VIP ainda</td></tr>';

        return `
          <div class="carta" style="margin-bottom:16px">
            <h4><i class="fa-solid fa-plus"></i> Conceder VIP</h4>
            <div class="form-linha">
              <div class="campo"><label>ID do Telegram</label><input id="v-id" placeholder="123456789" inputmode="numeric"></div>
              <div class="campo"><label>Plano</label>
                <select id="v-plano">
                  <option value="bronze">Bronze</option>
                  <option value="prata">Prata</option>
                  <option value="ouro" selected>Ouro</option>
                  <option value="diamante">Diamante</option>
                </select>
              </div>
              <div class="campo"><label>Dias</label><input id="v-dias" type="number" value="30" min="1"></div>
              <div class="campo" style="flex:0 0 auto"><label>&nbsp;</label>
                <button class="btn" id="v-salvar"><i class="fa-solid fa-plus"></i> Conceder</button></div>
            </div>
            <div class="modal-erro oculto" id="v-msg" style="margin:14px 0 0"></div>
          </div>
          <div class="carta">
            <h4><i class="fa-solid fa-gem"></i> ${stats.total} membros &middot; ${stats.vitalicios} vitalicios</h4>
            <div class="rolagem">
              <table class="tabela">
                <thead><tr><th>Usuario</th><th>Plano</th><th>Validade</th><th>Usos</th><th></th></tr></thead>
                <tbody id="tb-vips">${linhas}</tbody>
              </table>
            </div>
          </div>`;
      },

      async contas() {
        const { contas } = await api("/api/admin/contas");

        const linhas = contas
          .map(
            (c) => `
          <tr>
            <td><b>${esc(c.nome || c.email.split("@")[0])}</b><br><span class="mono menor">${esc(c.email)}</span></td>
            <td>${c.papel === "dono" ? '<i class="fa-solid fa-crown dourado"></i> dono' : "membro"}</td>
            <td>${c.telegram_id ? `<span class="mono menor">${esc(c.telegram_id)}</span>` : '<span class="menor">nao vinculado</span>'}</td>
            <td>${dataBr(c.ultimo_login)}</td>
            <td>${
              c.email === sessao.email
                ? '<span class="menor">voce</span>'
                : `<button class="acao" data-remover-conta="${esc(c.email)}"><i class="fa-solid fa-trash"></i></button>`
            }</td>
          </tr>`,
          )
          .join("");

        return `
          <div class="carta" style="margin-bottom:16px">
            <h4><i class="fa-solid fa-user-plus"></i> Criar conta de acesso</h4>
            <div class="form-linha">
              <div class="campo"><label>E-mail</label><input id="c-email" type="email" placeholder="pessoa@email.com"></div>
              <div class="campo"><label>Senha</label><input id="c-senha" type="password" placeholder="minimo 8"></div>
              <div class="campo"><label>ID Telegram</label><input id="c-tg" placeholder="opcional" inputmode="numeric"></div>
              <div class="campo"><label>Papel</label>
                <select id="c-papel"><option value="membro" selected>Membro</option><option value="dono">Dono</option></select>
              </div>
              <div class="campo" style="flex:0 0 auto"><label>&nbsp;</label>
                <button class="btn" id="c-salvar"><i class="fa-solid fa-plus"></i> Criar</button></div>
            </div>
            <div class="modal-erro oculto" id="c-msg" style="margin:14px 0 0"></div>
          </div>
          <div class="carta">
            <h4><i class="fa-solid fa-key"></i> Contas do painel</h4>
            <div class="rolagem">
              <table class="tabela">
                <thead><tr><th>Conta</th><th>Papel</th><th>Telegram</th><th>Ultimo login</th><th></th></tr></thead>
                <tbody id="tb-contas">${linhas}</tbody>
              </table>
            </div>
          </div>`;
      },

      async mensagens() {
        const { link } = await api("/api/admin/link-adicionar");

        return `
          <div class="carta" style="margin-bottom:14px">
            <h4><i class="fa-solid fa-plus"></i> Colocar o bot num grupo</h4>
            <p class="ajuda">
              O Telegram nao deixa um bot entrar sozinho num grupo &mdash; alguem precisa
              adicionar. Use o link abaixo, ele ja abre a tela de escolher o grupo.
            </p>
            ${
              link
                ? `<div class="form-linha">
                     <div class="campo"><label>Link</label><input id="link-add" value="${esc(link)}" readonly></div>
                     <div class="campo" style="flex:0 0 auto">
                       <label>&nbsp;</label>
                       <a class="btn" href="${esc(link)}" target="_blank" rel="noopener">
                         <i class="fa-brands fa-telegram"></i> Abrir
                       </a>
                     </div>
                   </div>`
                : '<p class="ajuda">O bot ainda nao conectou no Telegram.</p>'
            }
          </div>

          <div class="carta" style="margin-bottom:14px">
            <h4><i class="fa-solid fa-paper-plane"></i> Mandar pra um chat</h4>
            <div class="form-linha">
              <div class="campo">
                <label>ID do usuario ou grupo</label>
                <input id="d-destino" placeholder="8419311466 ou -1001234567890" inputmode="numeric">
              </div>
            </div>
            <textarea id="d-texto" class="area" rows="4" placeholder="Escreva aqui... aceita &lt;b&gt;negrito&lt;/b&gt; e &lt;i&gt;italico&lt;/i&gt;"></textarea>
            <div class="form-linha" style="margin-top:10px">
              <div class="campo"><label>Imagem (opcional)</label><input id="d-img" placeholder="https://..."></div>
              <div class="campo"><label>Botao: texto</label><input id="d-btxt" placeholder="Ver mais"></div>
              <div class="campo"><label>Botao: link</label><input id="d-burl" placeholder="https://..."></div>
              <div class="campo" style="flex:0 0 auto">
                <label>&nbsp;</label>
                <button class="btn" id="d-enviar"><i class="fa-solid fa-paper-plane"></i> Enviar</button>
              </div>
            </div>
            <div class="modal-erro oculto" id="d-msg" style="margin-top:12px"></div>
          </div>

          <div class="carta">
            <h4><i class="fa-solid fa-tower-broadcast"></i> Transmitir pra todo mundo</h4>
            <p class="ajuda">Manda a mesma mensagem em sequencia. Pode demorar se tiver muita gente.</p>
            <div class="form-linha">
              <div class="campo">
                <label>Enviar para</label>
                <select id="t-alvo">
                  <option value="grupos">Todos os grupos</option>
                  <option value="usuarios">Todos os usuarios (privado)</option>
                  <option value="vips">Somente VIPs</option>
                </select>
              </div>
            </div>
            <textarea id="t-texto" class="area" rows="4" placeholder="Aviso importante..."></textarea>
            <div class="form-linha" style="margin-top:10px">
              <div class="campo"><label>Imagem (opcional)</label><input id="t-img" placeholder="https://..."></div>
              <div class="campo" style="flex:0 0 auto">
                <label>&nbsp;</label>
                <button class="btn btn-perigo" id="t-enviar"><i class="fa-solid fa-tower-broadcast"></i> Transmitir</button>
              </div>
            </div>
            <div class="modal-erro oculto" id="t-msg" style="margin-top:12px"></div>
          </div>`;
      },

      async logs() {
        const q = new URLSearchParams({
          nivel: estado.nivelLog ?? "todos",
          busca: estado.busca,
          pagina: estado.pagina,
        });
        const d = await api(`/api/admin/logs?${q}`);

        const hora = (v) => new Date(v).toLocaleString("pt-BR");

        const linhas = d.logs.length
          ? d.logs
              .map((l) => {
                const cor =
                  l.nivel === "erro"
                    ? "log-erro"
                    : l.nivel === "negado"
                      ? "log-negado"
                      : "log-ok";
                return `
            <div class="log-linha ${cor}">
              <div class="log-topo">
                <span class="log-cmd">${l.comando ? "/" + esc(l.comando) : "-"}</span>
                <span class="log-hora">${hora(l.em)}${l.duracao ? ` &middot; ${l.duracao}ms` : ""}</span>
              </div>
              ${l.argumento ? `<div class="log-arg">${esc(l.argumento)}</div>` : ""}
              <div class="log-quem">
                ${esc(l.nome || l.user_id)}
                ${l.em_grupo ? `<i class="fa-solid fa-users"></i> ${esc(l.chat_nome)}` : '<i class="fa-solid fa-comment"></i> privado'}
              </div>
              ${l.erro ? `<div class="log-msg">${esc(l.erro)}</div>` : ""}
            </div>`;
              })
              .join("")
          : '<div class="aviso"><i class="fa-solid fa-list-ul ico"></i><h3>Nenhum log ainda</h3><p>Os comandos executados aparecem aqui.</p></div>';

        return `
          <div class="numeros admin-numeros">
            <div class="numero"><i class="fa-solid fa-list-ul"></i><b>${d.resumo.total}</b><span>Registros</span></div>
            <div class="numero"><i class="fa-solid fa-triangle-exclamation"></i><b>${d.resumo.erros}</b><span>Erros</span></div>
            <div class="numero"><i class="fa-solid fa-clock"></i><b>${d.resumo.ultimaHora}</b><span>Ultima hora</span></div>
            <div class="numero"><i class="fa-solid fa-gauge"></i><b>${d.resumo.mediaMs}ms</b><span>Media</span></div>
          </div>

          <div class="filtros">
            <div class="busca-caixa busca-inline">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input id="f-busca" placeholder="Buscar comando, usuario ou texto..." value="${esc(estado.busca)}">
            </div>
            <select id="f-nivel">
              <option value="todos"${(estado.nivelLog ?? "todos") === "todos" ? " selected" : ""}>Todos</option>
              <option value="ok"${estado.nivelLog === "ok" ? " selected" : ""}>Sucesso</option>
              <option value="erro"${estado.nivelLog === "erro" ? " selected" : ""}>Erros</option>
              <option value="negado"${estado.nivelLog === "negado" ? " selected" : ""}>Negados</option>
            </select>
            <button class="btn btn-perigo" id="limpar-logs"><i class="fa-solid fa-trash"></i> Limpar</button>
          </div>

          <div class="carta">
            <div class="log-lista">${linhas}</div>
            ${paginador(d)}
          </div>`;
      },

      async console() {
        const { atalhos } = await api("/api/admin/console/atalhos");

        return `
          <div class="alerta">
            <i class="fa-solid fa-triangle-exclamation"></i>
            Os comandos rodam de verdade no servidor, na pasta do bot. Comandos destrutivos
            (rm -rf, mkfs, shutdown, sudo, leitura do .env) sao bloqueados, mas tome cuidado.
          </div>

          <div class="carta" style="margin-bottom:14px">
            <h4><i class="fa-solid fa-bolt"></i> Atalhos</h4>
            <div class="atalhos">
              ${atalhos.map((a) => `<button class="aba" data-atalho="${esc(a)}">${esc(a)}</button>`).join("")}
            </div>
          </div>

          <div class="carta">
            <h4><i class="fa-solid fa-terminal"></i> Console</h4>
            <div class="console-entrada">
              <span class="console-prompt">$</span>
              <input id="cmd" placeholder="ls -la" autocomplete="off" spellcheck="false">
              <button class="btn" id="rodar"><i class="fa-solid fa-play"></i> Rodar</button>
            </div>
            <pre class="console-saida" id="saida">Digite um comando e aperte Enter.</pre>
          </div>`;
      },

      async metricas() {
        const s = await api("/api/admin/stats");
        const max = Math.max(...s.grafico.map((g) => g.usos), 1);

        const barras = s.grafico.length
          ? s.grafico
              .map(
                (g) => `
            <div class="barra" title="${g.dia}: ${g.usos} comandos, ${g.usuarios} usuarios">
              <div class="barra-preenche" style="height:${Math.max((g.usos / max) * 100, 3)}%"></div>
              <span>${g.dia.slice(8)}</span>
            </div>`,
              )
              .join("")
          : '<p class="ajuda">Ainda sem dados de uso.</p>';

        const cmds = s.topComandos
          .map(
            (c) =>
              `<div class="linha"><b>/${esc(c.comando)}</b><span>${c.usos} usos${c.erros ? ` &middot; ${c.erros} erros` : ""}</span></div>`,
          )
          .join("");

        const usrs = s.topUsuarios
          .map(
            (u) =>
              `<div class="linha"><b>${esc(u.nome || u.id)}</b><span>${u.comandos} cmds</span></div>`,
          )
          .join("");

        return `
          <div class="carta" style="margin-bottom:16px">
            <h4><i class="fa-solid fa-chart-column"></i> Comandos nos ultimos 14 dias</h4>
            <div class="grafico">${barras}</div>
          </div>
          <div class="cartas">
            <div class="carta"><h4><i class="fa-solid fa-ranking-star"></i> Comandos mais usados</h4>
              <div class="lista">${cmds || '<div class="linha"><span>Sem dados</span></div>'}</div></div>
            <div class="carta"><h4><i class="fa-solid fa-fire"></i> Usuarios mais ativos</h4>
              <div class="lista">${usrs || '<div class="linha"><span>Sem dados</span></div>'}</div></div>
          </div>
          <div class="cartas" style="margin-top:16px">
            <div class="carta">
              <h4><i class="fa-solid fa-users-viewfinder"></i> Pessoas x bots</h4>
              <div class="lista">
                <div class="linha"><span>Pessoas de verdade</span><b>${s.resumo.usuarios.humanos}</b></div>
                <div class="linha"><span>Outros bots</span><b>${s.resumo.usuarios.bots}</b></div>
                <div class="linha"><span>Com Telegram Premium</span><b>${s.resumo.usuarios.tgPremium}</b></div>
                <div class="linha"><span>Falam no privado</span><b>${s.resumo.usuarios.noPrivado}</b></div>
                <div class="linha"><span>Vieram de grupo</span><b>${s.resumo.usuarios.emGrupo}</b></div>
              </div>
            </div>
            <div class="carta">
              <h4><i class="fa-solid fa-language"></i> Idiomas</h4>
              <div class="lista">${
                s.resumo.usuarios.porIdioma.length
                  ? s.resumo.usuarios.porIdioma
                      .map(
                        (i) =>
                          `<div class="linha"><b>${esc(i.idioma.toUpperCase())}</b><span>${i.c} usuario(s)</span></div>`,
                      )
                      .join("")
                  : '<div class="linha"><span>Sem dados</span></div>'
              }</div>
            </div>
          </div>

          <div class="carta" style="margin-top:16px">
            <h4><i class="fa-solid fa-circle-info"></i> Resumo</h4>
            <div class="lista">
              <div class="linha"><span>Execucoes no total</span><b>${s.resumo.comandos.execucoes}</b></div>
              <div class="linha"><span>Erros no total</span><b>${s.resumo.comandos.erros}</b></div>
              <div class="linha"><span>Mensagens em grupos</span><b>${s.resumo.grupos.mensagens}</b></div>
              <div class="linha"><span>VIPs vencendo em 7 dias</span><b>${s.resumo.vips.expirando7d}</b></div>
            </div>
          </div>`;
      },
    };

    async function rodarComando() {
      const campo = document.getElementById("cmd");
      const saida = document.getElementById("saida");
      if (!campo || !saida) return;

      const comando = campo.value.trim();
      if (!comando) return;

      saida.textContent = `$ ${comando}\n\nrodando...`;

      try {
        const r = await api("/api/admin/console", {
          method: "POST",
          body: JSON.stringify({ comando }),
        });

        const partes = [`$ ${r.comando ?? comando}`, ""];

        if (r.bloqueado) partes.push(`[BLOQUEADO] ${r.erro}`);
        else {
          if (r.saida) partes.push(r.saida.trimEnd());
          if (r.erro) partes.push(r.erro.trimEnd());
          if (!r.saida && !r.erro) partes.push("(sem saida)");
          if (r.expirou)
            partes.push("\n[o comando passou de 20s e foi encerrado]");
          partes.push("", `codigo ${r.codigo} · ${r.duracao}ms`);
        }

        saida.textContent = partes.join("\n");
        saida.className = `console-saida ${r.bloqueado ? "saida-bloqueada" : r.ok ? "" : "saida-erro"}`;
      } catch (err) {
        saida.textContent = `$ ${comando}\n\n[erro] ${err.message}`;
        saida.className = "console-saida saida-erro";
      }

      campo.value = "";
      campo.focus();
    }

    conteudo.addEventListener("keydown", (ev) => {
      if (ev.target.id === "cmd" && ev.key === "Enter") {
        ev.preventDefault();
        rodarComando();
      }
    });

    async function pintar() {
      conteudo.innerHTML =
        '<div class="aviso"><i class="fa-solid fa-fan ico girando"></i></div>';
      try {
        conteudo.innerHTML = await paineis[estado.painel]();
      } catch (err) {
        conteudo.innerHTML = `<div class="aviso"><i class="fa-solid fa-heart-crack ico"></i><h3>Erro</h3><p>${esc(err.message)}</p></div>`;
      }
    }

    document.getElementById("abas-admin").addEventListener("click", (ev) => {
      const aba = ev.target.closest(".aba");
      if (!aba) return;
      document
        .querySelectorAll("#abas-admin .aba")
        .forEach((a) => a.classList.remove("ativa"));
      aba.classList.add("ativa");
      estado.painel = aba.dataset.painel;
      estado.busca = "";
      estado.pagina = 1;
      pintar();
    });

    let debounce;
    conteudo.addEventListener("input", (ev) => {
      if (ev.target.id !== "f-busca") return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        estado.busca = ev.target.value;
        estado.pagina = 1;
        pintar().then(() => {
          const campo = document.getElementById("f-busca");
          if (campo) {
            campo.focus();
            campo.setSelectionRange(campo.value.length, campo.value.length);
          }
        });
      }, 350);
    });

    conteudo.addEventListener("change", (ev) => {
      if (ev.target.id === "f-filtro") {
        estado.filtro = ev.target.value;
        estado.pagina = 1;
        pintar();
        return;
      }
      if (ev.target.id === "f-nivel") {
        estado.nivelLog = ev.target.value;
        estado.pagina = 1;
        pintar();
      }
    });

    conteudo.addEventListener("click", async (ev) => {
      const pag = ev.target.closest("[data-pag]");
      if (pag && !pag.disabled) {
        estado.pagina = Number(pag.dataset.pag);
        pintar();
        return;
      }

      const ver = ev.target.closest("[data-ver]");
      if (ver) {
        abrirUsuario(ver.dataset.ver);
        return;
      }

      const grupo = ev.target.closest("[data-grupo]");
      if (grupo) {
        abrirGrupo(grupo.dataset.grupo);
        return;
      }

      const salvarVip = ev.target.closest("#v-salvar");
      if (salvarVip) {
        const msg = document.getElementById("v-msg");
        msg.classList.add("oculto");
        try {
          await api("/api/admin/vip", {
            method: "POST",
            body: JSON.stringify({
              userId: document.getElementById("v-id").value.trim(),
              plano: document.getElementById("v-plano").value,
              dias: Number(document.getElementById("v-dias").value) || 30,
            }),
          });
          pintar();
        } catch (err) {
          msg.textContent = err.message;
          msg.classList.remove("oculto");
        }
        return;
      }

      const salvarConta = ev.target.closest("#c-salvar");
      if (salvarConta) {
        const msg = document.getElementById("c-msg");
        msg.classList.add("oculto");
        try {
          await api("/api/admin/conta", {
            method: "POST",
            body: JSON.stringify({
              email: document.getElementById("c-email").value.trim(),
              senha: document.getElementById("c-senha").value,
              telegramId: document.getElementById("c-tg").value.trim(),
              papel: document.getElementById("c-papel").value,
            }),
          });
          pintar();
        } catch (err) {
          msg.textContent = err.message;
          msg.classList.remove("oculto");
        }
        return;
      }

      const delVip = ev.target.closest("[data-remover-vip]");
      if (delVip && confirm("Remover o VIP desse usuario?")) {
        await api(`/api/admin/vip/${delVip.dataset.removerVip}`, {
          method: "DELETE",
        });
        pintar();
        return;
      }

      const sinc = ev.target.closest("#sinc-grupos");
      if (sinc) {
        sinc.disabled = true;
        sinc.innerHTML =
          '<i class="fa-solid fa-rotate girando"></i> Atualizando...';

        try {
          const r = await api("/api/admin/grupos/sincronizar", {
            method: "POST",
          });
          toast(
            `${r.atualizados} grupo(s) atualizado(s), ${r.falhas} falharam.`,
          );
          pintar();
        } catch (err) {
          toast(err.message, true);
          sinc.disabled = false;
          sinc.innerHTML =
            '<i class="fa-solid fa-rotate"></i> Atualizar membros';
        }
        return;
      }

      const enviarDireto = ev.target.closest("#d-enviar");
      if (enviarDireto) {
        const msg = document.getElementById("d-msg");
        msg.classList.add("oculto");
        enviarDireto.disabled = true;

        try {
          const btxt = document.getElementById("d-btxt").value.trim();
          const burl = document.getElementById("d-burl").value.trim();

          await api("/api/admin/mensagem", {
            method: "POST",
            body: JSON.stringify({
              destino: document.getElementById("d-destino").value.trim(),
              texto: document.getElementById("d-texto").value,
              imagem: document.getElementById("d-img").value.trim(),
              botoes: btxt && burl ? [{ text: btxt, url: burl }] : [],
            }),
          });

          msg.textContent = "Mensagem enviada!";
          msg.className = "modal-erro sucesso";
          document.getElementById("d-texto").value = "";
        } catch (err) {
          msg.textContent = err.message;
          msg.className = "modal-erro";
        }

        msg.classList.remove("oculto");
        enviarDireto.disabled = false;
        return;
      }

      const transmitir = ev.target.closest("#t-enviar");
      if (transmitir) {
        const alvo = document.getElementById("t-alvo").value;
        const rotulo =
          alvo === "grupos"
            ? "todos os grupos"
            : alvo === "vips"
              ? "os VIPs"
              : "todos os usuarios";

        if (!confirm(`Enviar essa mensagem pra ${rotulo}?`)) return;

        const msg = document.getElementById("t-msg");
        msg.classList.add("oculto");
        transmitir.disabled = true;
        transmitir.innerHTML =
          '<i class="fa-solid fa-fan girando"></i> Enviando...';

        try {
          const r = await api("/api/admin/transmitir", {
            method: "POST",
            body: JSON.stringify({
              alvo,
              texto: document.getElementById("t-texto").value,
              imagem: document.getElementById("t-img").value.trim(),
            }),
          });

          msg.textContent = `Pronto: ${r.enviados} enviada(s), ${r.falhas} falharam de ${r.total}.`;
          msg.className = "modal-erro sucesso";
        } catch (err) {
          msg.textContent = err.message;
          msg.className = "modal-erro";
        }

        msg.classList.remove("oculto");
        transmitir.disabled = false;
        transmitir.innerHTML =
          '<i class="fa-solid fa-tower-broadcast"></i> Transmitir';
        return;
      }

      const limpar = ev.target.closest("#limpar-logs");
      if (limpar && confirm("Apagar todos os logs?")) {
        await api("/api/admin/logs", { method: "DELETE" });
        pintar();
        return;
      }

      const atalho = ev.target.closest("[data-atalho]");
      if (atalho) {
        const campo = document.getElementById("cmd");
        if (campo) {
          campo.value = atalho.dataset.atalho;
          rodarComando();
        }
        return;
      }

      const rodar = ev.target.closest("#rodar");
      if (rodar) {
        rodarComando();
        return;
      }

      const delConta = ev.target.closest("[data-remover-conta]");
      if (delConta && confirm("Excluir essa conta do painel?")) {
        await api(
          `/api/admin/conta/${encodeURIComponent(delConta.dataset.removerConta)}`,
          {
            method: "DELETE",
          },
        );
        pintar();
      }
    });

    modalUser.addEventListener("click", async (ev) => {
      const salvarAutomacao = ev.target.closest('[data-salvar-automacao]');
      if (salvarAutomacao) {
        const resultado = document.getElementById('g-resultado');
        salvarAutomacao.disabled = true;
        try {
          await api(`/api/admin/grupo/${encodeURIComponent(salvarAutomacao.dataset.salvarAutomacao)}/automacao`, {
            method: 'PUT', body: JSON.stringify({
              antiflood: Number(document.getElementById('g-flood').value),
              janela: Number(document.getElementById('g-janela').value),
              bloqueios: [...modalUser.querySelectorAll('[name="g-bloqueio"]:checked')].map(x => x.value),
              palavras: document.getElementById('g-palavras').value.split('\n').map(x => x.trim()).filter(Boolean),
              ranking: document.getElementById('g-ranking').checked,
            }),
          });
          resultado.textContent = 'Configuracao salva.';
        } catch (err) { resultado.textContent = err.message; }
        finally { salvarAutomacao.disabled = false; }
        return;
      }

      if (ev.target === modalUser || ev.target.closest("#fechar-user")) {
        modalUser.classList.add("oculto");
        return;
      }

      const verUser = ev.target.closest("[data-ver]");
      if (verUser) {
        abrirUsuario(verUser.dataset.ver);
        return;
      }

      const aviso = (texto, erro = false) => {
        const el = document.getElementById("acao-msg");
        if (!el) return;
        el.textContent = texto;
        el.className = erro ? "modal-erro" : "modal-erro sucesso";
        el.classList.remove("oculto");
      };

      const salvarPlano = ev.target.closest("[data-salvar-plano]");
      if (salvarPlano) {
        const id = salvarPlano.dataset.salvarPlano;
        salvarPlano.disabled = true;

        try {
          await api(`/api/admin/usuario/${id}/plano`, {
            method: "POST",
            body: JSON.stringify({
              plano: document.getElementById("p-plano").value,
              dias: Number(document.getElementById("p-dias").value) || 30,
              vitalicio: document.getElementById("p-vital").checked,
            }),
          });
          aviso("Plano atualizado!");
          pintar();
        } catch (err) {
          aviso(err.message, true);
        }

        salvarPlano.disabled = false;
        return;
      }

      const enviarMsg = ev.target.closest("[data-enviar-msg]");
      if (enviarMsg) {
        const destino = enviarMsg.dataset.enviarMsg;
        enviarMsg.disabled = true;

        try {
          await api("/api/admin/mensagem", {
            method: "POST",
            body: JSON.stringify({
              destino,
              texto: document.getElementById("m-texto").value,
              imagem: document.getElementById("m-img").value.trim(),
            }),
          });
          aviso("Mensagem enviada!");
          document.getElementById("m-texto").value = "";
        } catch (err) {
          aviso(err.message, true);
        }

        enviarMsg.disabled = false;
        return;
      }

      const sair = ev.target.closest("[data-sair]");
      if (sair) {
        if (!confirm("O bot vai sair desse grupo. Confirma?")) return;

        try {
          await api(`/api/admin/grupo/${sair.dataset.sair}`, {
            method: "DELETE",
          });
          modalUser.classList.add("oculto");
          pintar();
        } catch (err) {
          aviso(err.message, true);
        }
        return;
      }

      const convite = ev.target.closest("[data-convite]");
      if (convite) {
        try {
          const r = await api(
            `/api/admin/grupo/${convite.dataset.convite}/convite`,
            {
              method: "POST",
            },
          );
          aviso(`Convite: ${r.link}`);
        } catch (err) {
          aviso(err.message, true);
        }
        return;
      }

      const info = ev.target.closest("[data-info-grupo]");
      if (info) {
        try {
          const d = await api(
            `/api/admin/grupo/${info.dataset.infoGrupo}/info`,
          );
          aviso(
            `${d.titulo} · ${d.tipo} · ${d.membros ?? "?"} membro(s) · ` +
              `bot ${d.botEhAdmin ? "e admin" : "nao e admin"}`,
          );
        } catch (err) {
          aviso(err.message, true);
        }
        return;
      }

      const bloq = ev.target.closest("[data-bloquear]");
      if (bloq) {
        const motivo = prompt("Motivo do bloqueio:", "Uso indevido");
        if (motivo === null) return;
        await api(`/api/admin/usuario/${bloq.dataset.bloquear}/bloquear`, {
          method: "POST",
          body: JSON.stringify({ motivo }),
        });
        modalUser.classList.add("oculto");
        pintar();
        return;
      }

      const desbloq = ev.target.closest("[data-desbloquear]");
      if (desbloq) {
        await api(
          `/api/admin/usuario/${desbloq.dataset.desbloquear}/desbloquear`,
          { method: "POST" },
        );
        modalUser.classList.add("oculto");
        pintar();
      }
    });

    pintar();
  }
}

async function navegar(rota, forcar = false) {
  const alvo = rotas[rota] ? rota : "/";

  document.querySelectorAll(".nav a").forEach((a) => {
    a.classList.toggle("ativo", a.dataset.rota === alvo);
  });
  document.getElementById("nav").classList.remove("aberto");

  if (!forcar) {
    app.innerHTML =
      '<div class="aviso"><i class="fa-solid fa-fan ico girando"></i></div>';
  }

  try {
    app.innerHTML = await rotas[alvo]();
    ligarEventos(alvo);
    window.scrollTo({ top: 0 });
  } catch (err) {
    app.innerHTML = `
      <div class="aviso" style="padding-top:90px">
        <i class="fa-solid fa-heart-crack ico"></i>
        <h3>Deu erro aqui</h3>
        <p>${esc(err.message)}</p>
      </div>`;
  }
}

function aplicarModo() {
  const titulo = document.getElementById("auth-titulo");
  const sub = document.getElementById("auth-sub");
  const btn = document.getElementById("btn-confirmar");
  const alternar = document.getElementById("btn-alternar");
  const campoNome = document.getElementById("campo-nome");

  if (modoRegistro) {
    titulo.textContent = "Criar conta";
    sub.textContent = "Preencha os dados pra criar seu acesso ao painel.";
    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Criar conta';
    campoNome.classList.remove("oculto");
    inSenha.setAttribute("autocomplete", "new-password");
    alternar.innerHTML = "Ja tem conta? <strong>Entrar</strong>";
  } else {
    titulo.textContent = "Entrar";
    sub.textContent = "Use seu e-mail e senha pra acessar o painel.";
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
    campoNome.classList.add("oculto");
    inSenha.setAttribute("autocomplete", "current-password");
    alternar.innerHTML = "Nao tem conta? <strong>Criar agora</strong>";
  }

  alternar.classList.toggle("oculto", !registroAberto);
  authErro.classList.add("oculto");
}

function abrirModal() {
  modoRegistro = false;
  aplicarModo();
  modal.classList.remove("oculto");
  inEmail.value = "";
  inSenha.value = "";
  inNome.value = "";
  setTimeout(() => inEmail.focus(), 80);
}

function fecharModal() {
  modal.classList.add("oculto");
}

formAuth.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const btn = document.getElementById("btn-confirmar");
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-fan girando"></i> Aguarde...';
  authErro.classList.add("oculto");

  try {
    const corpo = {
      email: inEmail.value.trim(),
      senha: inSenha.value,
      ...(modoRegistro ? { nome: inNome.value.trim() } : {}),
    };

    const r = await api(
      modoRegistro ? "/api/auth/registrar" : "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(corpo),
      },
    );

    sessao = r.usuario;
    renderTopo();
    fecharModal();
    location.hash = "#/painel";
    navegar("/painel");
  } catch (err) {
    authErro.textContent = err.message;
    authErro.classList.remove("oculto");
    inSenha.value = "";
    inSenha.focus();
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});

document.getElementById("ver-senha").addEventListener("click", () => {
  const mostrando = inSenha.type === "text";
  inSenha.type = mostrando ? "password" : "text";
  document.getElementById("ver-senha").innerHTML = mostrando
    ? '<i class="fa-solid fa-eye"></i>'
    : '<i class="fa-solid fa-eye-slash"></i>';
});

document.getElementById("btn-alternar").addEventListener("click", () => {
  modoRegistro = !modoRegistro;
  aplicarModo();
});

document.getElementById("btn-entrar").addEventListener("click", abrirModal);
document.getElementById("modal-x").addEventListener("click", fecharModal);
modal.addEventListener("click", (ev) => {
  if (ev.target === modal) fecharModal();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && !modal.classList.contains("oculto")) fecharModal();
});

document.getElementById("btn-sair").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  sessao = null;
  renderTopo();
  location.hash = "#/";
  navegar("/");
});

document.getElementById("menu-mob").addEventListener("click", () => {
  document.getElementById("nav").classList.toggle("aberto");
});

window.addEventListener("hashchange", () =>
  navegar(location.hash.slice(1) || "/"),
);

(async () => {
  petalas();
  await carregarSessao();

  try {
    const s = await status();
    document.getElementById("rodape-status").innerHTML = s.api.conectada
      ? '<span class="ponto on"></span>API online'
      : '<span class="ponto off"></span>API offline';
  } catch {
    document.getElementById("rodape-status").textContent = "offline";
  }

  navegar(location.hash.slice(1) || "/");
})();
