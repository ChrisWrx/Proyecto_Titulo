import { Controller, Get, Param } from '@nestjs/common';
import { IndicadoresService } from './indicadores.service';

@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get()
  async listarIndicadores() {
    return await this.indicadoresService.listarIndicadores(1);
  }

  @Get('panel/noticias')
  async obtenerNoticias() {
    return await this.indicadoresService.obtenerNoticias();
  }

  @Get('panel/red-estado')
  async obtenerRedEstado() {
    return await this.indicadoresService.obtenerRedEstado();
  }

  @Get('panel/alertas')
  async obtenerAlertasClinicas() {
    return await this.indicadoresService.obtenerAlertasClinicas();
  }

  @Get('panel/alerta-detalle/:tipo')
  async obtenerDetalleAlerta(@Param('tipo') tipo: string) {
    return await this.indicadoresService.obtenerDetalleAlerta(tipo);
  }

  @Get(':opcion')
  async listarIndicadoresPorOpcion(@Param('opcion') opcion: string) {
    return await this.indicadoresService.listarIndicadores(Number(opcion));
  }
}
