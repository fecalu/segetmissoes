import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-process-selector',
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './process-selector.component.html',
  styleUrl: './process-selector.component.css'
})
export class ProcessSelectorComponent {
  showDevModal = false;
  devFeatureName = '';

  constructor(private readonly router: Router, private readonly authService: AuthService) {}

  iniciarChecklistMissao(): void {
    this.router.navigate(['/checklist']);
  }

  abrirEmDesenvolvimento(featureName: string): void {
    this.devFeatureName = featureName;
    this.showDevModal = true;
  }

  fecharModal(): void {
    this.showDevModal = false;
    this.devFeatureName = '';
  }

  logout(): void {
    this.authService.logout();
  }
}
