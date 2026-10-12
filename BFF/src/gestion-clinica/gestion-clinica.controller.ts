import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { GestionClinicaService } from './gestion-clinica.service';

@Controller('gestion-clinica')
export class GestionClinicaController {
  constructor(private readonly gestionClinicaService: GestionClinicaService) {}

  @Get('estados')
  async listarEstadosClinica() {
    return await this.gestionClinicaService.listarEstadosClinica();
  }

  @Get('pacientes/buscar')
  async buscarPaciente(@Query('rut') rut: string) {
    return await this.gestionClinicaService.buscarPacientePorRut(rut || '');
  }

  @Get('atenciones')
  async listarAtenciones(
    @Query('rut') rut?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.listarAtenciones(rut, authorization);
  }

  @Get('atenciones/:id')
  async obtenerAtencion(@Param('id') id: string) {
    return await this.gestionClinicaService.obtenerAtencionPorId(id);
  }

  @Get('atenciones/:id/detalle')
  async obtenerDetalleDerivacion(
    @Param('id') id: string,
    @Query('id_area_derivada') idAreaDerivada?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.obtenerDetalleDerivacion(id, authorization, idAreaDerivada);
  }

  @Post('atenciones/:id/derivar')
  async derivarAtencion(
    @Param('id') id: string,
    @Body() datos: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.derivarAtencion(id, datos, authorization);
  }

  @Get('atenciones/:id/ficha')
  async obtenerFichaClinica(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.obtenerFichaClinica(id, authorization);
  }

  @Get('atenciones/:id/diagnostico')
  async obtenerDiagnosticoPdf(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.obtenerDiagnosticoPdf(id, authorization);
  }

  @Patch('atenciones/:id/ficha')
  async guardarFichaClinica(
    @Param('id') id: string,
    @Body() datos: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.guardarFichaClinica(id, datos, authorization);
  }

  @Post('atenciones')
  async crearAtencion(
    @Body() datos: Record<string, any>,
    @Headers('authorization') authorization?: string,
  ) {
    const contexto = await this.gestionClinicaService.resolverContextoUsuario(authorization);
    return await this.gestionClinicaService.guardarAtencion({ ...contexto, ...datos });
  }

  @Patch('atenciones/:id')
  async actualizarAtencion(@Param('id') id: string, @Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarAtencion({ ...datos, id_atencion: id });
  }

  @Get('nueva-atencion/catalogos')
  async catalogosNuevaAtencion() {
    return await this.gestionClinicaService.obtenerCatalogosNuevaAtencion();
  }

  @Get('nueva-atencion/comunas')
  async comunasNuevaAtencion(@Query('id_region') idRegion: string) {
    return await this.gestionClinicaService.listarComunasPorRegion(idRegion);
  }

  @Get('nueva-atencion/contexto')
  async contextoNuevaAtencion(@Headers('authorization') authorization?: string) {
    return await this.gestionClinicaService.obtenerContextoUsuario(authorization);
  }

  @Get('nueva-atencion/paciente')
  async pacienteNuevaAtencion(@Query('rut') rut: string) {
    return await this.gestionClinicaService.obtenerPacienteNuevaAtencion(rut);
  }

  @Post('nueva-atencion')
  async registrarNuevaAtencion(
    @Body() datos: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.registrarNuevaAtencion(authorization, datos);
  }

  @Get('diagnosticos')
  async listarDiagnosticos(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarDiagnosticosPorRut(rut || '');
  }

  @Get('diagnosticos/:id')
  async obtenerDetalleDiagnostico(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.obtenerDetalleRegistro(26, id, authorization);
  }

  @Post('diagnosticos')
  async crearDiagnostico(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarDiagnostico(datos);
  }

  @Get('alergias')
  async listarAlergias(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarAlergiasPorRut(rut || '');
  }

  @Get('alergias/:id')
  async obtenerDetalleAlergia(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.obtenerDetalleRegistro(27, id, authorization);
  }

  @Post('alergias')
  async crearAlergia(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarAlergia(datos);
  }

  @Get('medicamentos')
  async listarMedicamentos(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarMedicamentosPorRut(rut || '');
  }

  @Get('medicamentos/:id')
  async obtenerDetalleMedicamento(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.obtenerDetalleRegistro(28, id, authorization);
  }

  @Post('medicamentos')
  async crearMedicamento(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarMedicamento(datos);
  }

  @Get('examenes')
  async listarExamenes(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarExamenesPorRut(rut || '');
  }

  @Get('examenes/:id')
  async obtenerDetalleExamen(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.obtenerDetalleRegistro(29, id, authorization);
  }

  @Post('examenes')
  async crearExamen(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarExamen(datos);
  }

  @Get('observaciones')
  async listarObservaciones(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarObservacionesPorRut(rut || '');
  }

  @Get('observaciones/:id')
  async obtenerDetalleObservacion(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return await this.gestionClinicaService.obtenerDetalleObservacion(id, authorization);
  }

  @Post('observaciones')
  async crearObservacion(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarObservacion(datos);
  }

  @Get('recursos-ficha')
  async obtenerRecursosFicha(@Query('rut') rut: string) {
    return await this.gestionClinicaService.obtenerRecursosFichaPaciente(rut || '');
  }
}
