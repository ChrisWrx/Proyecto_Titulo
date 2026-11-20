import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('UsuariosController', () => {
  let controller: UsuariosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        { provide: UsuariosService, useValue: {} },
        { provide: AuditoriaService, useValue: { registrarDesdeToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
