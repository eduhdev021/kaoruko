import { escapeHtml,urlHttpValida } from '../utils/helpers.js';
import axios from "axios";
import botConfig from "../config/index.js";
export class OkarunError extends Error {
  code;
  status;
  rota;
  constructor(message, opcoes = {}) {
    super(message);
    this.name = "OkarunError";
    this.code = opcoes.code ?? "UNKNOWN";
    this.status = opcoes.status ?? 0;
    this.rota = opcoes.rota ?? "";
  }
  paraUsuario() {
    switch (this.code) {
      case "MISSING_APIKEY":
        return " A API key nao foi configurada. Avise o dono do bot.";
      case "INVALID_APIKEY":
        return " A API key esta invalida ou expirou. Avise o dono do bot.";
      case "LIMIT_REACHED":
        return " As requests da API acabaram. Avise o dono pra renovar o plano.";
      case "TIMEOUT":
        return " A API demorou demais pra responder. Tenta de novo daqui a pouco.";
      case "OFFLINE":
        return " Nao consegui falar com a API agora. Ela pode estar fora do ar.";
      case "NOT_FOUND":
        return " Nao achei nada com isso. Confere o link ou tenta outro termo.";
      default:
        return escapeHtml(this.message);
    }
  }
}
const http = axios.create({
  baseURL: botConfig.okarun.baseUrl,
  timeout: botConfig.okarun.timeout,
  maxContentLength: 5 * 1024 * 1024,
  maxBodyLength: 1024 * 1024,
  headers: {
    "User-Agent": "KaorukoWaguri/5.0 (+telegram)",
    Accept: "application/json, */*",
  },
  validateStatus: () => true,
});
export async function requisitar(rota, params = {}, opcoes = {}) {
  if(typeof rota!=='string'||!rota.startsWith('/api/')||rota.includes('://')||rota.includes('\\'))throw new OkarunError('Rota de API invalida',{code:'INVALID_ROUTE'});
  const apikey = botConfig.okarun.apikey;
  if (!apikey) {
    throw new OkarunError("API key nao configurada", {
      code: "MISSING_APIKEY",
      rota,
    });
  }
  const query = { apikey };
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
      query[chave] = String(valor);
    }
  }
  let resposta;
  try {
    resposta = await http.request({
      url: rota,
      method: opcoes.method ?? "GET",
      params: query,
      data: opcoes.data,
      headers: { "x-api-key": apikey },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const timeout = /timeout|ECONNABORTED/i.test(msg);
    throw new OkarunError(
      timeout
        ? "A API demorou demais pra responder"
        : "Nao consegui conectar na API",
      { code: timeout ? "TIMEOUT" : "OFFLINE", rota },
    );
  }
  const { status, data } = resposta;
  if (typeof data === "string") {
    const texto = data;
    if (texto.trimStart().startsWith("<")) {
      throw new OkarunError("Essa rota nao existe mais na API", {
        code: "NOT_FOUND",
        status,
        rota,
      });
    }
  }
  if (
    status >= 400 ||
    (data && typeof data === "object" && "error" in data && data.error)
  ) {
    const msg =
      (data && typeof data === "object" && (data.error ?? data.message)) ||
      `Erro HTTP ${status}`;
    const code =
      (data && typeof data === "object" && data.code) ||
      (status === 404 ? "NOT_FOUND" : `HTTP_${status}`);
    throw new OkarunError(String(msg), { code: String(code), status, rota });
  }
  if (data === undefined || data === null || data === "") {
    throw new OkarunError("A API devolveu resposta vazia", {
      code: "EMPTY",
      status,
      rota,
    });
  }
  return data;
}
function ehObjeto(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
export function acharCampo(objeto, nomes, profundidade = 0) {
  if (!ehObjeto(objeto) || profundidade > 6) return undefined;
  for (const nome of nomes) {
    const valor = objeto[nome];
    if (typeof valor === "string" && valor.trim()) return valor.trim();
    if (typeof valor === "number") return valor;
    if (ehObjeto(valor)) {
      const interno =
        valor["name"] ?? valor["nome"] ?? valor["title"] ?? valor["text"];
      if (typeof interno === "string" && interno.trim()) return interno.trim();
      if (typeof interno === "number") return interno;
    }
    if (Array.isArray(valor) && valor.length > 0) {
      const primeiro = valor[0];
      if (typeof primeiro === "string" && primeiro.trim())
        return primeiro.trim();
      if (typeof primeiro === "number") return primeiro;
    }
  }
  for (const valor of Object.values(objeto)) {
    if (typeof valor === "object" && valor !== null) {
      const achado = acharCampo(valor, nomes, profundidade + 1);
      if (achado !== undefined) return achado;
    }
  }
  return undefined;
}
const CHAVES_URL = [
  "url",
  "link",
  "imageUrl",
  "image_url",
  "download",
  "downloadUrl",
  "download_url",
  "dl",
  "dlink",
  "src",
  "source",
  "media",
  "file",
  "result",
];
export function acharUrl(objeto, extras = []) {
  const achado = acharCampo(objeto, [...extras, ...CHAVES_URL]);
  return typeof achado === "string" && urlHttpValida(achado) ? new URL(achado).href : undefined;
}
export function extrairResultado(envelope) {
  if (!ehObjeto(envelope)) return envelope;
  for (const chave of [
    "resultado",
    "result",
    "data",
    "resultados",
    "results",
  ]) {
    const valor = envelope[chave];
    if (valor !== undefined && valor !== null) return valor;
  }
  return envelope;
}
export function adivinharTipo(url) {
  const limpa = url.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(mp4|mov|webm|mkv|m4v)$/.test(limpa)) return "video";
  if (/\.(mp3|m4a|ogg|opus|wav|aac)$/.test(limpa)) return "audio";
  if (/\.(jpg|jpeg|png|webp|gif|heic)$/.test(limpa)) return "image";
  return "video";
}
export const download = {
  async instagram(url) {
    const envelope = await requisitar("/api/instagram", { url });
    const bruto = extrairResultado(envelope);
    let itens = [];
    if (Array.isArray(bruto)) {
      itens = bruto;
    } else if (ehObjeto(bruto)) {
      const lista =
        bruto["medias"] ??
        bruto["media"] ??
        bruto["items"] ??
        bruto["links"] ??
        bruto["urls"];
      itens = Array.isArray(lista) ? lista : [bruto];
    }
    const midias = [];
    for (const item of itens) {
      if (typeof item === "string") {
        midias.push({ url: item, tipo: adivinharTipo(item) });
        continue;
      }
      const link = acharUrl(item);
      if (!link) continue;
      const tipoBruto = ehObjeto(item)
        ? String(
            item["type"] ?? item["tipo"] ?? item["format"] ?? "",
          ).toLowerCase()
        : "";
      const tipo = tipoBruto.includes("video")
        ? "video"
        : tipoBruto.includes("image") || tipoBruto.includes("photo")
          ? "image"
          : tipoBruto.includes("audio")
            ? "audio"
            : adivinharTipo(link);
      const thumb = acharCampo(item, [
        "thumbnail",
        "thumb",
        "cover",
        "preview",
      ]);
      midias.push({
        url: link,
        tipo,
        thumbnail: typeof thumb === "string" ? thumb : undefined,
      });
    }
    if (midias.length === 0) {
      throw new OkarunError("Nenhuma midia encontrada nesse link", {
        code: "NOT_FOUND",
        rota: "/api/instagram",
      });
    }
    const autor = acharCampo(bruto, [
      "username",
      "author",
      "owner",
      "autor",
      "user",
    ]);
    const legenda = acharCampo(bruto, [
      "caption",
      "legenda",
      "title",
      "description",
    ]);
    const curtidas = acharCampo(bruto, ["likes", "like_count", "likeCount"]);
    const comentarios = acharCampo(bruto, [
      "comments",
      "comment_count",
      "commentCount",
    ]);
    return {
      midias,
      autor: autor === undefined ? undefined : String(autor),
      legenda: legenda === undefined ? undefined : String(legenda),
      curtidas,
      comentarios,
    };
  },
  async ytaudio(url) {
    return arquivoDireto("/api/dl/ytaudio", { url }, "audio");
  },
  async ytvideo(url) {
    return arquivoDireto("/api/dl/ytvideo", { url }, "video");
  },
  async ytplay(query) {
    return arquivoDireto("/api/dl/ytplay", { query }, "audio");
  },
  async tiktok(url) {
    return extrairResultado(await requisitar("/api/download/tiktok", { url }));
  },
  async mediafire(url) {
    return extrairResultado(await requisitar("/api/dl/mediafire", { url }));
  },
  async spotify(url) {
    return extrairResultado(await requisitar("/api/dl/spotify", { url }));
  },
  async twitter(url) {
    return extrairResultado(await requisitar("/api/dl/twitter", { url }));
  },
  async kwai(url) {
    return extrairResultado(await requisitar("/api/kwai/video", { url }));
  },
  async pinterestMp4(url) {
    return extrairResultado(await requisitar("/api/pinterest_mp4", { url }));
  },
  async gdrive(url) {
    return extrairResultado(await requisitar("/api/dl/gdrive", { url }));
  },
  async capcut(url) {
    return extrairResultado(await requisitar("/api/dl/capcut", { url }));
  },
  async threads(url) {
    return extrairResultado(await requisitar("/api/dl/threads", { url }));
  },
  async aptoide(query) {
    return extrairResultado(await requisitar("/api/dl/aptoide", { query }));
  },
  async ytplaylist(url) {
    return extrairResultado(await requisitar("/api/ytplaylist", { url }));
  },
};
export function montarUrl(rota, params = {}) {
  const url = new URL(rota, botConfig.okarun.baseUrl);
  url.searchParams.set("apikey", botConfig.okarun.apikey);

  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
      url.searchParams.set(chave, String(valor));
    }
  }
  return url.toString();
}

function nomeDoHeader(disposicao) {
  if (!disposicao) return null;

  const utf8 = disposicao.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }

  const simples = disposicao.match(/filename="?([^";]+)"?/i);
  return simples?.[1] ?? null;
}

async function arquivoDireto(rota, params, esperado) {
  if (!botConfig.okarun.apikey || /^(COLE_|SUA_)/.test(botConfig.okarun.apikey)) {
    throw new OkarunError("API key nao configurada", {
      code: "MISSING_APIKEY",
      rota,
    });
  }

  const link = montarUrl(rota, params);

  let cabecalho;
  try {
    cabecalho = await http.head(link, { timeout: 30000 });
  } catch {
    cabecalho = null;
  }

  const tipo = String(cabecalho?.headers?.["content-type"] ?? "");

  if (tipo.includes("json") || tipo.includes("text/html")) {
    const { data } = await http.get(link);
    const erro =
      typeof data === "object" && data
        ? (data.error ?? data.message)
        : "Essa rota nao devolveu o arquivo";

    throw new OkarunError(String(erro ?? "Falha ao baixar"), {
      code: (typeof data === "object" && data?.code) || "NOT_FOUND",
      rota,
    });
  }

  const bruto = Number(cabecalho?.headers?.["content-length"] ?? 0);
  const tamanho = Number.isFinite(bruto) && bruto > 0 ? bruto : 0;
  const nome = nomeDoHeader(cabecalho?.headers?.["content-disposition"]);
  const titulo = nome
    ? nome.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/_/g, " ")
    : "";

  return {
    titulo: titulo || "YouTube",
    canal: "YouTube",
    duracao: "",
    views: undefined,
    thumbnail: undefined,
    audioUrl: esperado === "audio" ? link : undefined,
    videoUrl: esperado === "video" ? link : undefined,
    arquivoUrl: link,
    tamanho,
    mime: tipo || undefined,
    bruto: null,
  };
}

function normalizarYoutube(envelope, rota) {
  const bruto = extrairResultado(envelope);
  const alvo = Array.isArray(bruto) ? bruto[0] : bruto;
  if (alvo === undefined || alvo === null) {
    throw new OkarunError("A API nao devolveu resultado", {
      code: "NOT_FOUND",
      rota,
    });
  }
  const audio = acharCampo(alvo, ["audio", "mp3", "audioUrl", "audio_url"]);
  const video = acharCampo(alvo, ["video", "mp4", "videoUrl", "video_url"]);
  const generico = acharUrl(alvo, ["downloadUrl", "download_url"]);
  const titulo = acharCampo(alvo, ["title", "titulo", "name"]);
  const canal = acharCampo(alvo, [
    "author",
    "channel",
    "canal",
    "uploader",
    "artist",
  ]);
  const duracao = acharCampo(alvo, [
    "timestamp",
    "duration",
    "duracao",
    "time",
  ]);
  const thumb = acharCampo(alvo, [
    "thumbnail",
    "thumb",
    "image",
    "cover",
    "imagem",
  ]);
  return {
    titulo: titulo === undefined ? "Sem titulo" : String(titulo),
    canal: canal === undefined ? "Desconhecido" : String(canal),
    duracao: duracao === undefined ? "" : String(duracao),
    views: acharCampo(alvo, ["views", "viewCount", "view_count"]),
    thumbnail: typeof thumb === "string" ? thumb : undefined,
    audioUrl: typeof audio === "string" ? audio : undefined,
    videoUrl: typeof video === "string" ? video : undefined,
    arquivoUrl: generico,
    bruto: alvo,
  };
}
export const pesquisa = {
  async youtube(termo) {
    const envelope = await requisitar("/api/ytsrc", { q: termo });
    const bruto = extrairResultado(envelope);
    const lista = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
    const videos = [];
    for (const item of lista) {
      if (!ehObjeto(item)) continue;
      const urlAchada = acharCampo(item, ["url", "link", "videoUrl", "watch"]);
      const id = item["videoId"] ?? item["id"];
      const url =
        typeof urlAchada === "string"
          ? urlAchada
          : id
            ? `https://youtu.be/${String(id)}`
            : undefined;
      if (!url) continue;
      const titulo = acharCampo(item, ["title", "titulo", "name"]);
      const canal = acharCampo(item, [
        "author",
        "channel",
        "canal",
        "uploader",
      ]);
      const duracao = acharCampo(item, ["timestamp", "duration", "duracao"]);
      const thumb = acharCampo(item, ["thumbnail", "thumb", "image", "cover"]);
      const publicado = acharCampo(item, [
        "ago",
        "published",
        "uploadDate",
        "postado",
      ]);
      const descricao = acharCampo(item, ["description", "descricao"]);
      videos.push({
        titulo: titulo === undefined ? "Sem titulo" : String(titulo),
        url,
        canal: canal === undefined ? "Desconhecido" : String(canal),
        duracao: duracao === undefined ? "" : String(duracao),
        views: acharCampo(item, ["views", "viewCount", "view_count"]),
        thumbnail: typeof thumb === "string" ? thumb : undefined,
        publicado: publicado === undefined ? undefined : String(publicado),
        descricao: descricao === undefined ? undefined : String(descricao),
      });
    }
    if (videos.length === 0) {
      throw new OkarunError("Nenhum video encontrado", {
        code: "NOT_FOUND",
        rota: "/api/ytsrc",
      });
    }
    return videos;
  },
  async letra(query) {
    return extrairResultado(await requisitar("/api/letramusic", { query }));
  },
  async pinterest(text) {
    return extrairResultado(await requisitar("/api/pinterest", { text }));
  },
  async google(query) {
    return extrairResultado(await requisitar("/api/googlesrc", { query }));
  },
  async googleImagem(txt) {
    return extrairResultado(await requisitar("/api/gimage", { txt }));
  },
  async playstore(nome) {
    return extrairResultado(await requisitar("/api/playstore", { nome }));
  },
  async happymod(nome) {
    return extrairResultado(await requisitar("/api/happymod", { nome }));
  },
  async amazon(nome) {
    return extrairResultado(await requisitar("/api/amazon", { nome }));
  },
  async mercadolivre(nome) {
    return extrairResultado(await requisitar("/api/mercadolivre", { nome }));
  },
  async horoscopo(signo) {
    return extrairResultado(await requisitar("/api/horoscopo", { signo }));
  },
  async imdb(query) {
    return extrairResultado(await requisitar("/api/search/imdb", { query }));
  },
  async anime(query) {
    return extrairResultado(await requisitar("/api/search/anime", { query }));
  },
  async animeDownload(url) {
    return extrairResultado(await requisitar("/api/anime/download", { url }));
  },
  async animeDetalhes(url) {
    return extrairResultado(
      await requisitar("/api/getdetalhes/anime", { url }),
    );
  },
  async pensador(text) {
    return extrairResultado(
      await requisitar("/api/pesquisa/pensador", { text }),
    );
  },
  async brasileirao() {
    return extrairResultado(await requisitar("/api/brasileirao", {}));
  },
  async noticiasUol() {
    return extrairResultado(await requisitar("/api/noticias/uol", {}));
  },
  async noticiasGlobo() {
    return extrairResultado(await requisitar("/api/noticias/globo", {}));
  },
  async instagramUser(username) {
    return extrairResultado(
      await requisitar("/api/instagram/user", { username }),
    );
  },
  async instagramStories(username) {
    return extrairResultado(
      await requisitar("/api/instagram/stories", { username }),
    );
  },
  async tiktokStalk(username) {
    return extrairResultado(await requisitar("/api/tiktokStalk", { username }));
  },
  async github(usuario) {
    return extrairResultado(
      await requisitar("/api/stalker/github", { usuario }),
    );
  },
  async wattpad(query) {
    return extrairResultado(await requisitar("/api/wattpad", { query }));
  },
  async spotifySearch(query) {
    return extrairResultado(await requisitar("/api/spotify/search", { query }));
  },
  async traduzir(texto, ling = "pt") {
    return extrairResultado(
      await requisitar("/api/info/translate", { texto, ling }),
    );
  },
  async nick(nome) {
    return extrairResultado(await requisitar("/api/fazernick", { nome }));
  },
  async encurtar(url) {
    return extrairResultado(await requisitar("/api/encurtar/shorten", { url }));
  },
};
export const ia = {
  async gpt(query) {
    const envelope = await requisitar("/api/ia/gpt", { query });
    return textoDaIa(envelope);
  },
  async gpt4(query) {
    const envelope = await requisitar("/api/ia/gpt4", { query });
    return textoDaIa(envelope);
  },
  async zerotwo(query) {
    const envelope = await requisitar("/api/ia/zerotwo", { query });
    return textoDaIa(envelope);
  },
  async imagem(query) {
    const envelope = await requisitar("/api/ia/pollinations-image", { query });
    const url = acharUrl(extrairResultado(envelope), ["image", "imagem"]);
    if (!url) {
      throw new OkarunError("A API nao devolveu a imagem", {
        code: "NOT_FOUND",
        rota: "/api/ia/pollinations-image",
      });
    }
    return url;
  },
  async animagine(prompt) {
    const envelope = await requisitar("/api/ia/animagine", { prompt });
    const url = acharUrl(extrairResultado(envelope), ["image", "imagem"]);
    if (!url) {
      throw new OkarunError("A API nao devolveu a imagem", {
        code: "NOT_FOUND",
        rota: "/api/ia/animagine",
      });
    }
    return url;
  },
  async removerFundo(url) {
    const envelope = await requisitar("/api/ia/removebg", { url });
    const link = acharUrl(extrairResultado(envelope));
    if (!link) {
      throw new OkarunError("Nao consegui remover o fundo", {
        code: "NOT_FOUND",
        rota: "/api/ia/removebg",
      });
    }
    return link;
  },
  async paraAnime(url) {
    const envelope = await requisitar("/api/ia/toanime", { url });
    const link = acharUrl(extrairResultado(envelope));
    if (!link) {
      throw new OkarunError("Nao consegui converter", {
        code: "NOT_FOUND",
        rota: "/api/ia/toanime",
      });
    }
    return link;
  },
  async melhorarHd(url) {
    const envelope = await requisitar("/api/ia/tohd", { url });
    const link = acharUrl(extrairResultado(envelope));
    if (!link) {
      throw new OkarunError("Nao consegui melhorar a imagem", {
        code: "NOT_FOUND",
        rota: "/api/ia/tohd",
      });
    }
    return link;
  },
  async tts(text) {
    const envelope = await requisitar("/api/ia/tts", { text });
    const link = acharUrl(extrairResultado(envelope), ["audio"]);
    if (!link) {
      throw new OkarunError("Nao consegui gerar o audio", {
        code: "NOT_FOUND",
        rota: "/api/ia/tts",
      });
    }
    return link;
  },
  async gerarCodigo(prompt, language = "javascript") {
    const envelope = await requisitar("/api/ia/generate-code", {
      prompt,
      language,
    });
    return textoDaIa(envelope);
  },
};
function textoDaIa(envelope) {
  const bruto = extrairResultado(envelope);
  if (typeof bruto === "string") return bruto;
  const texto = acharCampo(bruto, [
    "response",
    "resposta",
    "text",
    "message",
    "answer",
    "content",
    "result",
  ]);
  if (typeof texto === "string" && texto.trim()) return texto;
  return JSON.stringify(bruto).slice(0, 3500);
}
export const logos = {
  async umTexto(rota, texto) {
    const envelope = await requisitar(rota, { texto });
    const url = acharUrl(extrairResultado(envelope), ["imageUrl", "image"]);
    if (!url) {
      throw new OkarunError("A API nao devolveu a imagem da logo", {
        code: "NOT_FOUND",
        rota,
      });
    }
    return url;
  },
  async doisTextos(rota, texto, texto2) {
    const envelope = await requisitar(rota, { texto, texto2 });
    const url = acharUrl(extrairResultado(envelope), ["imageUrl", "image"]);
    if (!url) {
      throw new OkarunError("A API nao devolveu a imagem da logo", {
        code: "NOT_FOUND",
        rota,
      });
    }
    return url;
  },
  async tresTextos(rota, texto, texto2, texto3) {
    const envelope = await requisitar(rota, { texto, texto2, texto3 });
    const url = acharUrl(extrairResultado(envelope), ["imageUrl", "image"]);
    if (!url) {
      throw new OkarunError("A API nao devolveu a imagem da logo", {
        code: "NOT_FOUND",
        rota,
      });
    }
    return url;
  },
  async canvas(rota, link) {
    const envelope = await requisitar(rota, { link });
    const url = acharUrl(extrairResultado(envelope), ["imageUrl", "image"]);
    if (!url) {
      throw new OkarunError("A API nao devolveu a imagem", {
        code: "NOT_FOUND",
        rota,
      });
    }
    return url;
  },
};
async function verificarKeyRemota() {
  if (!botConfig.okarun.apikey || /^(COLE_|SUA_)/.test(botConfig.okarun.apikey)) {
    return { ok: false, motivo: "Nenhuma apikey configurada" };
  }
  try {
    const { status, data } = await http.get("/api/check", {
      params: { apikey: botConfig.okarun.apikey },
    });
    if (status >= 400) return { ok: false, motivo: `HTTP ${status}` };
    if (data && typeof data === "object" && "error" in data && data.error) {
      return { ok: false, motivo: String(data.error) };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      motivo: err instanceof Error ? err.message : String(err),
    };
  }
}
let statusKeyCache = null;
let statusKeyPendente = null;
export async function verificarKey() {
  const identidade = `${botConfig.okarun.baseUrl}:${botConfig.okarun.apikey}`;
  if(statusKeyCache?.identidade===identidade && statusKeyCache.ate>Date.now())return statusKeyCache.valor;
  if(statusKeyPendente?.identidade===identidade)return statusKeyPendente.promessa;
  const promessa=verificarKeyRemota().then(valor=>{
    statusKeyCache={identidade,valor,ate:Date.now()+30000};return valor;
  }).finally(()=>{if(statusKeyPendente?.promessa===promessa)statusKeyPendente=null;});
  statusKeyPendente={identidade,promessa};return promessa;
}
export default {
  requisitar,
  download,
  pesquisa,
  ia,
  logos,
  verificarKey,
  OkarunError,
};
