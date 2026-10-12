import { Module } from '@nestjs/common';
import { GestionClinicaController } from './gestion-clinica.controller';
import { GestionClinicaService } from './gestion-clinica.service';
import { InstitutionBrandingService } from './institution-branding.service';
import { FhirModule } from '../fhir/fhir.module';

@Module({
  imports: [FhirModule],
  controllers: [GestionClinicaController],
  providers: [GestionClinicaService, InstitutionBrandingService],
  exports: [GestionClinicaService],
})
export class GestionClinicaModule {}
