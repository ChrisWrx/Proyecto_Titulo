import { Module } from '@nestjs/common';
import { InteroperabilidadController } from './interoperabilidad.controller';
import { InteroperabilidadService } from './interoperabilidad.service';
import { FhirModule } from '../fhir/fhir.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [FhirModule, AuditoriaModule],
  controllers: [InteroperabilidadController],
  providers: [InteroperabilidadService],
})
export class InteroperabilidadModule {}
