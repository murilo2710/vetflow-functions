import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularIndicadores } from '../../src/domain/indicadores.js';
import { montarNotificacao } from '../../src/domain/notificacao.js';
import { CalcularIndicadoresHandler } from '../../src/application/features/CalcularIndicadores/handler.js';
import { ProcessarEventoConsultaHandler } from '../../src/application/features/ProcessarEventoConsulta/handler.js';
import { ListarNotificacoesHandler } from '../../src/application/features/ListarNotificacoes/handler.js';
import { InMemoryNotificationStore } from '../../src/infrastructure/notifications.js';
import * as ProcessarEndpoint from '../../src/api/features/ProcessarEventoConsulta/endpoint.js';
import * as IndicadoresEndpoint from '../../src/api/features/CalcularIndicadores/endpoint.js';

const now = new Date('2026-11-12T12:00:00Z');
const clock = { now: () => now };
const a = (id, status, priceCents, startsAt, vetName = 'Dra. Carla', serviceName = 'Consulta clínica') =>
  ({ id, status, priceCents, startsAt, vetName, serviceName, petName: `Pet ${id}` });

const appointments = [
  a('1', 'CONFIRMED', 15000, '2026-11-14T10:00:00Z'),
  a('2', 'COMPLETED', 9000, '2026-11-01T10:00:00Z', 'Dr. Paulo', 'Vacinação'),
  a('3', 'SCHEDULED', 6000, '2026-11-13T09:00:00Z', 'Dr. Paulo', 'Retorno'),
  a('4', 'CANCELLED', 15000, '2026-11-13T08:00:00Z')
];

const event = (type, extra = {}) => ({
  eventId: `ev-${type}`, type, version: 1, occurredAt: now.toISOString(),
  data: { appointmentId: 'a1', petName: 'Thor', tutorEmail: 'ana@email.com', vetName: 'Dra. Carla', serviceName: 'Consulta clínica', startsAt: '2026-11-13T17:00:00Z', priceCents: 15000, ...extra }
});

test('indicadores: faturamento só de consultas pagas, ticket médio e taxas', () => {
  const r = calcularIndicadores(appointments, now);
  assert.equal(r.totalConsultas, 4);
  assert.equal(r.faturamentoConfirmadoCents, 24000);
  assert.equal(r.receitaPrevistaCents, 6000);
  assert.equal(r.ticketMedioCents, 12000);
  assert.equal(r.taxaCancelamentoPercent, 25);
  assert.equal(r.taxaConfirmacaoPercent, 50);
  assert.deepEqual(r.porStatus, { SCHEDULED: 1, CONFIRMED: 1, CANCELLED: 1, COMPLETED: 1 });
});

test('indicadores: próxima consulta ignora canceladas e passadas; ranking por veterinário', () => {
  const r = calcularIndicadores(appointments, now);
  assert.equal(r.proximaConsulta.appointmentId, '3');
  assert.deepEqual(r.porVeterinario.map((v) => [v.vetName, v.consultas, v.faturamentoCents]), [['Dr. Paulo', 2, 9000], ['Dra. Carla', 1, 15000]]);
});

test('indicadores: lista vazia não divide por zero e entrada inválida é recusada', async () => {
  const r = calcularIndicadores([], now);
  assert.equal(r.ticketMedioCents, 0);
  assert.equal(r.taxaCancelamentoPercent, 0);
  await assert.rejects(new CalcularIndicadoresHandler({ clock }).execute({ appointments: 'x' }), (e) => e.type === 'validation');
});

test('notificação: mensagem em português com data no fuso de São Paulo e valor em reais', () => {
  const n = montarNotificacao(event('AppointmentBooked'), now);
  assert.equal(n.id, 'ev-AppointmentBooked');
  assert.equal(n.destinatario, 'ana@email.com');
  assert.match(n.mensagem, /13\/11\/2026, 14:00/);
  assert.match(n.mensagem, /R\$\s?150,00/);
  assert.match(montarNotificacao(event('AppointmentCancelled', { cancelReason: 'Viagem' }), now).mensagem, /Motivo: Viagem/);
});

test('notificação: evento fora do contrato é recusado; tipo desconhecido é ignorado', () => {
  assert.throws(() => montarNotificacao({ type: 'AppointmentBooked' }, now), (e) => e.type === 'validation');
  assert.equal(montarNotificacao(event('ServiceCreated'), now), null);
});

test('ProcessarEventoConsulta é idempotente (mesmo eventId não duplica)', async () => {
  const store = new InMemoryNotificationStore();
  const handler = new ProcessarEventoConsultaHandler({ notificationStore: store, clock });
  assert.equal((await handler.execute(event('AppointmentConfirmed'))).result, 'created');
  assert.equal((await handler.execute(event('AppointmentConfirmed'))).result, 'duplicate');
  assert.equal((await handler.execute(event('ServiceCreated'))).result, 'ignored');
  const list = await new ListarNotificacoesHandler({ notificationStore: store }).execute({ tutorEmail: 'ANA@email.com' });
  assert.equal(list.length, 1);
  assert.equal(list[0].titulo, 'Pagamento aprovado');
});

test('Service Bus trigger: descarta mensagem fora do contrato e repropaga erro de infraestrutura', async () => {
  const logs = [];
  const context = { log: (m) => logs.push(m), warn: (m) => logs.push(m) };
  const ok = new ProcessarEventoConsultaHandler({ notificationStore: new InMemoryNotificationStore(), clock });
  await ProcessarEndpoint.messageHandler(ok)(JSON.stringify(event('AppointmentBooked')), context);
  await ProcessarEndpoint.messageHandler(ok)({ type: 'AppointmentBooked' }, context);
  assert.match(logs.join('\n'), /evento processado/);
  assert.match(logs.join('\n'), /fora do contrato/);

  const broken = { execute: async () => { throw new Error('Table Storage fora'); } };
  await assert.rejects(ProcessarEndpoint.messageHandler(broken)(event('AppointmentBooked'), context), /Table Storage/);
});

test('HTTP trigger indicadores: 200 com o cálculo e 400 para JSON inválido', async () => {
  const fn = IndicadoresEndpoint.httpHandler(new CalcularIndicadoresHandler({ clock }));
  const ok = await fn({ json: async () => ({ appointments }) });
  assert.equal(ok.status, 200);
  assert.equal(ok.jsonBody.totalConsultas, 4);
  const bad = await fn({ json: async () => { throw new SyntaxError('x'); } });
  assert.equal(bad.status, 400);
});
