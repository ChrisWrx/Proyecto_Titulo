import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { AuditoriaService, type FiltrosAuditoria } from './auditoria.service';

// Todos los endpoints requieren Authorization: Bearer <token> y rol con acceso a Auditoría.
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  /** GET /auditoria/acceso — OPCIÓN 2: permisos (ver / exportar). */
  @Get('acceso')
  async obtenerPermisos(@Headers('authorization') authorization?: string) {
    return await this.auditoriaService.obtenerPermisos(authorization);
  }

  /** GET /auditoria/indicadores — OPCIÓN 3: indicadores del día. */
  @Get('indicadores')
  async obtenerIndicadores(@Headers('authorization') authorization?: string) {
    return await this.auditoriaService.obtenerIndicadores(authorization);
  }

  /** GET /auditoria/eventos?desde=&hasta=&id_usuario=&rol=&modulo=&accion=&resultado=&pagina=&tamano= — OPCIÓN 4. */
  @Get('eventos')
  async listarEventos(@Query() filtros: FiltrosAuditoria, @Headers('authorization') authorization?: string) {
    return await this.auditoriaService.listarEventos(filtros, authorization);
  }

  /** GET /auditoria/exportar — OPCIÓN 11: mismos filtros, hasta 5000 filas; queda auditada. */
  @Get('exportar')
  async exportarEventos(@Query() filtros: FiltrosAuditoria, @Headers('authorization') authorization?: string) {
    return await this.auditoriaService.exportarEventos(filtros, authorization);
  }

  /** GET /auditoria/eventos/:id — OPCIÓN 5: detalle de un evento. */
  @Get('eventos/:id')
  async obtenerEvento(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return await this.auditoriaService.obtenerEvento(id, authorization);
  }

  /** GET /auditoria/retencion — OPCIÓN 12: política de retención vigente. */
  @Get('retencion')
  async obtenerRetencion(@Headers('authorization') authorization?: string) {
    return await this.auditoriaService.obtenerRetencion(authorization);
  }

  /** PUT /auditoria/retencion — OPCIÓN 13: body { retencion_meses }; solo SUPER_ADMIN. */
  @Put('retencion')
  async definirRetencion(@Body() body: { retencion_meses?: unknown }, @Headers('authorization') authorization?: string) {
    return await this.auditoriaService.definirRetencion(body?.retencion_meses, authorization);
  }

  /** POST /auditoria/retencion/purgar — OPCIÓN 14: body { confirmar: true } elimina; sin confirmar solo simula. */
  @Post('retencion/purgar')
  async purgarFueraDePlazo(@Body() body: { confirmar?: boolean }, @Headers('authorization') authorization?: string) {
    return await this.auditoriaService.purgarFueraDePlazo(body?.confirmar === true, authorization);
  }

  /** GET /auditoria/catalogos/modulos — OPCIÓN 6. */
  @Get('catalogos/modulos')
  async catalogoModulos(@Headers('authorization') authorization?: string) {
    return await this.auditoriaService.catalogoModulos(authorization);
  }

  /** GET /auditoria/catalogos/acciones?modulo= — OPCIÓN 7. */
  @Get('catalogos/acciones')
  async catalogoAcciones(@Query('modulo') modulo?: string, @Headers('authorization') authorization?: string) {
    return await this.auditoriaService.catalogoAcciones(modulo, authorization);
  }

  /** GET /auditoria/catalogos/usuarios — OPCIÓN 8. */
  @Get('catalogos/usuarios')
  async catalogoUsuarios(@Headers('authorization') authorization?: string) {
    return await this.auditoriaService.catalogoUsuarios(authorization);
  }

  /** GET /auditoria/catalogos/roles — OPCIÓN 9. */
  @Get('catalogos/roles')
  async catalogoRoles(@Headers('authorization') authorization?: string) {
    return await this.auditoriaService.catalogoRoles(authorization);
  }

  /** GET /auditoria/catalogos/resultados — OPCIÓN 10. */
  @Get('catalogos/resultados')
  async catalogoResultados(@Headers('authorization') authorization?: string) {
    return await this.auditoriaService.catalogoResultados(authorization);
  }
}
