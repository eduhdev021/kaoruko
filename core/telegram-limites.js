const esperar=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Limites conservadores locais. Nao intercepta getUpdates: polling nunca bloqueia envios.
export function instalarLimitesTelegram(telegram,{pausa=esperar,agora=Date.now,intervaloChat=1100,intervaloGlobal=40}={}) {
  const original=telegram.callApi.bind(telegram);let proximo=0,paradoAte=0,pendentes=0;
  const chats=new Map();
  telegram.callApi=async (method,payload={},...args)=>{
    if(!/^(send|copy|forward|deleteMessage|editMessage|restrict|ban|unban)/.test(method))return original(method,payload,...args);
    if(pendentes>=500)throw new Error('Fila Telegram cheia; tente novamente depois');
    pendentes++;
    try {
      for(let tentativa=0;tentativa<3;tentativa++) {
        const chave=String(payload.chat_id??'global');
        const now=agora();
        const quando=Math.max(now,proximo,paradoAte,chats.get(chave)||0);
        proximo=quando+intervaloGlobal;chats.set(chave,quando+intervaloChat);
        if(chats.size>10000)for(const [k,v]of chats)if(v<now)chats.delete(k);
        if(quando>now)await pausa(quando-now);
        try{return await original(method,payload,...args);}
        catch(err){
          if(err.response?.error_code!==429||tentativa===2)throw err;
          const atraso=Math.max(1,Number(err.response?.parameters?.retry_after)||1)*1000;
          paradoAte=Math.max(paradoAte,agora()+atraso);
        }
      }
    } finally {pendentes--;}
  };
  return ()=>({pendentes,chats:chats.size});
}
