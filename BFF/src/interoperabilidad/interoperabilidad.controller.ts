import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { InteroperabilidadService } from './interoperabilidad.service';

@Controller('interoperabilidad')
export class InteroperabilidadController {
  constructor(private readonly interoperabilidadService: InteroperabilidadService) {}

  /**
   * GET /interoperabilidad
   * Retorna resumen completo: red de establecimientos, top recursos FHIR y últimas integraciones.
   */
  @Get()
  async obtenerResumen() {
    return await this.interoperabilidadService.obtenerResumen();
  }

  /**
   * GET /interoperabilidad/recursos-fhir
   * Retorna todos los recursos FHIR con sus conteos reales.
   */
  @Get('recursos-fhir')
  async obtenerRecursosFhir() {
    return await this.interoperabilidadService.obtenerRecursosFhir();
  }

  /**
   * GET /interoperabilidad/integraciones
   * Retorna todas las integraciones (establecimientos conectados).
   */
  @Get('integraciones')
  async obtenerIntegraciones() {
    return await this.interoperabilidadService.obtenerIntegraciones();
  }

  // ── Módulo Interoperabilidad (fn_interoperabilidad); requieren Authorization: Bearer <token> ──

  /** GET /interoperabilidad/acceso — OPCIÓN 9: permisos del usuario (ver / editar). */
  @Get('acceso')
  async obtenerPermisos(@Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.obtenerPermisos(authorization);
  }

  /** GET /interoperabilidad/fhir/catalogo — OPCIÓN 1: catálogo de recursos FHIR. */
  @Get('fhir/catalogo')
  async obtenerCatalogoFhir(@Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.obtenerCatalogoFhir(authorization);
  }

  /** POST /interoperabilidad/fhir/consultar — body { recurso, rut }: el RUT viaja en el cuerpo, no en la URL. */
  @Post('fhir/consultar')
  async consultarRecursoFhir(
    @Body() body: { recurso: string; rut: string },
    @Headers('authorization') authorization?: string,
  ) {
    return await this.interoperabilidadService.consultarRecursoFhir(body?.recurso, body?.rut, authorization);
  }

  /** GET /interoperabilidad/gestion/tipos — OPCIÓN 10: combobox Tipo. */
  @Get('gestion/tipos')
  async obtenerTipos(@Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.obtenerTiposIntegracion(authorization);
  }

  /** GET /interoperabilidad/gestion/autenticaciones — OPCIÓN 11: combobox Autenticación. */
  @Get('gestion/autenticaciones')
  async obtenerAutenticaciones(@Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.obtenerAutenticaciones(authorization);
  }

  /** GET /interoperabilidad/gestion/versiones — OPCIÓN 14: combobox Versión FHIR. */
  @Get('gestion/versiones')
  async obtenerVersiones(@Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.obtenerVersionesFhir(authorization);
  }

  /** GET /interoperabilidad/gestion/resumen — OPCIÓN 2: totales por estado. */
  @Get('gestion/resumen')
  async resumenIntegraciones(@Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.resumenIntegraciones(authorization);
  }

  /** GET /interoperabilidad/gestion/historial?id=&soloErrores=true — OPCIÓN 8: historial de eventos. */
  @Get('gestion/historial')
  async historial(
    @Query('id') id?: string,
    @Query('soloErrores') soloErrores?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.interoperabilidadService.historialIntegraciones(id, soloErrores === 'true', authorization);
  }

  /** GET /interoperabilidad/gestion/integraciones — OPCIÓN 3: listado. */
  @Get('gestion/integraciones')
  async listarIntegraciones(@Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.listarIntegraciones(authorization);
  }

  /** GET /interoperabilidad/gestion/integraciones/:id — OPCIÓN 4: detalle. */
  @Get('gestion/integraciones/:id')
  async detalleIntegracion(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.detalleIntegracion(id, authorization);
  }

  /** POST /interoperabilidad/gestion/integraciones — OPCIÓN 5: registrar. */
  @Post('gestion/integraciones')
  async crearIntegracion(@Body() body: Record<string, unknown>, @Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.guardarIntegracion(null, body, authorization);
  }

  /** PUT /interoperabilidad/gestion/integraciones/:id — OPCIÓN 5: actualizar. */
  @Put('gestion/integraciones/:id')
  async actualizarIntegracion(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.interoperabilidadService.guardarIntegracion(id, body, authorization);
  }

  /** PATCH /interoperabilidad/gestion/integraciones/:id/habilitar — OPCIÓN 6: { habilitada: boolean }. */
  @Patch('gestion/integraciones/:id/habilitar')
  async habilitarIntegracion(
    @Param('id') id: string,
    @Body() body: { habilitada: boolean },
    @Headers('authorization') authorization?: string,
  ) {
    return await this.interoperabilidadService.habilitarIntegracion(id, body?.habilitada, authorization);
  }

  /** POST /interoperabilidad/gestion/integraciones/:id/probar — prueba /metadata y registra (OPCIÓN 7). */
  @Post('gestion/integraciones/:id/probar')
  async probarIntegracion(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return await this.interoperabilidadService.probarIntegracion(id, authorization);
  }
}
