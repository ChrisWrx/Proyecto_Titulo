import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DataSource, useValue: { query: jest.fn() } },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: AuditoriaService, useValue: { registrar: jest.fn(), registrarDesdeToken: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
