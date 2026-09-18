import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class GestionClinicaService {
  constructor(private readonly dataSource: DataSource) {}

  async listarEstadosClinica() {
    const query = `SELECT * FROM fn_gestion_clinica(15)`;
    const result = await this.dataSource.query(query);
    return result.map((item: { tipo_atencion: string; estado: string }) => ({
      categoria: item.tipo_atencion,
      valor: item.estado,
    }));
  }

  /**
   * OPCIÓN 1: Búsqueda de paciente por RUT e indicadores asociados de Gestión Clínica
   */
  async buscarPacientePorRut(rut: string) {
    const query = `SELECT * FROM FN_GESTION_CLINICA(1, $1)`;
    const result = await this.dataSource.query(query, [rut]);
    return result[0] || {
      encontrado: false,
      id_paciente: null,
      rut: null,
      nombre_completo: null,
      fecha_nacimiento: null,
      edad: 0,
      sexo: null,
      recursos_ficha: 0,
      atenciones: 0,
      alergias_registradas: 0,
      medicamentos_activos: 0,
    };
  }

  /**
   * OPCIÓN 2: Listado de atenciones del paciente por RUT
   */
  async listarAtencionesPorRut(rut: string) {
    const query = `SELECT * FROM fn_gestion_clinica(2, $1)`;
    return await this.dataSource.query(query, [rut]);
  }

  /**
   * OPCIÓN 3: Obtener atención por id
   */
  async obtenerAtencionPorId(idAtencion: string) {
    const query = `SELECT * FROM fn_gestion_clinica(3, NULL, $1)`;
    const result = await this.dataSource.query(query, [idAtencion]);
    return result[0] ?? null;
  }

  /**
   * OPCIÓN 4: Crear o actualizar atención
   */
  async guardarAtencion(payload: Record<string, any>) {
    const query = `
      SELECT * FROM fn_gestion_clinica(
        4,
        NULL,
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11
      )
    `;
    const result = await this.dataSource.query(query, [
      payload.id_atencion ?? null,
      payload.id_paciente ?? null,
      payload.id_establecimiento ?? null,
      payload.id_profesional ?? null,
      payload.tipo_atencion ?? null,
      payload.motivo_consulta ?? null,
      payload.estado ?? null,
      payload.fecha_inicio ?? null,
      payload.fecha_fin ?? null,
      payload.rut ?? null,
      payload.codigo ?? null,
    ]);
    return result[0] ?? null;
  }

  /**
   * OPCIÓN 5: Listado de diagnósticos por RUT
   */
  async listarDiagnosticosPorRut(rut: string) {
    const query = `SELECT * FROM fn_gestion_clinica(5, $1)`;
    return await this.dataSource.query(query, [rut]);
  }

  /**
   * OPCIÓN 6: Crear o actualizar diagnóstico
   */
  async guardarDiagnostico(payload: Record<string, any>) {
    const query = `
      SELECT * FROM fn_gestion_clinica(
        6,
        NULL,
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11
      )
    `;
    const result = await this.dataSource.query(query, [
      payload.id_diagnostico ?? null,
      payload.id_paciente ?? null,
      payload.id_atencion ?? null,
      payload.codigo_cie10 ?? null,
      payload.descripcion ?? null,
      payload.estado ?? null,
      payload.fecha_diagnostico ?? null,
      payload.rut ?? null,
      payload.id_establecimiento ?? null,
      payload.id_profesional ?? null,
      payload.observacion ?? null,
    ]);
    return result[0] ?? null;
  }

  /**
   * OPCIÓN 7: Listado de alergias por RUT
   */
  async listarAlergiasPorRut(rut: string) {
    const query = `SELECT * FROM fn_gestion_clinica(7, $1)`;
    return await this.dataSource.query(query, [rut]);
  }

  /**
   * OPCIÓN 8: Crear o actualizar alergia
   */
  async guardarAlergia(payload: Record<string, any>) {
    const query = `SELECT * FROM fn_gestion_clinica(8, NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
    const result = await this.dataSource.query(query, [
      payload.id_alergia ?? null,
      payload.id_paciente ?? null,
      null,
      null,
      null,
      null,
      payload.alergeno ?? null,
      payload.tipo_reaccion ?? null,
      payload.criticidad ?? null,
      payload.observacion ?? null,
      payload.rut ?? null,
      null,
    ]);
    return result[0] ?? null;
  }

  /**
   * OPCIÓN 9: Listado de medicamentos por RUT
   */
  async listarMedicamentosPorRut(rut: string) {
    const query = `SELECT * FROM fn_gestion_clinica(9, $1)`;
    return await this.dataSource.query(query, [rut]);
  }

  /**
   * OPCIÓN 10: Crear o actualizar medicamento
   */
  async guardarMedicamento(payload: Record<string, any>) {
    const query = `SELECT * FROM fn_gestion_clinica(10, NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
    const result = await this.dataSource.query(query, [
      payload.id_medicamento ?? null,
      payload.id_paciente ?? null,
      null,
      null,
      null,
      null,
      payload.nombre_medicamento ?? null,
      payload.dosis ?? null,
      payload.frecuencia ?? null,
      payload.via_administracion ?? null,
      payload.estado ?? null,
      payload.rut ?? null,
      payload.fecha_registro ?? null,
      null,
    ]);
    return result[0] ?? null;
  }

  /**
   * OPCIÓN 11: Listado de exámenes por RUT
   */
  async listarExamenesPorRut(rut: string) {
    const query = `SELECT * FROM fn_gestion_clinica(11, $1)`;
    return await this.dataSource.query(query, [rut]);
  }

  /**
   * OPCIÓN 12: Crear o actualizar examen
   */
  async guardarExamen(payload: Record<string, any>) {
    const query = `SELECT * FROM fn_gestion_clinica(12, NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
    const result = await this.dataSource.query(query, [
      payload.id_examen ?? null,
      payload.id_paciente ?? null,
      payload.id_atencion ?? null,
      payload.id_establecimiento ?? null,
      null,
      payload.tipo_examen ?? null,
      payload.resultado ?? null,
      payload.estado ?? null,
      payload.rut ?? null,
      null,
      null,
      payload.fecha_examen ?? null,
      null,
    ]);
    return result[0] ?? null;
  }

  /**
   * OPCIÓN 13: Listado de observaciones por RUT
   */
  async listarObservacionesPorRut(rut: string) {
    const query = `SELECT * FROM fn_gestion_clinica(13, $1)`;
    return await this.dataSource.query(query, [rut]);
  }

  /**
   * OPCIÓN 14: Crear o actualizar observación clínica
   */
  async guardarObservacion(payload: Record<string, any>) {
    const query = `SELECT * FROM fn_gestion_clinica(14, NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
    const result = await this.dataSource.query(query, [
      payload.id_observacion ?? null,
      payload.id_paciente ?? null,
      payload.id_atencion ?? null,
      payload.id_establecimiento ?? null,
      payload.id_profesional ?? null,
      payload.tipo_observacion ?? null,
      payload.valor ?? null,
      payload.unidad_medida ?? null,
      payload.rut ?? null,
      payload.estado ?? null,
      null,
      payload.fecha_registro ?? null,
      null,
    ]);
    return result[0] ?? null;
  }

  /**
   * RECURSOS DE FICHA: Consulta consolidada de todos los recursos FHIR del paciente
   */
  async obtenerRecursosFichaPaciente(rut: string) {
    const query = `SELECT * FROM FN_RECURSOS_FICHA_PACIENTE($1)`;
    const result = await this.dataSource.query(query, [rut]);
    return result || [];
  }
}
