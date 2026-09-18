import { Controller, Get } from '@nestjs/common';
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
}
