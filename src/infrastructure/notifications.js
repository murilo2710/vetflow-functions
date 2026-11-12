import { TableClient } from '@azure/data-tables';

const PARTITION = 'notificacao';

/**
 * Adaptador da porta NotificationStore no Azure Table Storage, usando a própria
 * conta de armazenamento da Function App (AzureWebJobsStorage). RowKey = eventId.
 */
export class TableNotificationStore {
  constructor(connectionString, tableName = 'notificacoes') {
    this.client = TableClient.fromConnectionString(connectionString, tableName);
    this.ready = this.client.createTable().catch((err) => {
      if (err.statusCode !== 409) throw err; // 409 = tabela já existe
    });
  }

  async exists(id) {
    await this.ready;
    try {
      await this.client.getEntity(PARTITION, id);
      return true;
    } catch (err) {
      if (err.statusCode === 404) return false;
      throw err;
    }
  }

  async save(notificacao) {
    await this.ready;
    const { id, ...rest } = notificacao;
    const props = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null && v !== undefined));
    await this.client.upsertEntity({ partitionKey: PARTITION, rowKey: id, ...props }, 'Replace');
  }

  async list({ limit, destinatario }) {
    await this.ready;
    const items = [];
    const filter = destinatario ? `PartitionKey eq '${PARTITION}' and destinatario eq '${destinatario.replace(/'/g, "''")}'` : `PartitionKey eq '${PARTITION}'`;
    for await (const e of this.client.listEntities({ queryOptions: { filter } })) {
      const { partitionKey, rowKey, etag, timestamp, ...rest } = e;
      items.push({ id: rowKey, ...rest });
    }
    return items.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)).slice(0, limit);
  }
}

/** Adaptador em memória (desenvolvimento local e testes). */
export class InMemoryNotificationStore {
  constructor() {
    this.items = new Map();
  }

  async exists(id) { return this.items.has(id); }

  async save(notificacao) { this.items.set(notificacao.id, structuredClone(notificacao)); }

  async list({ limit, destinatario }) {
    return [...this.items.values()]
      .filter((n) => !destinatario || n.destinatario === destinatario)
      .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
      .slice(0, limit)
      .map((n) => structuredClone(n));
  }
}
