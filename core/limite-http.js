// Memoria limitada e janela fixa. Nao confia em cabecalhos de proxy do cliente.
export function limitarHttp({ max = 20, janelaMs = 900000, maxChaves = 10000, agora = Date.now } = {}) {
  const acessos = new Map();
  return (req, res, next) => {
    const tempo = agora();
    const chave = req.ip || req.socket.remoteAddress || 'desconhecido';
    let item = acessos.get(chave);
    if (!item || item.ate <= tempo) {
      if (acessos.size >= maxChaves) {
        for (const [key, valor] of acessos) if (valor.ate <= tempo) acessos.delete(key);
        if (acessos.size >= maxChaves) {
          res.setHeader('Retry-After', String(Math.ceil(janelaMs / 1000)));
          return res.status(429).json({erro: 'Limite temporario de requisicoes. Tente mais tarde.'});
        }
      }
      item = {total: 0, ate: tempo + janelaMs};
      acessos.set(chave, item);
    }
    item.total++;
    if (item.total > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((item.ate - tempo) / 1000))));
      return res.status(429).json({erro: 'Muitas tentativas. Aguarde antes de tentar novamente.'});
    }
    next();
  };
}
