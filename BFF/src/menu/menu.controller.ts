import { Controller, Get, Headers, Param, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { MenuService, MenuItem } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get('me')
  async getMyMenu(
    @Headers('authorization') authorization?: string,
  ): Promise<MenuItem[]> {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no enviado');
    }

    const token = authorization.substring('Bearer '.length).trim();
    const secret = process.env.JWT_SECRET || 'SICHCP_SECRET_2026';

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    const menu = await this.menuService.getMenuByClaims(decoded as Record<string, unknown>);
    if (!menu.length) {
      throw new UnauthorizedException('No se pudo resolver el rol del usuario');
    }

    return menu;
  }

  @Get(':nombre_rol')
  async getMenuByRol(@Param('nombre_rol') nombreRol: string): Promise<MenuItem[]> {
    return this.menuService.getMenuByRoleName(nombreRol);
  }
}
