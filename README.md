# VetFlow · Azure Functions (Serverless)

Parte serverless do VetFlow, com o modelo de programação **v4 do Node.js**:

| Function | Gatilho | O que faz |
|---|---|---|
| `indicadores` | **HTTP trigger** `POST /api/indicadores` | Recebe as consultas (enviadas pelo BFF) e **calcula** faturamento confirmado, receita prevista, ticket médio, taxas de confirmação e cancelamento, próxima consulta e ranking por veterinário. |
| `processarEventoConsulta` | **Service Bus trigger** (Message Trigger) na fila `vetflow-eventos` | Consome os eventos do ms-appointments e grava a **notificação** do tutor no Azure Table Storage. Idempotente pelo `eventId`. |
| `notificacoes` | HTTP trigger `GET /api/notificacoes` | Lista as notificações geradas (consumida pelo BFF). |
| `eventos` | HTTP trigger `POST /api/eventos` | Mesma lógica do Service Bus trigger por HTTP (teste local). |
| `health` | HTTP trigger `GET /api/health` | Saúde. |

**Alunos:** Bernardo Vieira · Murilo Regnier
PUCPR · Engenharia de Software · Arquitetura e Soluções Cloud · PJBL Entrega 3

## Links (nuvem)
| Item | URL |
|---|---|
| Function App | `https://<nome-da-function-app>.azurewebsites.net/api/health` |
| Indicadores | `POST https://<nome>.azurewebsites.net/api/indicadores` |
| Notificações | `https://<nome>.azurewebsites.net/api/notificacoes` |

## Arquitetura
```
src/
  domain/          indicadores.js (cálculo), notificacao.js (evento → mensagem), errors.js
  application/     ports.js (NotificationStore, Clock) e features/
                   CalcularIndicadores, ProcessarEventoConsulta, ListarNotificacoes
  infrastructure/  TableNotificationStore (Azure Table Storage), InMemoryNotificationStore, config
  api/             features/<Feature>/endpoint.js (gatilhos do Azure Functions), functions.js
  composition.js   composition root
  main.js          entrada do runtime (package.json "main")
scripts/dev-server.js   servidor HTTP local com os mesmos handlers (sem Core Tools)
```
A mensagem do Service Bus que estiver fora do contrato (AsyncAPI) é descartada com log. Uma falha de infraestrutura lança erro para o Service Bus reentregar; após o limite, a mensagem vai para a dead-letter queue.

## Tecnologias
Node.js 22, `@azure/functions` v4, Azure Service Bus (trigger), `@azure/data-tables`, Azure Functions (Flex Consumption/Consumption), `node:test`.

## Configuração (Application Settings)
| Variável | Valor |
|---|---|
| `SERVICEBUS_CONNECTION` | Connection string do namespace do Service Bus |
| `SERVICEBUS_QUEUE` | `vetflow-eventos` |
| `AzureWebJobsStorage` | Criada automaticamente com a Function App (usada pelo Table Storage) |

## Como rodar localmente
```bash
npm install
npm test
npm run dev            # http://localhost:7071/api (handlers em memória, sem Core Tools)
# ou, com Azure Functions Core Tools:
cp local.settings.example.json local.settings.json && func start
```

## Deploy
```bash
npm install --omit=dev
func azure functionapp publish <nome-da-function-app> --javascript
```
Também dá para publicar pelo GitHub Actions (`.github/workflows/ci.yml`) com os secrets `AZURE_FUNCTIONAPP_NAME` e `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`.
