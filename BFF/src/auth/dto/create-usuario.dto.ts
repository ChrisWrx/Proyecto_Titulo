import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateUsuarioDto {

  @IsOptional()
  @IsUUID()
  id_usuario?: string;

  @IsOptional()
  @IsUUID()
  id_profesional?: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsEmail()
  correo!: string;

  @IsUUID()
  id_rol!: string;

  @IsString()
  @IsNotEmpty()
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  apellidos!: string;

  @Matches(/^[0-9]{9}$/)
  telefono_movil!: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

}