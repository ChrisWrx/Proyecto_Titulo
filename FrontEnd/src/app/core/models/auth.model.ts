export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  usuario: {
    id_usuario?: number;
    username?: string;
    nombres?: string;
    apellidos?: string;
    [key: string]: unknown;
  };
}
