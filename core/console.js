import { exec } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registrarLog } from "./logs.js";
import { logAviso } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAIZ = path.join(__dirname, "..");
const TIMEOUT = 20000;
const MAX_SAIDA = 100 * 1024;

const PERIGOSOS = [
  {
    re: /\brm\s+(-[a-z]*\s+)*(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)/i,
    motivo: "rm recursivo forcado",
  },
  { re: /\brm\s+.*(^|\s)\/(\s|$)/i, motivo: "rm na raiz" },
  { re: /\b(mkfs|fdisk|parted|blkid)\b/i, motivo: "mexe em particao de disco" },
  { re: /\bdd\s+.*of=\s*\/dev\//i, motivo: "escrita direta em disco" },
  {
    re: /\b(shutdown|reboot|halt|poweroff|init\s+0|init\s+6)\b/i,
    motivo: "desliga a maquina",
  },
  {
    re: /\b(userdel|usermod|passwd|chpasswd|adduser|useradd)\b/i,
    motivo: "mexe em usuario do sistema",
  },
  {
    re: /\bchmod\s+(-[a-z]*\s+)*777\s+\/(\s|$)/i,
    motivo: "permissao total na raiz",
  },
  { re: /\bchown\s+.*\s\/(\s|$)/i, motivo: "dono da raiz" },
  { re: />\s*\/dev\/(sd|nvme|hd)/i, motivo: "escreve em dispositivo" },
  { re: /:\(\)\s*\{.*\}\s*;\s*:/, motivo: "fork bomb" },
  { re: /\bcrontab\b/i, motivo: "agenda tarefa persistente" },
  { re: /\b(iptables|ufw|firewall-cmd)\b/i, motivo: "mexe no firewall" },
  { re: /\b(curl|wget)\b.*\|\s*(ba)?sh/i, motivo: "baixa e executa script" },
  { re: /\bhistory\s+-c/i, motivo: "apaga o historico" },
  {
    re: /\/etc\/(passwd|shadow|sudoers)/i,
    motivo: "arquivo sensivel do sistema",
  },
  { re: /\bsudo\b/i, motivo: "elevacao de privilegio" },
  { re: /\bsu\s+(-|root)/i, motivo: "troca de usuario" },
  { re: /\bkill(all)?\s+(-9\s+)?1\b/i, motivo: "mata o init" },
  { re: /\.env\b/i, motivo: "expoe o token e as credenciais" },
];

const ATALHOS = {
  logs: 'tail -n 40 *.log 2>/dev/null || echo "sem arquivo de log"',
  espaco: "df -h .",
  memoria: "free -h",
  uptime: "uptime",
  versao: "node -v && npm -v",
  banco: "ls -lh database/",
  processos: "ps aux --sort=-%mem | head -12",
  arquivos: "ls -la",
};

export function analisar(comando) {
  const limpo = String(comando ?? "").trim();

  if (!limpo) return { ok: false, motivo: "Comando vazio" };
  // A blacklist antiga nao era uma barreira de seguranca: aceita somente atalhos fixos.
  if (!Object.values(ATALHOS).includes(limpo)) return {ok:false,motivo:"Console restrito aos atalhos de diagnostico. Shell arbitrario desativado."};
  if (limpo.length > 500) return { ok: false, motivo: "Comando longo demais" };

  for (const { re, motivo } of PERIGOSOS) {
    if (re.test(limpo)) return { ok: false, motivo: `Bloqueado: ${motivo}` };
  }
  return { ok: true, comando: limpo };
}

export function executar(comandoBruto, usuario) {
  return new Promise((resolve) => {
    const atalho =
      ATALHOS[
        String(comandoBruto ?? "")
          .trim()
          .toLowerCase()
      ];
    const alvo = atalho ?? comandoBruto;
    const analise = analisar(alvo);

    if (!analise.ok) {
      registrarLog({
        nivel: "negado",
        comando: "console",
        argumento: String(comandoBruto).slice(0, 200),
        userId: String(usuario?.id ?? ""),
        nome: usuario?.email ?? "",
        erro: analise.motivo,
      });

      logAviso(`[console] bloqueado por ${usuario?.email}: ${comandoBruto}`);
      resolve({ ok: false, erro: analise.motivo, bloqueado: true });
      return;
    }

    const inicio = Date.now();

    exec(
      analise.comando,
      {
        cwd: RAIZ,
        timeout: TIMEOUT,
        maxBuffer: MAX_SAIDA,
        env: {
          ...process.env,
          BOT_TOKEN: "",
          OKARUN_APIKEY: "",
          PAINEL_ADMIN_SENHA: "",
        },
        shell: "/bin/bash",
      },
      (err, stdout, stderr) => {
        const duracao = Date.now() - inicio;
        const saida = String(stdout ?? "").slice(0, MAX_SAIDA);
        const erro = String(stderr ?? "").slice(0, MAX_SAIDA);

        registrarLog({
          nivel: err ? "erro" : "ok",
          comando: "console",
          argumento: analise.comando.slice(0, 200),
          userId: String(usuario?.id ?? ""),
          nome: usuario?.email ?? "",
          duracao,
          erro: err ? (err.message ?? "").slice(0, 300) : "",
        });

        resolve({
          ok: !err,
          comando: analise.comando,
          saida,
          erro,
          codigo: err?.code ?? 0,
          duracao,
          expirou: err?.killed === true,
        });
      },
    );
  });
}

export const atalhos = Object.keys(ATALHOS);
