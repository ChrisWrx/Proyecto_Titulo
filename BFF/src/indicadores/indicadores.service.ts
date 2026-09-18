import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class IndicadoresService {
  constructor(private readonly dataSource: DataSource) {}

  async listarIndicadores(opcion = 1) {
    const query = `SELECT * FROM FN_LISTA_INDICADORES($1)`;
    const result = await this.dataSource.query(query, [opcion]);
    return result;
  }

  async obtenerNoticias() {
    const query = `
      SELECT titulo, fecha_creacion::date AS fecha
      FROM public.noticia_sistema
      WHERE activo = true
      ORDER BY fecha_creacion DESC
    `;
    return this.dataSource.query(query);
  }

  async obtenerRedEstado() {
    const query = `
      SELECT
        tipo AS nombre,
        activos,
        total,
        ROUND((activos::NUMERIC / NULLIF(total,0)) * 100, 1) AS porcentaje
      FROM (
        SELECT 'Hospitales conectados'  AS tipo, COUNT(*) FILTER (WHERE COALESCE(activo,true)=true)::INT AS activos, COUNT(*)::INT AS total FROM public.establecimiento_salud WHERE tipo_establecimiento = 'HOSPITAL'
        UNION ALL
        SELECT 'CESFAM conectados',  COUNT(*) FILTER (WHERE COALESCE(activo,true)=true)::INT, COUNT(*)::INT FROM public.establecimiento_salud WHERE tipo_establecimiento = 'CESFAM'
        UNION ALL
        SELECT 'SAPU conectados',    COUNT(*) FILTER (WHERE COALESCE(activo,true)=true)::INT, COUNT(*)::INT FROM public.establecimiento_salud WHERE tipo_establecimiento IN ('SAPU','SAR')
        UNION ALL
        SELECT 'Laboratorios',       COUNT(*) FILTER (WHERE COALESCE(activo,true)=true)::INT, COUNT(*)::INT FROM public.establecimiento_salud WHERE tipo_establecimiento = 'LABORATORIO'
      ) sub
    `;
    const rows = await this.dataSource.query(query);
    const totalActivos = rows.reduce((s: number, r: any) => s + Number(r.activos), 0);
    const totalEstab   = rows.reduce((s: number, r: any) => s + Number(r.total),   0);
    const serviciosOp  = totalEstab > 0 ? Math.round((totalActivos / totalEstab) * 1000) / 10 : 0;
    return { items: rows, serviciosOperativos: serviciosOp };
  }

  async obtenerAlertasClinicas() {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM public.alergia    WHERE criticidad = 'CRITICA')::INT    AS alergias_criticas,
        (SELECT COUNT(*) FROM public.medicamento WHERE estado = 'SUSPENDIDO')::INT    AS medicamentos_pendientes,
        (SELECT COUNT(*) FROM public.examen)::INT                                     AS examenes_totales
    `;
    const [row] = await this.dataSource.query(query);
    return [
      { orden: 1, nombre: 'Condiciones Clínicas del Paciente',   valor: Number(row.alergias_criticas),      tipo: 'danger',  icono: 'bi-exclamation-triangle-fill' },
      { orden: 2, nombre: 'Fármacos Pendientes de Revisión',       valor: Number(row.medicamentos_pendientes), tipo: 'warning', icono: 'bi-capsule-pill' },
      { orden: 3, nombre: 'Exámenes Clínicos Registrados',         valor: Number(row.examenes_totales),        tipo: 'info',    icono: 'bi-file-earmark-medical-fill' },
    ];
  }

  async obtenerDetalleAlerta(tipo: string) {
    if (tipo === 'alergias') {
      return this.dataSource.query(`
        SELECT
          p.nombres || ' ' || p.apellidos AS nombre_paciente,
          a.alergeno,
          a.tipo_reaccion,
          a.criticidad,
          COALESCE(a.observacion, '') AS observacion
        FROM public.alergia a
        JOIN public.paciente p ON a.id_paciente = p.id_paciente
        WHERE a.criticidad = 'CRITICA'
        ORDER BY a.fecha_registro DESC
      `);
    }
    if (tipo === 'medicamentos') {
      return this.dataSource.query(`
        SELECT
          m.nombre_medicamento,
          COALESCE(m.dosis, '-') AS dosis,
          COALESCE(m.frecuencia, '-') AS frecuencia,
          COALESCE(m.via_administracion, '-') AS via_administracion,
          TO_CHAR(m.fecha_inicio, 'DD/MM/YYYY') AS fecha_inicio,
          TO_CHAR(m.fecha_fin,   'DD/MM/YYYY') AS fecha_fin,
          m.estado
        FROM public.medicamento m
        WHERE m.estado = 'SUSPENDIDO'
        ORDER BY m.fecha_registro DESC
      `);
    }
    if (tipo === 'examenes') {
      return this.dataSource.query(`
        SELECT
          e.tipo_examen,
          COALESCE(e.resultado, '-') AS resultado,
          TO_CHAR(e.fecha_examen, 'DD/MM/YYYY') AS fecha_examen
        FROM public.examen e
        ORDER BY e.fecha_examen DESC
      `);
    }
    return [];
  }
}
