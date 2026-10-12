import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FhirController } from './fhir.controller';
import { FhirService } from '../fhir/fhir.service';

@Module({
  imports: [ConfigModule],
  controllers: [FhirController],
  providers: [FhirService],
  exports: [FhirService],
})
export class FhirModule {}
