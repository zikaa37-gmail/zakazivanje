import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GalleryImage } from '../../../core/models/gallery.model';
import { SalonService } from '../../../core/models/service.model';
import { BusinessSettingService } from '../../../core/services/business-setting.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { ServiceCatalogService } from '../../../core/services/service-catalog.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { resizeImage } from '../../../core/utils/resize-image';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';

@Component({
  selector: 'app-gallery-admin',
  standalone: true,
  imports: [CdkDrag, CdkDropList, ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent, ToggleComponent],
  templateUrl: './gallery-admin.component.html',
  styleUrl: './gallery-admin.component.scss',
})
export class GalleryAdminComponent {
  private fb = inject(FormBuilder);
  private gallery = inject(GalleryService);
  private catalog = inject(ServiceCatalogService);
  private business = inject(BusinessSettingService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly images = signal<GalleryImage[]>([]);
  readonly services = signal<SalonService[]>([]);
  readonly uploading = signal<{ done: number; total: number } | null>(null);
  readonly dragOver = signal(false);
  readonly editing = signal<GalleryImage | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.group({
    caption: this.fb.control<string | null>(null),
    service_id: this.fb.control<number | null>(null),
    visible: this.fb.nonNullable.control(true),
  });

  readonly actions: RowAction[] = [
    { id: 'edit', label: 'Opis i usluga', icon: 'edit' },
    { id: 'share', label: 'Podeli (Instagram...)', icon: 'share' },
    { id: 'delete', label: 'Obriši', icon: 'trash', danger: true },
  ];

  constructor() {
    this.load();
    this.catalog.list().subscribe((services) => this.services.set(services));
  }

  src(image: GalleryImage): string {
    return this.gallery.src(image);
  }

  load(): void {
    this.loading.set(true);
    this.gallery.list().subscribe({
      next: (images) => {
        this.images.set(images);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Učitavanje galerije nije uspelo.'));
        this.loading.set(false);
      },
    });
  }

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    this.upload(files);
  }

  onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    this.dragOver.set(false);
    this.upload([...event.dataTransfer.files]);
  }

  async upload(files: File[]): Promise<void> {
    const images = files.filter((file) => file.type.startsWith('image/') && file.type !== 'image/svg+xml');
    if (images.length === 0) {
      if (files.length) this.toast.error('Izaberi slike (JPG, PNG ili WEBP).');
      return;
    }
    this.uploading.set({ done: 0, total: images.length });
    let failed = 0;
    for (const file of images) {
      try {
        const resized = await resizeImage(file, 1600);
        const saved = await firstValueFrom(this.gallery.upload(resized));
        this.images.update((list) => [saved, ...list]);
      } catch {
        failed++;
      }
      this.uploading.update((state) => (state ? { ...state, done: state.done + 1 } : state));
    }
    this.uploading.set(null);
    const sent = images.length - failed;
    if (sent) this.toast.success(sent === 1 ? 'Slika je dodata u galeriju.' : `Dodato slika: ${sent}.`);
    if (failed) this.toast.error(failed === 1 ? 'Jedna slika nije poslata.' : `Nije poslato slika: ${failed}.`);
  }

  drop(event: CdkDragDrop<GalleryImage[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const list = [...this.images()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.images.set(list);
    this.saveOrder(list);
  }

  move(image: GalleryImage, step: number): void {
    const list = [...this.images()];
    const index = list.findIndex((item) => item.id === image.id);
    const target = index + step;
    if (target < 0 || target >= list.length) return;
    moveItemInArray(list, index, target);
    this.images.set(list);
    this.saveOrder(list);
  }

  onAction(image: GalleryImage, action: string): void {
    if (action === 'edit') this.openForm(image);
    if (action === 'share') this.share(image);
    if (action === 'delete') this.remove(image);
  }

  openForm(image: GalleryImage): void {
    this.formError.set(null);
    this.form.reset({ caption: image.caption, service_id: image.service_id, visible: image.visible });
    this.editing.set(image);
  }

  save(): void {
    const image = this.editing();
    if (!image) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.gallery.update(image.id, { caption: value.caption?.trim() || null, service_id: value.service_id ? Number(value.service_id) : null, visible: value.visible }).subscribe({
      next: (saved) => {
        this.replace(saved);
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success('Slika je sačuvana.');
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }

  toggleVisible(image: GalleryImage): void {
    this.gallery.update(image.id, { caption: image.caption, service_id: image.service_id, visible: !image.visible }).subscribe({
      next: (saved) => this.replace(saved),
      error: (err) => this.toast.error(apiErrorMessage(err, 'Izmena nije uspela.')),
    });
  }

  async share(image: GalleryImage): Promise<void> {
    const result = await this.gallery.share(image, this.business.name());
    if (result === 'downloaded') this.toast.success('Ovaj pregledač ne deli slike direktno — slika je preuzeta, objavi je iz galerije telefona.');
  }

  async remove(image: GalleryImage): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Brisanje slike', message: 'Slika će biti uklonjena iz galerije.', confirmLabel: 'Obriši', danger: true });
    if (!ok) return;
    this.gallery.delete(image.id).subscribe({
      next: () => {
        this.images.update((list) => list.filter((item) => item.id !== image.id));
        this.toast.success('Slika je obrisana.');
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }

  private replace(saved: GalleryImage): void {
    this.images.update((list) => list.map((item) => (item.id === saved.id ? saved : item)));
  }

  private saveOrder(list: GalleryImage[]): void {
    this.gallery.reorder(list.map((item) => item.id)).subscribe({
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Redosled nije sačuvan.'));
        this.load();
      },
    });
  }
}
