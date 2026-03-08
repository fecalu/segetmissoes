import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  template: `
    <section class="app-splash" *ngIf="showSplash">
      <img src="gov.png" alt="Logo SEGET">
      <h1>SEGET</h1>
      <p>Servicos Gerais e Transportes</p>
    </section>
    <router-outlet />
  `
})
export class AppComponent implements OnInit {
  showSplash = true;

  ngOnInit(): void {
    setTimeout(() => {
      this.showSplash = false;
    }, 1300);
  }
}
