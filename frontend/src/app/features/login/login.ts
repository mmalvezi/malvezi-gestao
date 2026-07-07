import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { BrandMark } from '../../shared/brand-mark';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, BrandMark],
  template: `
    <div class="tela">
      <div class="cartao card">
        <div class="regua"></div>
        <div class="logo">
          <app-brand-mark [size]="42" [lockup]="true"></app-brand-mark>
        </div>
        <p class="mut">Acesse o painel de gestão com a sua senha.</p>

        <form (ngSubmit)="entrar()">
          <div class="field">
            <label for="senha">Senha</label>
            <input
              id="senha"
              class="input"
              type="password"
              name="senha"
              [(ngModel)]="senha"
              placeholder="Digite a senha"
              autocomplete="current-password"
              autofocus
            />
          </div>

          @if (erro) {
            <div class="aviso">{{ erro }}</div>
          }

          <button class="btn primary block" type="submit" [disabled]="carregando">
            @if (carregando) {
              <span class="spin" style="width:16px;height:16px;border-width:2px"></span>
              Entrando...
            } @else {
              Entrar
            }
          </button>
        </form>
      </div>
      <div class="rodape mut tiny">malvezi.com.br</div>
    </div>
  `,
  styles: [
    `
      .tela {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 20px;
        background:
          radial-gradient(1200px 600px at 100% -10%, rgba(46, 134, 255, 0.12), transparent),
          radial-gradient(1000px 500px at -10% 110%, rgba(110, 75, 255, 0.14), transparent);
      }
      .cartao {
        width: 100%;
        max-width: 380px;
        padding: 28px;
        overflow: hidden;
      }
      .regua {
        height: 6px;
        border-radius: 999px;
        background: var(--grad);
        margin: -28px -28px 22px;
        border-radius: 0;
      }
      .logo {
        margin-bottom: 6px;
      }
      form {
        margin-top: 18px;
      }
      .aviso {
        background: var(--bad-bg);
        color: var(--bad);
        font-size: 13px;
        font-weight: 600;
        padding: 9px 12px;
        border-radius: 10px;
        margin-bottom: 12px;
      }
    `,
  ],
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  senha = '';
  erro = '';
  carregando = false;

  entrar() {
    this.erro = '';
    if (!this.senha) {
      this.erro = 'Informe a senha.';
      return;
    }
    this.carregando = true;
    this.auth.login(this.senha).subscribe({
      next: () => {
        this.carregando = false;
        this.router.navigate(['/painel']);
      },
      error: (e) => {
        this.carregando = false;
        this.erro =
          e.status === 401 ? 'Senha incorreta. Tente de novo.' : 'Não foi possível entrar.';
      },
    });
  }
}
