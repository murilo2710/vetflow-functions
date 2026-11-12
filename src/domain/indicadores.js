// Cálculo dos indicadores da clínica a partir das consultas (regra pura, sem Azure nem HTTP).
import { validation } from './errors.js';

export const MAX_APPOINTMENTS = 2000;
const PAID = ['CONFIRMED', 'COMPLETED'];

const pct = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0);

export function calcularIndicadores(appointments, now) {
  if (!Array.isArray(appointments)) throw validation('Envie { "appointments": [...] }', { appointments: 'Deve ser uma lista' });
  if (appointments.length > MAX_APPOINTMENTS) throw validation(`Máximo de ${MAX_APPOINTMENTS} consultas por cálculo`);

  const porStatus = { SCHEDULED: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 };
  const porVet = new Map();
  const porServico = new Map();
  let faturamentoConfirmadoCents = 0;
  let receitaPrevistaCents = 0;
  let pagas = 0;
  let proxima = null;

  for (const a of appointments) {
    if (!a || typeof a !== 'object') continue;
    if (a.status in porStatus) porStatus[a.status] += 1;
    const price = Number.isInteger(a.priceCents) ? a.priceCents : 0;
    if (PAID.includes(a.status)) { faturamentoConfirmadoCents += price; pagas += 1; }
    if (a.status === 'SCHEDULED') receitaPrevistaCents += price;

    if (a.status !== 'CANCELLED') {
      const vet = porVet.get(a.vetName) ?? { vetName: a.vetName, consultas: 0, faturamentoCents: 0 };
      vet.consultas += 1;
      if (PAID.includes(a.status)) vet.faturamentoCents += price;
      porVet.set(a.vetName, vet);
      porServico.set(a.serviceName, (porServico.get(a.serviceName) ?? 0) + 1);
    }

    const start = new Date(a.startsAt);
    if (['SCHEDULED', 'CONFIRMED'].includes(a.status) && start > now && (!proxima || start < new Date(proxima.startsAt))) {
      proxima = { appointmentId: a.id, petName: a.petName, vetName: a.vetName, serviceName: a.serviceName, startsAt: a.startsAt, status: a.status };
    }
  }

  const total = appointments.length;
  return {
    totalConsultas: total,
    porStatus,
    faturamentoConfirmadoCents,
    receitaPrevistaCents,
    ticketMedioCents: pagas ? Math.round(faturamentoConfirmadoCents / pagas) : 0,
    taxaCancelamentoPercent: pct(porStatus.CANCELLED, total),
    taxaConfirmacaoPercent: pct(porStatus.CONFIRMED + porStatus.COMPLETED, total),
    proximaConsulta: proxima,
    porVeterinario: [...porVet.values()].sort((a, b) => b.consultas - a.consultas),
    porServico: [...porServico.entries()].map(([serviceName, quantidade]) => ({ serviceName, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    calculadoEm: now.toISOString()
  };
}
