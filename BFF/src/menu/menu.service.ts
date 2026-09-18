import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface MenuItem {
  id_menu: string;
  nombre: string;
  ruta: string | null;
  id_menu_padre: string | null;
  orden: number;
  es_padre: boolean;
}

@Injectable()
export class MenuService {
  constructor(private dataSource: DataSource) {}

  async getMenuByRol(id_rol: string): Promise<MenuItem[]> {
    const query = `
      SELECT * FROM FN_LISTA_MENU_BYROL($1::UUID)
    `;
    
    const result = await this.dataSource.query(query, [id_rol]);
    return result;
  }

  async getMenuByRoleName(nombreRol: string): Promise<MenuItem[]> {
    const result = await this.dataSource.query(
      `
        SELECT id_rol::text AS id_rol
        FROM public.rol
        WHERE UPPER(nombre) = UPPER($1)
          AND COALESCE(activo, true) = true
        LIMIT 1
      `,
      [nombreRol],
    );

    const idRol = this.asString(result?.[0]?.id_rol);
    return idRol ? this.getMenuByRol(idRol) : [];
  }

  async getMenuByClaims(claims: Record<string, unknown>): Promise<MenuItem[]> {
    const nombreRol = this.extractRoleName(claims);
    if (nombreRol) {
      return this.getMenuByRoleName(nombreRol);
    }

    const idRol = await this.resolveRoleIdFromClaims(claims);
    if (!idRol) {
      return [];
    }

    return this.getMenuByRol(idRol);
  }

  private extractRoleName(payload: Record<string, unknown>): string | null {
    const directRoleName = this.asString(payload['nombre_rol']);
    if (directRoleName) {
      return directRoleName;
    }

    for (const key of ['rol', 'perfil']) {
      const role = payload[key];
      if (role && typeof role === 'object') {
        const roleName = this.asString((role as Record<string, unknown>)['nombre']);
        if (roleName) {
          return roleName;
        }
      }
    }

    return null;
  }

  private async resolveRoleIdFromClaims(
    claims: Record<string, unknown>,
  ): Promise<string | null> {
    const directRole = this.extractRoleId(claims);
    if (directRole) {
      return directRole;
    }

    const sub = this.asString(claims['sub']);
    const username = this.asString(claims['username']);

    if (sub) {
      const bySubject = await this.findRoleIdByDynamicLookup('id', sub);
      if (bySubject) {
        return bySubject;
      }
    }

    if (username) {
      const byUsername = await this.findRoleIdByDynamicLookup('username', username);
      if (byUsername) {
        return byUsername;
      }
    }

    return null;
  }

  private extractRoleId(payload: Record<string, unknown>): string | null {
    const roleKeys = ['id_rol', 'idRol', 'rol_id', 'idrol', 'id_rol_fk'];
    for (const key of roleKeys) {
      const value = this.asString(payload[key]);
      if (value) {
        return value;
      }
    }

    return null;
  }

  private async findRoleIdByDynamicLookup(
    mode: 'id' | 'username',
    value: string,
  ): Promise<string | null> {
    const rolColumns = ['id_rol', 'rol_id', 'idrol'];
    const idColumns = ['id_usuario', 'idusuario', 'usuario_id', 'id_user', 'id'];
    const usernameColumns = ['usuario', 'username', 'user_name', 'correo', 'email'];
    const lookupColumns = mode === 'id' ? idColumns : usernameColumns;

    const tableRows = await this.dataSource.query(
      `
        SELECT DISTINCT table_schema, table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = ANY($1)
      `,
      [rolColumns],
    );

    for (const row of tableRows as Array<{ table_schema: string; table_name: string }>) {
      const schema = this.safeIdentifier(row.table_schema);
      const table = this.safeIdentifier(row.table_name);
      if (!schema || !table) {
        continue;
      }

      const columnRows = await this.dataSource.query(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = $1
            AND table_name = $2
        `,
        [row.table_schema, row.table_name],
      );

      const columns = new Set(
        (columnRows as Array<{ column_name: string }>).map((c) => c.column_name),
      );

      const roleColumn = rolColumns.find((c) => columns.has(c));
      const keyColumn = lookupColumns.find((c) => columns.has(c));
      if (!roleColumn || !keyColumn) {
        continue;
      }

      const roleCol = this.safeIdentifier(roleColumn);
      const keyCol = this.safeIdentifier(keyColumn);
      if (!roleCol || !keyCol) {
        continue;
      }

      const comparator = mode === 'id' ? `${keyCol}::text = $1` : `UPPER(${keyCol}::text) = UPPER($1)`;
      const query = `SELECT ${roleCol}::text AS id_rol FROM ${schema}.${table} WHERE ${comparator} LIMIT 1`;

      try {
        const rows = await this.dataSource.query(query, [value]);
        const idRol = this.asString(rows?.[0]?.id_rol);
        if (idRol) {
          return idRol;
        }
      } catch {
        // Continue probing other candidate tables.
      }
    }

    return null;
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private safeIdentifier(value: string): string | null {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) ? `"${value}"` : null;
  }
}
