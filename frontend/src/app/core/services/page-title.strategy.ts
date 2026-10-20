import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BusinessSettingService } from './business-setting.service';

@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private title = inject(Title);
  private business = inject(BusinessSettingService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    const name = this.business.name();
    this.title.setTitle(page && page !== name ? `${page} · ${name}` : name);
  }
}
