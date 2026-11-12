// Composition root: cria as implementações concretas e os casos de uso.
import { loadConfig, systemClock } from './infrastructure/config.js';
import { TableNotificationStore, InMemoryNotificationStore } from './infrastructure/notifications.js';
import { CalcularIndicadoresHandler } from './application/features/CalcularIndicadores/handler.js';
import { ProcessarEventoConsultaHandler } from './application/features/ProcessarEventoConsulta/handler.js';
import { ListarNotificacoesHandler } from './application/features/ListarNotificacoes/handler.js';

export function compose(env = process.env) {
  const config = loadConfig(env);
  const notificationStore = config.notificationsStore === 'table'
    ? new TableNotificationStore(config.storageConnection, config.tableName)
    : new InMemoryNotificationStore();
  const deps = { notificationStore, clock: systemClock };
  return {
    config,
    handlers: {
      calcularIndicadores: new CalcularIndicadoresHandler(deps),
      processarEventoConsulta: new ProcessarEventoConsultaHandler(deps),
      listarNotificacoes: new ListarNotificacoesHandler(deps)
    }
  };
}
