import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { GestionClinicaService } from './gestion-clinica.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Controller('gestion-clinica')
export class GestionClinicaController {
  constructor(
    private readonly gestionClinicaService: GestionClinicaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  @Get('estados')
  async listarEstadosClinica() {
    return await this.gestionClinicaService.listarEstadosClinica();
  }

  @Get('vista-pacientes')
  async vistaPacientes(@Headers('authorization') authorization?: string) {
    return this.gestionClinicaService.obtenerVistaPacientes(authorization);
  }

  @Get('seguimiento')
  async seguimientoRegistros(@Headers('authorization') authorization?: string) {
    return this.gestionClinicaService.obtenerSeguimientoRegistros(authorization);
  }

  @Get('pacientes/buscar')
  async buscarPaciente(@Query('rut') rut: string, @Headers('authorization') authorization?: string) {
    const resultado = await this.gestionClinicaService.buscarPacientePorRut(rut || '');
    await this.auditoria.registrarDesdeToken(authorization, {
      accion: 'CONSULTA_PACIENTE',
      rut,
      origen: resultado?.origen ?? 'SICHCP (local)',
      exito: true,
      mensaje: resultado?.encontrado ? 'Paciente encontrado' : 'Paciente no encontrado',
    });
    return resultado;
  }

  @Get('atenciones')
  async listarAtenciones(
    @Query('rut') rut?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const lista = await this.gestionClinicaService.listarAtenciones(rut, authorization);
    await this.auditarHistorial(authorization, 'Atenciones', rut, lista);
    return lista;
  }

  @Get('atenciones/:id')
  async obtenerAtencion(@Param('id') id: string) {
    return await this.gestionClinicaService.obtenerAtencionPorId(id);
  }

  @Get('atenciones/:id/categorizacion')
  async consultarCategorizacion(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.gestionClinicaService.consultarCategorizacion(id, authorization);
  }

  @Post('atenciones/:id/categorizacion')
  async guardarCategorizacion(
    @Param('id') id: string,
    @Body() datos: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    const resultado = await this.gestionClinicaService.consultarCategorizacion(id, authorization, datos);
    await this.auditoria.registrarDesdeToken(authorization, {
      accion: 'CATEGORIZAR_ATENCION', referencia: id, exito: true,
      mensaje: 'Área de derivación y prioridad registradas',
    });
    return resultado;
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
    const resultado = await this.gestionClinicaService.derivarAtencion(id, datos, authorization);
    await this.auditoria.registrarDesdeToken(authorization, { accion: 'DERIVAR_ATENCION', exito: true, mensaje: 'Atención derivada' });
    return resultado;
  }

  @Get('atenciones/:id/ficha')
  async obtenerFichaClinica(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const ficha = await this.gestionClinicaService.obtenerFichaClinica(id, authorization);
    await this.auditoria.registrarDesdeToken(authorization, { accion: 'CONSULTA_FICHA', exito: true, mensaje: 'Ficha clínica consultada' });
    return ficha;
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
  async catalogosNuevaAtencion(@Headers('authorization') authorization?: string) {
    return await this.gestionClinicaService.obtenerCatalogosNuevaAtencion(authorization);
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
    const resultado = await this.gestionClinicaService.registrarNuevaAtencion(authorization, datos);
    await this.auditoria.registrarDesdeToken(authorization, {
      accion: 'REGISTRAR_ATENCION',
      rut: typeof datos?.rut === 'string' ? datos.rut : undefined,
      exito: true,
      mensaje: 'Atención registrada',
    });
    return resultado;
  }

  @Get('diagnosticos')
  async listarDiagnosticos(@Query('rut') rut: string, @Headers('authorization') authorization?: string) {
    const lista = await this.gestionClinicaService.listarDiagnosticosPorRut(rut || '');
    await this.auditarHistorial(authorization, 'Diagnósticos', rut, lista);
    return lista;
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
  async listarAlergias(@Query('rut') rut: string, @Headers('authorization') authorization?: string) {
    const lista = await this.gestionClinicaService.listarAlergiasPorRut(rut || '');
    await this.auditarHistorial(authorization, 'Alergias', rut, lista);
    return lista;
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
  async listarMedicamentos(@Query('rut') rut: string, @Headers('authorization') authorization?: string) {
    const lista = await this.gestionClinicaService.listarMedicamentosPorRut(rut || '');
    await this.auditarHistorial(authorization, 'Medicamentos', rut, lista);
    return lista;
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
  async listarExamenes(@Query('rut') rut: string, @Headers('authorization') authorization?: string) {
    const lista = await this.gestionClinicaService.listarExamenesPorRut(rut || '');
    await this.auditarHistorial(authorization, 'Exámenes', rut, lista);
    return lista;
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
  async listarObservaciones(@Query('rut') rut: string, @Headers('authorization') authorization?: string) {
    const lista = await this.gestionClinicaService.listarObservacionesPorRut(rut || '');
    await this.auditarHistorial(authorization, 'Observaciones', rut, lista);
    return lista;
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

  // Deja constancia de la consulta de un historial (recurso y cantidad), sin guardar su contenido.
  private async auditarHistorial(authorization: string | undefined, recurso: string, rut: string | undefined, lista: unknown): Promise<void> {
    await this.auditoria.registrarDesdeToken(authorization, {
      accion: 'CONSULTA_HISTORIAL',
      recurso,
      rut,
      exito: true,
      mensaje: `${Array.isArray(lista) ? lista.length : 0} registro(s) consultado(s)`,
    });
  }
}
