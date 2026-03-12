import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { ChecklistComponent } from './features/checklist/checklist.component';
import { motoristaGuard } from './core/guards/motorista.guard';
import { AdminLoginComponent } from './features/admin-login/admin-login.component';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { adminGuard } from './core/guards/admin.guard';
import { ProcessSelectorComponent } from './features/process-selector/process-selector.component';
import { AdminReportComponent } from './features/admin-report/admin-report.component';
import { AdminMissionStatsComponent } from './features/admin-mission-stats/admin-mission-stats.component';
import { MissaoExcecaoComponent } from './features/missao-excecao/missao-excecao.component';
import { VistoriaCompletaComponent } from './features/vistoria-completa/vistoria-completa.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'inicio', component: ProcessSelectorComponent, canActivate: [motoristaGuard] },
  { path: 'checklist', component: ChecklistComponent, canActivate: [motoristaGuard] },
  { path: 'checklist/excecao', component: MissaoExcecaoComponent, canActivate: [motoristaGuard] },
  { path: 'vistoria-completa', component: VistoriaCompletaComponent, canActivate: [motoristaGuard] },
  { path: 'admin/checklists/relatorio', component: AdminReportComponent, canActivate: [adminGuard] },
  { path: 'admin/estatisticas/missoes', component: AdminMissionStatsComponent, canActivate: [adminGuard] },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
