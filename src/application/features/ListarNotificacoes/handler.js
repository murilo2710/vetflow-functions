/** Caso de uso: últimas notificações geradas pelos eventos (opcionalmente de um tutor). */
export class ListarNotificacoesHandler {
  constructor({ notificationStore }) {
    this.notificationStore = notificationStore;
  }

  async execute({ limit, tutorEmail } = {}) {
    const n = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const email = tutorEmail ? String(tutorEmail).trim().toLowerCase() : undefined;
    return this.notificationStore.list({ limit: n, destinatario: email });
  }
}
