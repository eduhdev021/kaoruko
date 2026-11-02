export const LIMITE_TEXTO = 4096;
export const LIMITE_LEGENDA = 1024;
export function escapeHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function cortar(texto, limite = LIMITE_LEGENDA) {
  const str = String(texto ?? '');
  return str.length <= limite ? str : `${str.slice(0, limite - 3)}...`;
}
export function fatiar(texto, tamanho = LIMITE_TEXTO) {
  if (texto.length <= tamanho) return [texto];
  const partes = [];
  for (let i = 0; i < texto.length; i += tamanho) {
    partes.push(texto.slice(i, i + tamanho));
  }
  return partes;
}
export function numeroCurto(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return String(valor ?? '—');
  if (n < 1000) return String(n);
  const unidades = [
    { limite: 1e12, sufixo: 'T' },
    { limite: 1e9, sufixo: 'B' },
    { limite: 1e6, sufixo: 'M' },
    { limite: 1e3, sufixo: 'K' },
  ];
  for (const { limite, sufixo } of unidades) {
    if (n >= limite) {
      return `${(n / limite).toFixed(1).replace('.0', '').replace('.', ',')}${sufixo}`;
    }
  }
  return String(n);
}
export function tamanhoLegivel(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), unidades.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
}
export function tempoLegivel(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const pad = (v) => String(v).padStart(2, '0');
  if (h > 0) return `${pad(h)}h ${pad(m)}m ${pad(seg)}s`;
  if (m > 0) return `${pad(m)}m ${pad(seg)}s`;
  return `${seg}s`;
}
export function barraProgresso(posicao = 0, largura = 18) {
  const p = Math.min(Math.max(posicao, 0), 1);
  const i = Math.round(p * (largura - 1));
  return '━'.repeat(i) + '' + '─'.repeat(largura - i - 1);
}
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export function aleatorio(lista) {
  if (lista.length === 0) return undefined;
  return lista[Math.floor(Math.random() * lista.length)];
}
export function inteiroAleatorio(max) {
  return Math.floor(Math.random() * max);
}
export function toUnicodeBoldUpper(texto) {
  const BASE_MAIUSCULA = 0x1d5d4;
  const BASE_NUMERO = 0x1d7ec;
  return [...texto.toUpperCase()]
    .map((char) => {
      const cod = char.codePointAt(0);
      if (cod === undefined) return char;
      if (cod >= 65 && cod <= 90) {
        return String.fromCodePoint(BASE_MAIUSCULA + (cod - 65));
      }
      if (cod >= 48 && cod <= 57) {
        return String.fromCodePoint(BASE_NUMERO + (cod - 48));
      }
      return char;
    })
    .join('');
}
export function urlHttpValida(valor) {
  if(typeof valor!=='string'||valor.length>8000||/[\s<>"']/.test(valor))return false;
  try {
    const u=new URL(valor),h=u.hostname.toLowerCase();
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return false;
    if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.includes(':')||/^127\.|^10\.|^192\.168\.|^169\.254\.|^0\.|^172\.(1[6-9]|2\d|3[01])\./.test(h))return false;
    return Boolean(h.includes('.'));
  }catch{return false;}
}
const deDominio=(valor,dominios)=>{
  if(!urlHttpValida(valor))return false;
  const h=new URL(valor).hostname.toLowerCase();
  return dominios.some(d=>h===d||h.endsWith('.'+d));
};
export const links = {
  instagram: u=>deDominio(u,['instagram.com','instagr.am']),
  youtube: u=>deDominio(u,['youtube.com','youtu.be']),
  tiktok: u=>deDominio(u,['tiktok.com']),
  pinterest: u=>deDominio(u,['pinterest.com','pinterest.com.br','pinterest.pt','pinterest.co.uk','pinterest.es','pinterest.fr','pinterest.de','pin.it']),
  mediafire: u=>deDominio(u,['mediafire.com']),
  kwai: u=>deDominio(u,['kwai.com','kwai-video.com','kw.ai']),
  twitter: u=>deDominio(u,['twitter.com','x.com']),
  spotify: u=>deDominio(u,['spotify.com']),
  qualquer: urlHttpValida,
};
export function extrairUrl(texto) {
  const achado = texto.match(/https?:\/\/[^\s<>"']+/i);
  return achado ? achado[0] : '';
}
export function similaridade(a, b) {
  const normalizar = (s) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const x = normalizar(a);
  const y = normalizar(b);
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const bigramas = (s) => {
    const lista = [];
    for (let i = 0; i < s.length - 1; i += 1) lista.push(s.slice(i, i + 2));
    return lista;
  };
  const bx = bigramas(x);
  const restantes = bigramas(y);
  let comuns = 0;
  for (const bg of bx) {
    const idx = restantes.indexOf(bg);
    if (idx !== -1) {
      comuns += 1;
      restantes.splice(idx, 1);
    }
  }
  return (2 * comuns) / (bx.length + bigramas(y).length);
}
export function ehUrlHttp(valor) {
  return typeof valor === 'string' && /^https?:\/\//i.test(valor);
}
