// Ponto de entrada carregado pelo runtime do Azure Functions (package.json "main").
import { compose } from './composition.js';
import { registerFunctions } from './api/functions.js';

const { config, handlers } = compose();
registerFunctions(handlers, { queueName: config.queueName });
