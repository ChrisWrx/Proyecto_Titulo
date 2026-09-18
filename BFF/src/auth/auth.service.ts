import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const result = await this.dataSource.query(
      `SELECT * FROM public.fn_login_sistema($1, $2)`,
      [username, password],
    );

    if (!result || result.length === 0) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const usuario = result[0] as Record<string, unknown>;
    const idRol = await this.resolveRoleId(usuario, username);
    const nombreRol = idRol ? await this.resolveRoleName(idRol) : null;

    const establecimiento = usuario.id_establecimiento
      ? {
          id_establecimiento: usuario.id_establecimiento,
          nombre: usuario.nombre_establecimiento,
          tipo: usuario.tipo_establecimiento,
          comuna: usuario.comuna_establecimiento,
          direccion: usuario.direccion_establecimiento,
        }
      : null;

    const usuarioConRol: Record<string, unknown> & { id_rol: string | null } = {
      ...usuario,
      id_rol: idRol,
      nombre_rol: nombreRol,
      rol: idRol && nombreRol ? { id_rol: idRol, nombre: nombreRol } : null,
      establecimiento,
    };

    const payload = {
      sub: typeof usuarioConRol.id_usuario === 'string' ? usuarioConRol.id_usuario : null,
      username,
      nombres: typeof usuarioConRol.nombres === 'string' ? usuarioConRol.nombres : null,
      apellidos: typeof usuarioConRol.apellidos === 'string' ? usuarioConRol.apellidos : null,
      id_rol: usuarioConRol.id_rol,
      nombre_rol: nombreRol,
      rol: idRol && nombreRol ? { id_rol: idRol, nombre: nombreRol } : null,
      establecimiento,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      usuario: usuarioConRol,
    };
  }

  private async resolveRoleId(
    usuario: Record<string, unknown>,
    username: string,
  ): Promise<string | null> {
    const directRoleId = this.extractRoleIdFromUser(usuario);
    if (directRoleId) {
      return directRoleId;
    }

    const idUsuario =
      typeof usuario.id_usuario === 'string'
        ? usuario.id_usuario
        : typeof usuario.idusuario === 'string'
          ? usuario.idusuario
          : null;

    if (idUsuario) {
      const byUserIdQueries = [
        `SELECT id_rol::text AS id_rol FROM public.usuario_sistema WHERE id_usuario::text = $1 LIMIT 1`,
        `SELECT id_rol::text AS id_rol FROM public.usuario WHERE id_usuario::text = $1 LIMIT 1`,
        `SELECT id_rol::text AS id_rol FROM public.usuarios WHERE id_usuario::text = $1 LIMIT 1`,
      ];

      for (const query of byUserIdQueries) {
        try {
          const rows = await this.dataSource.query(query, [idUsuario]);
          const idRol = rows?.[0]?.id_rol;
          if (typeof idRol === 'string' && idRol.trim().length > 0) {
            return idRol;
          }
        } catch {
          // Ignore missing table/column combinations and continue probing.
        }
      }
    }

    const queries = [
      `SELECT id_rol::text AS id_rol FROM public.usuario_sistema WHERE UPPER(username) = UPPER($1) LIMIT 1`,
      `SELECT id_rol::text AS id_rol FROM public.usuario WHERE UPPER(usuario) = UPPER($1) LIMIT 1`,
      `SELECT id_rol::text AS id_rol FROM public.usuario WHERE UPPER(username) = UPPER($1) LIMIT 1`,
      `SELECT id_rol::text AS id_rol FROM public.usuarios WHERE UPPER(usuario) = UPPER($1) LIMIT 1`,
      `SELECT id_rol::text AS id_rol FROM public.usuarios WHERE UPPER(username) = UPPER($1) LIMIT 1`,
    ];

    for (const query of queries) {
      try {
        const rows = await this.dataSource.query(query, [username]);
        const idRol = rows?.[0]?.id_rol;
        if (typeof idRol === 'string' && idRol.trim().length > 0) {
          return idRol;
        }
      } catch {
        // Ignore missing table/column combinations and continue probing.
      }
    }

    return null;
  }

  private async resolveRoleName(idRol: string): Promise<string | null> {
    const rows = await this.dataSource.query(
      `SELECT nombre FROM public.rol WHERE id_rol::text = $1 LIMIT 1`,
      [idRol],
    );

    const nombre = rows?.[0]?.nombre;
    return typeof nombre === 'string' && nombre.trim().length > 0 ? nombre : null;
  }

  private extractRoleIdFromUser(usuario: Record<string, unknown>): string | null {
    const entries = Object.entries(usuario);
    for (const [key, value] of entries) {
      if (typeof value !== 'string') {
        continue;
      }
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === 'id_rol' || normalizedKey.endsWith('id_rol') || normalizedKey === 'rol_id') {
        return value;
      }
    }

    return null;
  }
}