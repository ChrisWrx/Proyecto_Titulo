import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /** POST /auth/logout — deja constancia del cierre de sesión (Authorization: Bearer <token>). */
  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    return this.authService.logout(authorization);
  }
}