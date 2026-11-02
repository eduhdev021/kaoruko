import botConfig from '../../config/index.js';
import {
  criarConta,
  definirSenha,
  vincularTelegram,
  listarContas,
  excluirConta,
  emailValido,
} from '../../core/auth.js';
import { escapeHtml } from '../../utils/helpers.js';

export const description = 'Gerencia as contas de acesso ao painel web';
export const aliases = ['contas', 'painelconta'];
export const uso = '/conta criar email@x.com senha123';
export const soDono = true;
export const soPrivado = true;

function ajuda(ctx) {
  return ctx.responderComApagar(
    [
      '<b>CONTAS DO PAINEL</b>',
      '',
      `<code>${ctx.prefix}conta listar</code>`,
      `<code>${ctx.prefix}conta criar email senha [id_telegram]</code>`,
      `<code>${ctx.prefix}conta senha email novaSenha</code>`,
      `<code>${ctx.prefix}conta vincular email id_telegram</code>`,
      `<code>${ctx.prefix}conta excluir email</code>`,
      '',
      `<b>Site:</b> ${escapeHtml(botConfig.painel.urlPublica || `http://localhost:${botConfig.painel.port}`)}`,
    ].join('\n')
  );
}

export default async function conta(ctx) {
  const acao = (ctx.args[0] ?? '').toLowerCase();
  const a1 = ctx.args[1] ?? '';
  const a2 = ctx.args[2] ?? '';
  const a3 = ctx.args[3] ?? '';

  if (!acao) return ajuda(ctx);

  if (acao === 'listar') {
    const contas = listarContas();
    if (contas.length === 0) {
      return ctx.responderComApagar('Nenhuma conta criada ainda.');
    }

    const linhas = [`<b>CONTAS DO PAINEL (${contas.length})</b>`, ''];
    contas.forEach((c, i) => {
      const login = c.ultimo_login
        ? new Date(c.ultimo_login).toLocaleDateString('pt-BR', { timeZone: botConfig.timezone })
        : 'nunca';
      linhas.push(
        `${i + 1}. <b>${escapeHtml(c.nome || c.email)}</b>\n` +
          ` <code>${escapeHtml(c.email)}</code>\n` +
          `${c.papel} · tg: ${c.telegram_id ?? 'nao vinculado'} · login: ${login}`
      );
    });
    return ctx.responderComApagar(linhas.join('\n'));
  }

  if (acao === 'criar') {
    if (!emailValido(a1) || !a2) {
      return ctx.uso(`${ctx.prefix}conta criar pessoa@email.com senhaSegura123 123456789`);
    }
    const r = criarConta({ email: a1, senha: a2, nome: a1.split('@')[0], papel: 'membro' });
    if (!r.ok) return ctx.erro(r.motivo);
    if (a3 && /^\d+$/.test(a3)) vincularTelegram(a1, a3);

    return ctx.responderComApagar(
      `<b>Conta criada</b>\n\n<b>E-mail:</b> <code>${escapeHtml(a1)}</code>\n` +
        `<b>Telegram:</b> ${a3 || 'nao vinculado'}\n\n` +
        `Acesse: ${escapeHtml(botConfig.painel.urlPublica || `http://localhost:${botConfig.painel.port}`)}`
    );
  }

  if (acao === 'senha') {
    if (!emailValido(a1) || !a2) {
      return ctx.uso(`${ctx.prefix}conta senha pessoa@email.com novaSenha123`);
    }
    const r = definirSenha(a1, a2);
    if (!r.ok) return ctx.erro(r.motivo);
    return ctx.responderComApagar(
      `Senha de <code>${escapeHtml(a1)}</code> trocada. As sessoes foram encerradas.`
    );
  }

  if (acao === 'vincular') {
    if (!emailValido(a1) || !/^\d+$/.test(a2)) {
      return ctx.uso(`${ctx.prefix}conta vincular pessoa@email.com 123456789`);
    }
    const r = vincularTelegram(a1, a2);
    if (!r.ok) return ctx.erro(r.motivo);
    return ctx.responderComApagar(
      `<code>${escapeHtml(a1)}</code> agora esta ligado ao Telegram <code>${escapeHtml(a2)}</code>.`
    );
  }

  if (acao === 'excluir') {
    if (!emailValido(a1)) return ctx.uso(`${ctx.prefix}conta excluir pessoa@email.com`);
    const ok = excluirConta(a1);
    return ok
      ? ctx.responderComApagar(`Conta <code>${escapeHtml(a1)}</code> excluida.`)
      : ctx.erro('Conta nao encontrada.');
  }

  return ajuda(ctx);
}
