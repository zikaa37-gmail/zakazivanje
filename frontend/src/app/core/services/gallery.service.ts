import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { GalleryImage, GalleryImageDetails, GalleryUpload } from '../models/gallery.model';

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/gallery`;

  src(image: GalleryImage): string {
    return `${environment.apiUrl}${image.url}`;
  }

  publicList(): Observable<GalleryImage[]> {
    return this.http.get<GalleryImage[]>(`${environment.apiUrl}/public/gallery`);
  }

  list(): Observable<GalleryImage[]> {
    return this.http.post<GalleryImage[]>(`${this.api}/list`, {});
  }

  upload(payload: GalleryUpload): Observable<GalleryImage> {
    return this.http.post<GalleryImage>(this.api, payload, { context: new HttpContext().set(SKIP_LOADER, true) });
  }

  update(id: number, payload: GalleryImageDetails): Observable<GalleryImage> {
    return this.http.put<GalleryImage>(`${this.api}/${id}`, payload);
  }

  reorder(ids: number[]): Observable<GalleryImage[]> {
    return this.http.post<GalleryImage[]>(`${this.api}/reorder`, { ids }, { context: new HttpContext().set(SKIP_LOADER, true) });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  async share(image: GalleryImage, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
    const blob = await fetch(this.src(image)).then((response) => response.blob());
    const extension = blob.type.split('/')[1] ?? 'jpg';
    const file = new File([blob], `galerija-${image.id}.${extension}`, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title, text: image.caption ?? title });
        return 'shared';
      } catch {
        return 'cancelled';
      }
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
    return 'downloaded';
  }
}
