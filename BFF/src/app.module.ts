import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AccesoConfiguradoGuard } from './acceso-configurado.guard';

import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { MenuModule } from './menu/menu.module';
import { BannersModule } from './banners/banners.module';
import { IndicadoresModule } from './indicadores/indicadores.module';
import { InteroperabilidadModule } from './interoperabilidad/interoperabilidad.module';
import { GestionClinicaModule } from './gestion-clinica/gestion-clinica.module';
import { FhirModule } from './fhir/fhir.module';
import { AuditoriaModule } from './auditoria/auditoria.module';

@Module({
  providers: [{ provide: APP_GUARD, useClass: AccesoConfiguradoGuard }],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
        extra: { options: '-c client_encoding=UTF8' },
      }),
    }),

    AuthModule,
    UsuariosModule,
    RolesModule,
    MenuModule,
    BannersModule,
    IndicadoresModule,
    InteroperabilidadModule,
    GestionClinicaModule,
    FhirModule,
    AuditoriaModule,
  ],
})
export class AppModule {}
