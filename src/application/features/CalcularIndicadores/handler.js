import { calcularIndicadores } from '../../../domain/indicadores.js';

/** Caso de uso (serverless): calcula indicadores da clínica a partir das consultas recebidas do BFF. */
export class CalcularIndicadoresHandler {
  constructor({ clock }) {
    this.clock = clock;
  }

  async execute({ appointments }) {
    return calcularIndicadores(appointments, this.clock.now());
  }
}
