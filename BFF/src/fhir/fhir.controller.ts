import { Controller, Get, Query } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service';

@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('pacientes')
  async buscarPaciente(@Query('rut') rut: string) {
    if (rut) {
      const res = await this.fhirService.buscarPacienteFhir(rut);
      return res || { encontrado: false };
    }
    return await this.fhirService.getPatientRaw();
  }

  @Get('atenciones')
  async listarAtenciones(@Query('rut') rut?: string) {
    if (rut) {
      return await this.fhirService.listarAtencionesFhir(rut);
    }
    return await this.fhirService.getEncounterRaw();
  }

  @Get('observaciones')
  async listarObservaciones(@Query('rut') rut?: string) {
    if (rut) {
      return await this.fhirService.listarObservacionesFhir(rut);
    }
    return await this.fhirService.getObservationAnamnesisRaw();
  }

  @Get('diagnosticos')
  async listarDiagnosticos(@Query('rut') rut?: string) {
    if (rut) {
      return await this.fhirService.listarDiagnosticosFhir(rut);
    }
    return await this.fhirService.getConditionRaw();
  }

  @Get('alergias')
  async listarAlergias(@Query('rut') rut?: string) {
    if (rut) {
      return await this.fhirService.listarAlergiasFhir(rut);
    }
    return await this.fhirService.getAllergyRaw();
  }

  @Get('medicamentos')
  async listarMedicamentos(@Query('rut') rut?: string) {
    if (rut) {
      return await this.fhirService.listarMedicamentosFhir(rut);
    }
    return await this.fhirService.getMedicationRequestRaw();
  }

  @Get('examenes')
  async listarExamenes(@Query('rut') rut?: string) {
    if (rut) {
      return await this.fhirService.listarExamenesFhir(rut);
    }
    return await this.fhirService.getObservationLabRaw();
  }

  @Get('bundles')
  async obtenerBundle() {
    return await this.fhirService.getBundleRaw();
  }

  @Get('profesionales')
  async obtenerProfesional() {
    return await this.fhirService.getPractitionerRaw();
  }

  @Get('interconsultas')
  async obtenerInterconsulta() {
    return await this.fhirService.getServiceRequestRaw();
  }
}
