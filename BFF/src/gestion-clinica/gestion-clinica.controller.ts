import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
  async listarAtenciones(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarAtencionesPorRut(rut || '');
  }

  @Get('atenciones/:id')
  async obtenerAtencion(@Param('id') id: string) {
    return await this.gestionClinicaService.obtenerAtencionPorId(id);
  }

  @Post('atenciones')
  async crearAtencion(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarAtencion(datos);
  }

  @Patch('atenciones/:id')
  async actualizarAtencion(@Param('id') id: string, @Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarAtencion({ ...datos, id_atencion: id });
  }

  @Get('diagnosticos')
  async listarDiagnosticos(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarDiagnosticosPorRut(rut || '');
  }

  @Post('diagnosticos')
  async crearDiagnostico(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarDiagnostico(datos);
  }

  @Get('alergias')
  async listarAlergias(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarAlergiasPorRut(rut || '');
  }

  @Post('alergias')
  async crearAlergia(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarAlergia(datos);
  }

  @Get('medicamentos')
  async listarMedicamentos(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarMedicamentosPorRut(rut || '');
  }

  @Post('medicamentos')
  async crearMedicamento(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarMedicamento(datos);
  }

  @Get('examenes')
  async listarExamenes(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarExamenesPorRut(rut || '');
  }

  @Post('examenes')
  async crearExamen(@Body() datos: Record<string, any>) {
    return await this.gestionClinicaService.guardarExamen(datos);
  }

  @Get('observaciones')
  async listarObservaciones(@Query('rut') rut: string) {
    return await this.gestionClinicaService.listarObservacionesPorRut(rut || '');
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
