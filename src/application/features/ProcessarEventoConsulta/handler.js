import { montarNotificacao } from '../../../domain/notificacao.js';

/**
 * Caso de uso (event-driven): consome um evento de agenda e grava a notificação do tutor.
 * Idempotente: o id da notificação é o eventId, então uma mensagem repetida não duplica.
 */
export class ProcessarEventoConsultaHandler {
  constructor({ notificationStore, clock }) {
    this.notificationStore = notificationStore;
    this.clock = clock;
  }

  async execute(event) {
    const notificacao = montarNotificacao(event, this.clock.now());
    if (!notificacao) return { result: 'ignored', type: event.type };
    if (await this.notificationStore.exists(notificacao.id)) return { result: 'duplicate', id: notificacao.id };
    await this.notificationStore.save(notificacao);
    return { result: 'created', notificacao };
  }
}
