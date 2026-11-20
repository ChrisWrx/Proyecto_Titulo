import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { GuardarUsuarioDto } from './dto/guardar-usuario.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly auditoria: AuditoriaService,
  ) {}

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
  async crearUsuario(@Body() datos: GuardarUsuarioDto, @Headers('authorization') authorization?: string) {
    const resultado = await this.usuariosService.guardarUsuario(datos);
    await this.auditoria.registrarDesdeToken(authorization, {
      accion: 'CREAR_USUARIO',
      rut: datos.rut,
      referencia: datos.username,
      exito: true,
      mensaje: 'Usuario creado',
    });
    return resultado;
  }

  @Patch(':rut')
  async actualizarUsuario(
    @Param('rut') rut: string,
    @Body() datos: GuardarUsuarioDto,
    @Headers('authorization') authorization?: string,
  ) {
    const antes = datos.id_rol ? await this.usuariosService.obtenerUsuarioPorRut(rut).catch(() => null) : null;
    const resultado = await this.usuariosService.guardarUsuario(datos, rut);
    const cambioRol = !!antes && !!datos.id_rol && String(antes.id_rol) !== String(datos.id_rol);
    await this.auditoria.registrarDesdeToken(authorization, {
      accion: 'ACTUALIZAR_USUARIO',
      rut,
      referencia: datos.username,
      exito: true,
      mensaje: cambioRol ? 'Usuario actualizado con cambio de rol' : 'Usuario actualizado',
    });
    return resultado;
  }

  @Patch(':rut/password')
  async cambiarContrasena(
    @Param('rut') rut: string,
    @Body() datos: CambiarContrasenaDto,
    @Headers('authorization') authorization?: string,
  ) {
    const resultado = await this.usuariosService.cambiarContrasena({ ...datos, rut });
    await this.auditoria.registrarDesdeToken(authorization, {
      accion: 'CAMBIAR_CONTRASENA',
      rut,
      exito: !!resultado?.actualizado,
      mensaje: resultado?.actualizado ? 'Contraseña actualizada' : 'No se actualizó la contraseña',
    });
    return resultado;
  }

  @Patch(':rut/desactivar')
  async desactivarUsuario(@Param('rut') rut: string, @Headers('authorization') authorization?: string) {
    const resultado = await this.usuariosService.desactivarUsuario(rut);
    await this.auditoria.registrarDesdeToken(authorization, {
      accion: 'DESACTIVAR_USUARIO',
      rut,
      exito: true,
      mensaje: resultado?.mensaje,
    });
    return resultado;
  }

  @Get(':rut')
  async obtenerUsuarioPorRut(@Param('rut') rut: string) {
    return await this.usuariosService.obtenerUsuarioPorRut(rut);
  }
}
