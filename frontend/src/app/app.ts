import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmHost } from './shared/ui/confirm-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmHost],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
