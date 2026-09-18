import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GuardarUsuarioDto } from './dto/guardar-usuario.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly dataSource: DataSource) {}

  async listarUsuarios(idEstablecimiento?: string) {
    const query = `SELECT * FROM fn_usuarios_sichcp(1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $1)`;
    const result = await this.dataSource.query(query, [idEstablecimiento ?? null]);
    return result;
  }

  async listarAreas() {
    const query = `SELECT id_rol AS id_area, area AS nombre FROM fn_usuarios_sichcp(3)`;
    const result = await this.dataSource.query(query);
    return result;
  }

  async listarRoles() {
    const query = `SELECT id_rol, nombre_rol AS nombre FROM fn_usuarios_sichcp(4)`;
    const result = await this.dataSource.query(query);
    return result;
  }

  async listarEstablecimientos() {
    const query = `
      SELECT 
        id_establecimiento, 
        nombre, 
        tipo_establecimiento AS tipo, 
        direccion, 
        comuna, 
        region
      FROM establecimiento_salud
      WHERE activo = true
      ORDER BY tipo_establecimiento, nombre
    `;
    return await this.dataSource.query(query);
  }

  async obtenerUsuarioPorRut(rut: string) {
    const result = await this.dataSource.query(
      `
        SELECT
          u.id_usuario::text,
          u.nombres AS nombres_usuario,
          split_part(COALESCE(u.apellidos, ''), ' ', 1) AS apellido_paterno,
          NULLIF(substr(COALESCE(u.apellidos, ''), length(split_part(COALESCE(u.apellidos, ''), ' ', 1)) + 2), '') AS apellido_materno,
          u.correo,
          u.username,
          COALESCE(ap.nombre, 'Sin area') AS area,
          ps.id_area AS id_area,
          u.id_rol,
          r.nombre AS nombre_rol,
          u.rut AS rut_usuario,
          u.id_establecimiento,
          e.nombre AS nombre_establecimiento,
          e.tipo_establecimiento,
          e.comuna AS comuna_establecimiento,
          e.direccion AS direccion_establecimiento
        FROM usuario_sistema u
        INNER JOIN rol r ON r.id_rol = u.id_rol
        LEFT JOIN profesional_salud ps ON ps.id_profesional = u.id_profesional
        LEFT JOIN area_profesional ap ON ap.id_area = ps.id_area
        LEFT JOIN establecimiento_salud e ON e.id_establecimiento = u.id_establecimiento
        WHERE LOWER(REPLACE(REPLACE(u.rut, '.', ''), '-', '')) = LOWER(REPLACE(REPLACE($1, '.', ''), '-', ''))
        LIMIT 1
      `,
      [this.normalizarRut(rut)],
    );
    return result[0] ?? null;
  }

  async guardarUsuario(datos: GuardarUsuarioDto, rut?: string) {
    const rutUsuario = this.normalizarRut(rut ?? datos.rut ?? null);
    let idUsuario = datos.id_usuario ?? null;

    if (rutUsuario && (!idUsuario || idUsuario === '0')) {
      const usuario = await this.dataSource.query(
        `SELECT id_usuario::text AS id_usuario FROM usuario_sistema WHERE rut = $1 LIMIT 1`,
        [rutUsuario],
      );
      idUsuario = usuario[0]?.id_usuario ?? null;
    }

    const result = await this.dataSource.query(
      `SELECT * FROM fn_usuarios_sichcp(5, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        rutUsuario,
        idUsuario,
        datos.nombres ?? null,
        datos.apellidoPaterno ?? null,
        datos.apellidoMaterno ?? null,
        datos.correo ?? null,
        datos.username ?? null,
        datos.id_area ?? null,
        datos.id_rol ?? null,
        datos.password ?? null,
        datos.id_establecimiento ?? null,
      ],
    );

    return result[0] ?? null;
  }

  async cambiarContrasena(datos: CambiarContrasenaDto) {
    const result = await this.dataSource.query(
      `SELECT * FROM fn_cambiar_contrasena_usuario($1, $2)`,
      [this.normalizarRut(datos.rut), datos.password],
    );
    return result[0] ?? { actualizado: false, username: null };
  }

  async desactivarUsuario(rut: string) {
    const result = await this.dataSource.query(
      `SELECT * FROM fn_usuarios_sichcp(6, $1)`,
      [this.normalizarRut(rut)],
    );
    return result[0] ?? { mensaje: 'Usuario no encontrado o ya desactivado' };
  }

  private normalizarRut(rut: string | null): string | null {
    if (!rut) {
      return null;
    }

    const limpio = rut.trim().toUpperCase().replace(/[. ]/g, '');
    if (!limpio) {
      return null;
    }

    return limpio.includes('-') ? limpio : `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
  }
}
