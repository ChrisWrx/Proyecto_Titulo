export class CreateBannerDto {
  tipo_banner: string;
  titulo: string;
  descripcion: string;
  nombre_imagen: string;
  url_imagen: string;
  orden: number;
  usuario_registro?: string;
}
