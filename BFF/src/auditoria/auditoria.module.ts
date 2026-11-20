import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { AccesoDenegadoFilter } from './acceso-denegado.filter';

@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService, { provide: APP_FILTER, useClass: AccesoDenegadoFilter }],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
