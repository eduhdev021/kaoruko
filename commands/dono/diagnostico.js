import { db } from '../../core/db.js';
import { getAllCommands } from '../registry.js';
import { tamanhoLegivel, escapeHtml, tempoLegivel } from '../../utils/helpers.js';
export const description = 'Diagnostico local de banco, memoria e tarefas pendentes';
export const soDono = true;
export const uso = '/diagnostico';
export default async function diagnostico(ctx) {
  const integridade = db.pragma('quick_check', {simple: true});
  const pendentes = db.prepare('SELECT count(*) n FROM lembretes').get().n;
  return ctx.responderComApagar([
    '<b>DIAGNOSTICO</b>',
    `Versao: 5.0.0 · Node ${escapeHtml(process.version)}`,
    `Online: ${tempoLegivel(process.uptime())}`,
    `Memoria do processo: ${tamanhoLegivel(process.memoryUsage().rss)}`,
    `SQLite: ${escapeHtml(String(integridade))}`,
    `Comandos: ${getAllCommands().length}`,
    `Lembretes pendentes: ${pendentes}`,
    'Este diagnostico nao testa a conexao com servicos externos.',
  ].join('\n'));
}
