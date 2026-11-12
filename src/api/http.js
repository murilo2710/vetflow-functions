// Tradução de erros de negócio para respostas HTTP das Functions.
const STATUS_BY_TYPE = { validation: 400, not_found: 404, conflict: 409 };

export function errorResponse(err, context) {
  if (err?.name === 'DomainError' && STATUS_BY_TYPE[err.type]) {
    return { status: STATUS_BY_TYPE[err.type], jsonBody: { error: { code: err.type, message: err.message, details: err.details } } };
  }
  context?.error?.(err);
  return { status: 500, jsonBody: { error: { code: 'internal_error', message: 'Erro interno na Function' } } };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    const err = new Error('JSON inválido no corpo da requisição');
    err.name = 'DomainError';
    err.type = 'validation';
    throw err;
  }
}
