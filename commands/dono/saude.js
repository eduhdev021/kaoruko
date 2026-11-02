import { saudeDetalhada } from '../../core/manutencao.js';
export const description='Mostra saude do banco, workers e filas';export const soDono=true;
export default async ctx=>{const s=saudeDetalhada();return ctx.responderComApagar(`Kaoruko ${s.versao}\nBanco: ${s.banco}\nCaptchas: ${s.filas.captchas}\nPublicacoes: ${s.filas.publicacoes}\nLembretes: ${s.filas.lembretes}\nErros de manutencao: ${s.runtime.erros}\nUltimo ciclo: ${s.runtime.ultimoCiclo?new Date(s.runtime.ultimoCiclo).toISOString():'ainda nao executado'}`);};
