import { errorResponse, readJson } from '../../http.js';

/** HTTP trigger: POST /api/indicadores  body: { "appointments": [...] } */
export const httpHandler = (handler) => async (request, context) => {
  try {
    const body = await readJson(request);
    return { status: 200, jsonBody: await handler.execute({ appointments: body?.appointments }) };
  } catch (err) {
    return errorResponse(err, context);
  }
};

export function register(app, handler) {
  app.http('indicadores', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'indicadores',
    handler: httpHandler(handler)
  });
}
