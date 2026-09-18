import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { GuardarUsuarioDto } from './dto/guardar-usuario.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  async listarUsuarios(@Query('id_establecimiento') idEstablecimiento?: string) {
    return await this.usuariosService.listarUsuarios(idEstablecimiento);
  }

  @Get('areas/lista')
  async listarAreas() {
    return await this.usuariosService.listarAreas();
  }

  @Get('roles/lista')
  async listarRoles() {
    return await this.usuariosService.listarRoles();
  }

  @Get('establecimientos/lista')
  async listarEstablecimientos() {
    return await this.usuariosService.listarEstablecimientos();
  }

  @Post()
  async crearUsuario(@Body() datos: GuardarUsuarioDto) {
    return await this.usuariosService.guardarUsuario(datos);
  }

  @Patch(':rut')
  async actualizarUsuario(@Param('rut') rut: string, @Body() datos: GuardarUsuarioDto) {
    return await this.usuariosService.guardarUsuario(datos, rut);
  }

  @Patch(':rut/password')
  async cambiarContrasena(@Param('rut') rut: string, @Body() datos: CambiarContrasenaDto) {
    return await this.usuariosService.cambiarContrasena({ ...datos, rut });
  }

  @Patch(':rut/desactivar')
  async desactivarUsuario(@Param('rut') rut: string) {
    return await this.usuariosService.desactivarUsuario(rut);
  }

  @Get(':rut')
  async obtenerUsuarioPorRut(@Param('rut') rut: string) {
    return await this.usuariosService.obtenerUsuarioPorRut(rut);
  }
}
