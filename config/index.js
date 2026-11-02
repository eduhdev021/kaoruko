import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function lerArquivo() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[config] config.json invalido: ${err.message}`);
    return {};
  }
}

function lista(valor, padrao) {
  if (Array.isArray(valor)) {
    const limpo = valor.map((v) => String(v).trim()).filter(Boolean);
    return limpo.length > 0 ? limpo : padrao;
  }
  if (typeof valor === 'string' && valor.trim()) {
    const limpo = valor
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return limpo.length > 0 ? limpo : padrao;
  }
  return padrao;
}

function booleano(valor, padrao) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  if (typeof valor === 'boolean') return valor;
  return ['true', '1', 'sim', 'yes', 'on'].includes(String(valor).toLowerCase());
}

function inteiro(valor, padrao) {
  const n = typeof valor === 'number' ? valor : Number.parseInt(String(valor ?? ''), 10);
  return Number.isFinite(n) ? n : padrao;
}

const arquivo = lerArquivo();
const env = process.env;
const owners = lista(env.BOT_OWNERS ?? arquivo.owners, []).map(String);

export const botConfig = {
  name: env.BOT_NAME ?? arquivo.name ?? 'Kaoruko Waguri',
  token: env.BOT_TOKEN ?? arquivo.token ?? '',
  prefixes: lista(env.BOT_PREFIX ?? arquivo.prefixes, ['/', '#']).map((p) =>
    p.replace(/^["']|["']$/g, '')
  ),
  owners,
  groupLink: env.GROUP_LINK ?? arquivo.groupLink ?? '',
  timezone: env.BOT_TZ ?? arquivo.timezone ?? 'America/Sao_Paulo',

  okarun: {
    baseUrl: (
      env.OKARUN_BASE_URL ??
      arquivo.okarun?.baseUrl ??
      'https://api.okarunsystem.com.br'
    ).replace(/\/+$/, ''),
    apikey: env.OKARUN_APIKEY ?? arquivo.okarun?.apikey ?? '',
    timeout: inteiro(env.OKARUN_TIMEOUT ?? arquivo.okarun?.timeout, 60000),
  },

  painel: {
    enabled: booleano(env.PAINEL_ENABLED ?? arquivo.painel?.enabled, true),
    port: inteiro(env.PAINEL_PORT ?? arquivo.painel?.port, 4091),
    urlPublica: env.PAINEL_URL ?? arquivo.painel?.urlPublica ?? '',
    adminEmail: env.PAINEL_ADMIN_EMAIL ?? arquivo.painel?.adminEmail ?? '',
    adminSenha: env.PAINEL_ADMIN_SENHA ?? arquivo.painel?.adminSenha ?? '',
    registroAberto: booleano(env.PAINEL_REGISTRO_ABERTO ?? arquivo.painel?.registroAberto, false),
  },

  assets: {
    headerImage:
      env.ASSET_HEADER ?? arquivo.assets?.headerImage ?? 'https://res.cloudinary.com/wagurinuvem/image/upload/v1785035523/waguri/fotomenu_1785035522128_jpg_1785035522132_f4jita.jpg',
    menuImage: env.ASSET_MENU ?? arquivo.assets?.menuImage ?? 'https://res.cloudinary.com/wagurinuvem/image/upload/v1785035523/waguri/fotomenu_1785035522128_jpg_1785035522132_f4jita.jpg',
    errorImage:
      env.ASSET_ERRO ?? arquivo.assets?.errorImage ?? 'https://res.cloudinary.com/wagurinuvem/image/upload/v1785035523/waguri/fotomenu_1785035522128_jpg_1785035522132_f4jita.jpg',
  },

  ehDono(userId) {
    return owners.includes(String(userId));
  },

  validar() {
    const problemas = [];
    if (!botConfig.token || botConfig.token.includes('COLE_')) {
      problemas.push('BOT_TOKEN nao configurado. Pegue com o @BotFather e coloque no .env.');
    }
    if (!botConfig.okarun.apikey || /^(SUA_|COLE_)/.test(botConfig.okarun.apikey)) {
      problemas.push(
        'OKARUN_APIKEY nao configurada. Pegue em https://api.okarunsystem.com.br e coloque no .env.'
      );
    }
    if (botConfig.owners.length === 0 || botConfig.owners.some(id => !/^\d+$/.test(id))) {
      problemas.push('BOT_OWNERS vazio. Comandos de dono ficarao inacessiveis.');
    }
    return problemas;
  },
};

export default botConfig;
