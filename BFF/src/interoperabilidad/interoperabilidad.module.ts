import { Module } from '@nestjs/common';
import { InteroperabilidadController } from './interoperabilidad.controller';
import { InteroperabilidadService } from './interoperabilidad.service';

@Module({
  controllers: [InteroperabilidadController],
  providers: [InteroperabilidadService],
})
export class InteroperabilidadModule {}
