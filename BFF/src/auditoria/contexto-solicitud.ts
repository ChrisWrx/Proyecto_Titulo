import { AsyncLocalStorage } from 'async_hooks';

export interface ContextoSolicitud {
  ip: string | null;
}

// Guarda la IP del cliente durante la solicitud para que la auditoría la adjunte sin pasarla por cada llamada.
export const contextoSolicitud = new AsyncLocalStorage<ContextoSolicitud>();

export function normalizarIp(ip?: string | null): string | null {
  if (!ip) return null;
  const limpia = ip.replace(/^::ffff:/, '').trim();
  return limpia ? limpia.slice(0, 45) : null;
}
