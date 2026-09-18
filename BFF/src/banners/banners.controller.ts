import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async obtenerBannerosActivos() {
    return await this.bannersService.obtenerBannerosActivos();
  }

  @Get('tipos/lista')
  async obtenerTiposBanner() {
    return await this.bannersService.obtenerTiposBanner();
  }

  @Get('carrusel/slides')
  async obtenerCarrusel() {
    return await this.bannersService.obtenerCarrusel();
  }

  @Get(':id')
  async obtenerBannerPorId(@Param('id') id: string) {
    return await this.bannersService.obtenerBannerPorId(id);
  }

  @Post()
  async crearBanner(@Body() createBannerDto: CreateBannerDto) {
    return await this.bannersService.crearOModificarBanner(
      null,
      createBannerDto.tipo_banner,
      createBannerDto.titulo,
      createBannerDto.descripcion,
      createBannerDto.nombre_imagen,
      createBannerDto.url_imagen,
      createBannerDto.orden,
      createBannerDto.usuario_registro,
    );
  }

  @Patch(':id')
  async modificarBanner(
    @Param('id') id: string,
    @Body() createBannerDto: CreateBannerDto,
  ) {
    return await this.bannersService.crearOModificarBanner(
      id,
      createBannerDto.tipo_banner,
      createBannerDto.titulo,
      createBannerDto.descripcion,
      createBannerDto.nombre_imagen,
      createBannerDto.url_imagen,
      createBannerDto.orden,
      createBannerDto.usuario_registro,
    );
  }

  @Delete(':id')
  async eliminarBanner(@Param('id') id: string) {
    return await this.bannersService.eliminarBanner(id);
  }
}
