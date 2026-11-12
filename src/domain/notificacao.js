// Transforma um evento de agenda na notificação que o tutor recebe (regra pura).
import { validation } from './errors.js';

const formatarData = (iso) => new Date(iso).toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});
const reais = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MODELOS = {
  AppointmentBooked: (d) => ({
    titulo: 'Consulta agendada',
    mensagem: `${d.serviceName} de ${d.petName} com ${d.vetName} em ${formatarData(d.startsAt)}. ` +
      `Pague ${reais(d.priceCents)} via Pix para confirmar o horário.`
  }),
  AppointmentRescheduled: (d) => ({
    titulo: 'Consulta reagendada',
    mensagem: `A consulta de ${d.petName} foi remarcada para ${formatarData(d.startsAt)} com ${d.vetName}.`
  }),
  AppointmentConfirmed: (d) => ({
    titulo: 'Pagamento aprovado',
    mensagem: `Consulta de ${d.petName} confirmada para ${formatarData(d.startsAt)}. Até lá!`
  }),
  AppointmentCancelled: (d) => ({
    titulo: 'Consulta cancelada',
    mensagem: `A consulta de ${d.petName} em ${formatarData(d.startsAt)} foi cancelada. Motivo: ${d.cancelReason ?? 'não informado'}.`
  })
};

export const TIPOS_SUPORTADOS = Object.freeze(Object.keys(MODELOS));

/** Valida o envelope do evento (contrato AsyncAPI do ms-appointments). */
export function validarEvento(event) {
  const errors = {};
  if (!event || typeof event !== 'object') throw validation('Evento inválido');
  if (typeof event.eventId !== 'string' || !event.eventId) errors.eventId = 'eventId obrigatório';
  if (typeof event.type !== 'string') errors.type = 'type obrigatório';
  if (!event.data || typeof event.data !== 'object') errors.data = 'data obrigatório';
  else {
    if (!event.data.appointmentId) errors['data.appointmentId'] = 'appointmentId obrigatório';
    if (!event.data.tutorEmail) errors['data.tutorEmail'] = 'tutorEmail obrigatório';
    if (Number.isNaN(new Date(event.data.startsAt).getTime())) errors['data.startsAt'] = 'startsAt inválido';
  }
  if (Object.keys(errors).length) throw validation('Evento fora do contrato', errors);
}

/** Devolve a notificação do evento, ou null se o tipo não gera notificação. */
export function montarNotificacao(event, now) {
  validarEvento(event);
  const modelo = MODELOS[event.type];
  if (!modelo) return null;
  const { titulo, mensagem } = modelo(event.data);
  return {
    id: event.eventId,                     // mesmo id do evento: reprocessar não duplica
    tipo: event.type,
    appointmentId: event.data.appointmentId,
    petName: event.data.petName,
    destinatario: event.data.tutorEmail,
    canal: 'EMAIL',
    status: 'SIMULATED',                   // envio real ficaria com o Azure Communication Services
    titulo,
    mensagem,
    eventoOcorridoEm: event.occurredAt ?? null,
    criadaEm: now.toISOString()
  };
}
