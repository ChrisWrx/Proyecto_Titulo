import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class InteroperabilidadService {
  constructor(private readonly dataSource: DataSource) {}

  async obtenerResumen() {
    const [red, recursosFhir, ultimasIntegraciones] = await Promise.all([
      this.dataSource.query('SELECT * FROM fn_lista_indicadores(2)'),
      this.dataSource.query('SELECT * FROM fn_recursos_fhir(1)'),
      this.dataSource.query('SELECT * FROM fn_integraciones(1)'),
    ]);

    return { red, recursosFhir, ultimasIntegraciones };
  }

  async obtenerRecursosFhir() {
    return await this.dataSource.query('SELECT * FROM fn_recursos_fhir(2)');
  }

  async obtenerIntegraciones() {
    return await this.dataSource.query('SELECT * FROM fn_integraciones(2)');
  }
}
