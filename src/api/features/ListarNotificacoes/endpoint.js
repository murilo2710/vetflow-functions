import { errorResponse } from '../../http.js';

/** HTTP trigger: GET /api/notificacoes?limit=&tutorEmail= */
export const httpHandler = (handler) => async (request, context) => {
  try {
    const items = await handler.execute({ limit: request.query.get('limit'), tutorEmail: request.query.get('tutorEmail') });
    return { status: 200, jsonBody: items };
  } catch (err) {
    return errorResponse(err, context);
  }
};

export function register(app, handler) {
  app.http('notificacoes', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'notificacoes',
    handler: httpHandler(handler)
  });
}
