import { Directive, ElementRef, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Directive({ selector: 'img[appProtectedImage]' })
export class ProtectedImageDirective implements OnDestroy {
  private readonly element = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);
  private readonly http = inject(HttpClient);
  private request?: Subscription;
  private objectUrl?: string;

  @Input() set appProtectedImage(value: string) {
    this.release();
    if (!value) return;
    const source = new URL(value, window.location.origin);
    // Old hosts may be stored in the database; always request uploads from the current backend.
    if (!source.pathname.startsWith('/uploads/')) return;
    const backend = new URL(environment.apiBaseUrl, window.location.origin);
    const url = backend.origin + source.pathname;
    this.request = this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        this.objectUrl = URL.createObjectURL(blob);
        this.renderer.setAttribute(this.element.nativeElement, 'src', this.objectUrl);
      },
      error: () => {
        this.renderer.setAttribute(this.element.nativeElement, 'alt', 'Foto indisponível. Verifique o arquivo ou seu acesso.');
      }
    });
  }
  ngOnDestroy(): void { this.release(); }
  private release(): void {
    this.request?.unsubscribe();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    this.renderer.removeAttribute(this.element.nativeElement, 'src');
  }
}
