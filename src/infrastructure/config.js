// Configuração da Function App (Application Settings no Azure, local.settings.json localmente).
export function loadConfig(env = process.env) {
  const storage = env.AzureWebJobsStorage || '';
  const useTable = env.NOTIFICATIONS_STORE !== 'memory' && storage && storage !== 'UseDevelopmentStorage=true';
  return {
    storageConnection: storage,
    notificationsStore: useTable ? 'table' : 'memory',
    tableName: env.NOTIFICATIONS_TABLE || 'notificacoes',
    queueName: env.SERVICEBUS_QUEUE || 'vetflow-eventos'
  };
}

export const systemClock = { now: () => new Date() };
