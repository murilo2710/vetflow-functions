import { errorResponse, readJson } from '../../http.js';

const parse = (message) => (typeof message === 'string' ? JSON.parse(message) : message);

/**
 * Service Bus trigger (Message Trigger) na fila vetflow-eventos.
 * Se lançar erro, o Service Bus reentrega a mensagem e, após o limite de tentativas,
 * ela vai para a dead-letter queue. Evento fora do contrato não é reprocessado.
 */
export const messageHandler = (handler) => async (message, context) => {
  let event;
  try {
    event = parse(message);
  } catch {
    context.warn('Mensagem descartada: corpo não é JSON');
    return;
  }
  try {
    const result = await handler.execute(event);
    context.log(JSON.stringify({ msg: 'evento processado', type: event.type, eventId: event.eventId, result: result.result }));
  } catch (err) {
    if (err?.name === 'DomainError') {
      context.warn(`Evento fora do contrato descartado: ${err.message} ${JSON.stringify(err.details ?? {})}`);
      return;
    }
    throw err; // erro de infraestrutura: deixa o Service Bus tentar de novo
  }
};

/** HTTP alternativo (POST /api/eventos): mesmo caso de uso, usado em desenvolvimento local e testes. */
export const httpHandler = (handler) => async (request, context) => {
  try {
    const result = await handler.execute(await readJson(request));
    return { status: result.result === 'created' ? 201 : 200, jsonBody: result };
  } catch (err) {
    return errorResponse(err, context);
  }
};

export function register(app, handler, { queueName }) {
  app.serviceBusQueue('processarEventoConsulta', {
    connection: 'SERVICEBUS_CONNECTION',
    queueName,
    handler: messageHandler(handler)
  });
  app.http('eventos', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'eventos',
    handler: httpHandler(handler)
  });
}
