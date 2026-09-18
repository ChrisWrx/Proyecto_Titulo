import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthApiService } from '../../core/services/auth-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly authApiService: AuthApiService
  ) {}

  submit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    this.authApiService.login(this.loginForm.getRawValue()).subscribe({
      next: (response) => {
        const usuario = this.normalizeUsuario(response.usuario);

        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('usuario_sesion', JSON.stringify(usuario));

        const fullName = [usuario?.nombres, usuario?.apellidos]
          .filter(Boolean)
          .join(' ')
          .trim();

        this.successMessage.set(
          fullName ? `Bienvenido ${fullName}` : 'Inicio de sesión exitoso'
        );
        this.router.navigate(['/dashboard']);

        this.loginForm.reset({ username: '', password: '' });
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);

        if (error.status === 401) {
          this.errorMessage.set('Credenciales incorrectas. Intenta nuevamente.');
          return;
        }

        if (error.status === 0) {
          this.errorMessage.set('No se pudo conectar al BFF. Verifica que esté levantado en localhost:3000.');
          return;
        }

        const backendMessage = typeof error.error?.message === 'string'
          ? error.error.message
          : 'Ocurrió un error al iniciar sesión.';

        this.errorMessage.set(backendMessage);
      }
    });
  }

  private normalizeUsuario(rawUsuario: unknown): Record<string, unknown> {
    const usuario = (rawUsuario ?? {}) as Record<string, unknown>;
    const rol = (usuario['rol'] ?? usuario['perfil']) as Record<string, unknown> | undefined;

    const idRol =
      this.toStringOrEmpty(usuario['id_rol']) ||
      this.toStringOrEmpty(usuario['idRol']) ||
      this.toStringOrEmpty(usuario['rol_id']) ||
      this.toStringOrEmpty(usuario['id_rol_fk']) ||
      this.toStringOrEmpty(usuario['idrol']) ||
      this.toStringOrEmpty(rol?.['id_rol']) ||
      this.toStringOrEmpty(rol?.['idRol']) ||
      this.toStringOrEmpty(rol?.['rol_id']) ||
      '';

    return {
      ...usuario,
      nombres: this.toStringOrEmpty(usuario['nombres']),
      apellidos: this.toStringOrEmpty(usuario['apellidos']),
      id_rol: idRol
    };
  }

  private toStringOrEmpty(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  get usernameInvalid(): boolean {
    const control = this.loginForm.controls.username;
    return control.invalid && (control.dirty || control.touched);
  }

  get passwordInvalid(): boolean {
    const control = this.loginForm.controls.password;
    return control.invalid && (control.dirty || control.touched);
  }
}
