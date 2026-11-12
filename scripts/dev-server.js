// Servidor HTTP de desenvolvimento: expõe os MESMOS handlers das Functions sem precisar do
// Azure Functions Core Tools (útil para testar o BFF localmente). Não é usado no Azure.
// Uso: node scripts/dev-server.js   (porta 7071, mesmas rotas /api/*)
import http from 'node:http';
import { compose } from '../src/composition.js';
import * as CalcularIndicadores from '../src/api/features/CalcularIndicadores/endpoint.js';
import * as ListarNotificacoes from '../src/api/features/ListarNotificacoes/endpoint.js';
import * as ProcessarEventoConsulta from '../src/api/features/ProcessarEventoConsulta/endpoint.js';

const { handlers } = compose({ ...process.env, NOTIFICATIONS_STORE: 'memory' });
const routes = {
  'POST /api/indicadores': CalcularIndicadores.httpHandler(handlers.calcularIndicadores),
  'GET /api/notificacoes': ListarNotificacoes.httpHandler(handlers.listarNotificacoes),
  'POST /api/eventos': ProcessarEventoConsulta.httpHandler(handlers.processarEventoConsulta),
  'GET /api/health': async () => ({ jsonBody: { status: 'ok', service: 'vetflow-functions (dev)' } })
};
const context = { log: console.log, warn: console.warn, error: console.error };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = routes[`${req.method} ${url.pathname}`];
  if (!route) { res.writeHead(404).end(); return; }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const request = { query: url.searchParams, json: async () => JSON.parse(raw || 'null') };
  const out = await route(request, context);
  res.writeHead(out.status ?? 200, { 'content-type': 'application/json' }).end(JSON.stringify(out.jsonBody ?? null));
}).listen(Number(process.env.PORT || 7071), () => console.log(`[functions-dev] http://localhost:${process.env.PORT || 7071}/api`));
