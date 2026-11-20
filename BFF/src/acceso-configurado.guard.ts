import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AccesoConfiguradoGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    // Las rutas públicas conservan su comportamiento; las protegidas validan su token.
    if (!authorization) return true;

    let claims: jwt.JwtPayload;
    try {
      if (!authorization.startsWith('Bearer ')) throw new Error();
      claims = jwt.verify(authorization.slice(7), process.env.JWT_SECRET || 'SICHCP_SECRET_2026') as jwt.JwtPayload;
      if (!claims.sub) throw new Error();
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    const ruta = request.path.replace(/\/$/, '') || '/';
    const filas = await this.dataSource.query(
      `SELECT fn_acceso_configurado_usuario($1::UUID, $2, $3) AS permitido`,
      [claims.sub, ruta, request.method],
    );
    if (!filas[0]?.permitido) throw new ForbiddenException('El perfil no tiene acceso a esta operación.');
    return true;
  }
}
