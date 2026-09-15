import { Directive, ElementRef, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Directive({ selector: 'img[appProtectedImage]' })
export class ProtectedImageDirective implements OnDestroy {
  private static readonly vehicleImageCache = new Map<string, string>();
  private readonly element = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);
  private readonly http = inject(HttpClient);
  private request?: Subscription;
  private objectUrl?: string;
  private releaseObjectUrl = true;

  @Input() set appProtectedImage(value: string) {
    this.release();
    if (!value) return;
    const source = new URL(value, window.location.origin);
    // Old hosts may be stored in the database; always request uploads from the current backend.
    if (!source.pathname.startsWith('/uploads/')) return;
    const backend = new URL(environment.apiBaseUrl, window.location.origin);
    const url = backend.origin + source.pathname;
    const useCache = source.pathname.startsWith('/uploads/veiculos/');
    const cached = useCache ? ProtectedImageDirective.vehicleImageCache.get(url) : undefined;
    if (cached) {
      this.objectUrl = cached;
      this.releaseObjectUrl = false;
      this.renderer.setAttribute(this.element.nativeElement, 'src', cached);
      return;
    }
    this.request = this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        this.objectUrl = URL.createObjectURL(blob);
        this.releaseObjectUrl = !useCache;
        if (useCache) {
          ProtectedImageDirective.vehicleImageCache.set(url, this.objectUrl);
        }
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
    if (this.objectUrl && this.releaseObjectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    this.releaseObjectUrl = true;
    this.renderer.removeAttribute(this.element.nativeElement, 'src');
  }
}
