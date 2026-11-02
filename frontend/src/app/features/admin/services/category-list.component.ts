import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServiceCategory } from '../../../core/models/service.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { RowAction, RowActionsComponent } from '../../../shared/components/row-actions/row-actions.component';
import { ButtonDirective } from '../../../shared/directives/button.directive';
import { IconDirective } from '../../../shared/directives/icon.directive';
import { InputDirective } from '../../../shared/directives/input.directive';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, ButtonDirective, ErrorMessageComponent, IconDirective, InputDirective, ModalComponent, RowActionsComponent],
  templateUrl: './category-list.component.html',
})
export class CategoryListComponent {
  private service = inject(ServiceCategoryService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly categories = input.required<ServiceCategory[]>();
  readonly changed = output<void>();

  readonly newName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  readonly adding = signal(false);
  readonly addError = signal<string | null>(null);

  readonly renaming = signal<ServiceCategory | null>(null);
  readonly renameControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  readonly renameError = signal<string | null>(null);
  readonly saving = signal(false);

  readonly deactivating = signal<ServiceCategory | null>(null);

  servicesLabel(count: number): string {
    const tens = count % 100;
    const ones = count % 10;
    return `${count} ${ones >= 2 && ones <= 4 && (tens < 12 || tens > 14) ? 'usluge' : 'usluga'}`;
  }

  actionsFor(category: ServiceCategory): RowAction[] {
    return [
      { id: 'rename', label: 'Preimenuj', icon: 'edit' },
      category.active ? { id: 'deactivate', label: 'Deaktiviraj', icon: 'lock' } : { id: 'activate', label: 'Aktiviraj', icon: 'unlock' },
      ...(category.services_count === 0 ? [{ id: 'delete', label: 'Obriši', icon: 'trash' as const, danger: true }] : []),
    ];
  }

  onAction(category: ServiceCategory, action: string): void {
    if (action === 'rename') this.openRename(category);
    if (action === 'deactivate') this.deactivating.set(category);
    if (action === 'activate') this.setActive(category, true);
    if (action === 'delete') this.remove(category);
  }

  add(): void {
    if (this.newName.invalid) {
      this.addError.set('Upiši naziv kategorije (najmanje 2 slova).');
      return;
    }
    this.adding.set(true);
    this.addError.set(null);
    this.service.create(this.newName.value.trim()).subscribe({
      next: () => {
        this.adding.set(false);
        this.newName.reset();
        this.toast.success('Kategorija je dodata.');
        this.changed.emit();
      },
      error: (err) => {
        this.adding.set(false);
        this.addError.set(apiErrorMessage(err, 'Dodavanje nije uspelo.'));
      },
    });
  }

  openRename(category: ServiceCategory): void {
    this.deactivating.set(null);
    this.renameError.set(null);
    this.renameControl.reset(category.name);
    this.renaming.set(category);
  }

  rename(): void {
    const category = this.renaming();
    if (!category || this.renameControl.invalid) return;
    this.saving.set(true);
    this.service.rename(category.id, this.renameControl.value.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.renaming.set(null);
        this.toast.success('Kategorija je preimenovana.');
        this.changed.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.renameError.set(apiErrorMessage(err, 'Čuvanje nije uspelo.'));
      },
    });
  }

  confirmDeactivate(): void {
    const category = this.deactivating();
    if (!category) return;
    this.deactivating.set(null);
    this.setActive(category, false);
  }

  move(index: number, step: -1 | 1): void {
    const ids = this.categories().map((c) => c.id);
    const target = index + step;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.service.reorder(ids).subscribe({
      next: () => this.changed.emit(),
      error: (err) => this.toast.error(apiErrorMessage(err, 'Promena redosleda nije uspela.')),
    });
  }

  private setActive(category: ServiceCategory, active: boolean): void {
    this.service.setActive(category.id, active).subscribe({
      next: () => {
        this.toast.success(active ? 'Kategorija je ponovo aktivna.' : 'Kategorija je deaktivirana — njene usluge se više ne nude online.');
        this.changed.emit();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Čuvanje nije uspelo.')),
    });
  }

  private async remove(category: ServiceCategory): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Brisanje kategorije', message: `Obrisati kategoriju „${category.name}"?`, confirmLabel: 'Obriši', danger: true });
    if (!ok) return;
    this.service.delete(category.id).subscribe({
      next: () => {
        this.toast.success('Kategorija je obrisana.');
        this.changed.emit();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Brisanje nije uspelo.')),
    });
  }
}
