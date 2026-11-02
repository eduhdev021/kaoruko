import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logSucesso, logErro, logAviso } from '../utils/logger.js';
import { generateMenuCommand } from '../core/menu-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CATEGORIAS = [
  'download',
  'ia',
  'pesquisa',
  'logos',
  'diversao',
  'grupo',
  'dono',
  'info',
];

export const commandRegistry = new Map();

export function getByCategory(category) {
  const cmds = [];
  for (const [name, cmd] of commandRegistry.entries()) {
    if (!cmd.isAlias && cmd.category === category && !name.startsWith('menu') && !cmd.oculto) {
      cmds.push({ name, description: cmd.description });
    }
  }
  return cmds.sort((a, b) => a.name.localeCompare(b.name));
}

export function getCategories() {
  const set = new Set();
  for (const cmd of commandRegistry.values()) {
    if (!cmd.isAlias && !cmd.oculto) set.add(cmd.category);
  }
  return [...set].sort();
}

export function getCommand(name) {
  return commandRegistry.get(String(name).toLowerCase());
}

export function getAllCommands() {
  const vistos = new Set();
  const lista = [];
  for (const cmd of commandRegistry.values()) {
    if (cmd.isAlias || vistos.has(cmd.name)) continue;
    vistos.add(cmd.name);
    lista.push(cmd);
  }
  return lista;
}

export async function loadCommands() {
  commandRegistry.clear();
  let loadedCount = 0;
  let aliasCount = 0;

  try {
    const commandsDir = __dirname;
    const folders = fs
      .readdirSync(commandsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory());

    for (const folder of folders) {
      if (!CATEGORIAS.includes(folder.name)) {
        logAviso(`[registry] Pasta "${folder.name}" nao e categoria valida, ignorando`);
        continue;
      }

      const category = folder.name;
      const folderPath = path.join(commandsDir, folder.name);
      const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'));

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const commandName = file.replace(/\.js$/, '').toLowerCase();

        try {
          const mod = await import(pathToFileURL(filePath).href);

          if (typeof mod.default !== 'function') {
            logAviso(`[registry] ${file} nao exporta default como funcao, ignorado`);
            continue;
          }

          if (commandRegistry.has(commandName)) {
            logAviso(`[registry] "${commandName}" duplicado, mantendo o primeiro`);
            continue;
          }

          const registrado = {
            name: commandName,
            canonicalName: commandName,
            handler: mod.default,
            category,
            description: mod.description ?? '',
            uso: mod.uso ?? '',
            aliases: mod.aliases ?? [],
            isAlias: false,
            soDono: mod.soDono ?? false,
            soAdmin: mod.soAdmin ?? false,
            soGrupo: mod.soGrupo ?? false,
            soPrivado: mod.soPrivado ?? false,
            premium: mod.premium ?? false,
            cooldown: mod.cooldown ?? 0,
            oculto: mod.oculto ?? false,
          };

          commandRegistry.set(commandName, registrado);
          loadedCount += 1;

          for (const alias of registrado.aliases) {
            const chave = String(alias).toLowerCase();
            if (commandRegistry.has(chave)) {
              logAviso(`[registry] alias "${chave}" ja existe, ignorado`);
              continue;
            }
            commandRegistry.set(chave, { ...registrado, name: chave, isAlias: true });
            aliasCount += 1;
          }
        } catch (err) {
          logErro(`Erro ao carregar o comando ${file}: ${err.message}`);
        }
      }

      const menuName = `menu${category.toLowerCase()}`;
      if (!commandRegistry.has(menuName)) {
        commandRegistry.set(menuName, {
          name: menuName,
          handler: generateMenuCommand(category),
          category: 'info',
          description: `Comandos da categoria ${category}`,
          uso: `/${menuName}`,
          aliases: [],
          isAlias: false,
          soDono: false,
          soAdmin: false,
          soGrupo: false,
          soPrivado: false,
          premium: false,
          cooldown: 3,
          oculto: true,
        });
      }
    }

    logSucesso(
      `[ REGISTRY ] ${loadedCount} comandos + ${aliasCount} aliases e submenus gerados automaticamente`
    );
  } catch (err) {
    logErro('Erro ao ler diretorio de comandos:', err);
  }

  return loadedCount;
}
