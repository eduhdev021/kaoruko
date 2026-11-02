import type {ApiMethods,Opts} from '@grammyjs/types';
export type MetodoTelegram=keyof ApiMethods<unknown>;
export interface AdaptadorTelegram{callApi(metodo:string,params:unknown):Promise<unknown>;}
export interface ClienteBotApi{
 call<M extends MetodoTelegram>(metodo:M,params:Opts<unknown>[M]):Promise<ReturnType<ApiMethods<unknown>[M]>>;
}
export function criarClienteBotApi(telegram:AdaptadorTelegram):ClienteBotApi;
export function metodosDisponiveis():MetodoTelegram[];
