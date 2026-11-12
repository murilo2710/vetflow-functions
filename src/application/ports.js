// Portas usadas pelos casos de uso da Function (implementadas em src/infrastructure).

/**
 * @typedef {Object} NotificationStore
 * @property {(id: string) => Promise<boolean>} exists
 * @property {(notificacao: object) => Promise<void>} save
 * @property {(filter: { limit: number, destinatario?: string }) => Promise<object[]>} list  Mais recentes primeiro
 */

/** @typedef {{ now: () => Date }} Clock */

export const PORTS = Object.freeze(['notificationStore', 'clock']);
