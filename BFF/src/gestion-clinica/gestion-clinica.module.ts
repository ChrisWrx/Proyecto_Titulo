import { Module } from '@nestjs/common';
import { GestionClinicaController } from './gestion-clinica.controller';
import { GestionClinicaService } from './gestion-clinica.service';

@Module({
  controllers: [GestionClinicaController],
  providers: [GestionClinicaService],
  exports: [GestionClinicaService],
})
export class GestionClinicaModule {}
