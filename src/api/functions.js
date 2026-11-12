import { app } from '@azure/functions';
import * as CalcularIndicadores from './features/CalcularIndicadores/endpoint.js';
import * as ListarNotificacoes from './features/ListarNotificacoes/endpoint.js';
import * as ProcessarEventoConsulta from './features/ProcessarEventoConsulta/endpoint.js';

/** Registra os gatilhos no runtime do Azure Functions (modelo de programação v4 do Node.js). */
export function registerFunctions(handlers, { queueName }) {
  CalcularIndicadores.register(app, handlers.calcularIndicadores);
  ListarNotificacoes.register(app, handlers.listarNotificacoes);
  ProcessarEventoConsulta.register(app, handlers.processarEventoConsulta, { queueName });
  app.http('health', {
    methods: ['GET'], authLevel: 'anonymous', route: 'health',
    handler: async () => ({ jsonBody: { status: 'ok', service: 'vetflow-functions' } })
  });
}
