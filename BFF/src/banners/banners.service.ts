import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class BannersService {
  constructor(private readonly dataSource: DataSource) {}

  async obtenerBannerosActivos() {
    const query = `SELECT * FROM FN_MANTENEDOR_IMAGENES(1)`;
    const result = await this.dataSource.query(query);
    return result;
  }

  async obtenerBannerPorId(idBanner: string) {
    const query = `SELECT * FROM FN_MANTENEDOR_IMAGENES(2, $1)`;
    const result = await this.dataSource.query(query, [idBanner]);
    return result;
  }

  async crearOModificarBanner(
    idBanner: string | null,
    tipoBanner: string,
    titulo: string,
    descripcion: string,
    nombreImagen: string,
    urlImagen: string,
    orden: number,
    usuarioRegistro?: string,
  ) {
    const query = `SELECT * FROM FN_MANTENEDOR_IMAGENES(3, $1, $2, $3, $4, $5, $6, $7, $8)`;
    const result = await this.dataSource.query(query, [
      idBanner || null,
      tipoBanner,
      titulo,
      descripcion,
      nombreImagen,
      urlImagen,
      orden,
      usuarioRegistro || null,
    ]);
    return result;
  }

  async eliminarBanner(idBanner: string) {
    const query = `SELECT * FROM FN_MANTENEDOR_IMAGENES(4, $1)`;
    const result = await this.dataSource.query(query, [idBanner]);
    return result;
  }

  async obtenerTiposBanner() {
    const query = `SELECT * FROM FN_MANTENEDOR_IMAGENES(5)`;
    const result = await this.dataSource.query(query);
    return result.map((row: { id_banner: string; tipo_banner: string; descripcion: string | null }) => ({
      id_tipo_banner: row.id_banner,
      nombre: row.tipo_banner,
      descripcion: row.descripcion ?? '',
    }));
  }

  async obtenerCarrusel() {
    const query = `SELECT * FROM FN_MUESTRA_IMAGENES(1)`;
    const result = await this.dataSource.query(query);
    return result;
  }
}
