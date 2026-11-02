import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApplyProposalsResult, CategoryProposal, ServiceCategory } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServiceCategoryService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/service-categories`;

  list(): Observable<ServiceCategory[]> {
    return this.http.get<ServiceCategory[]>(this.api);
  }

  create(name: string): Observable<ServiceCategory> {
    return this.http.post<ServiceCategory>(this.api, { name });
  }

  rename(id: number, name: string): Observable<ServiceCategory> {
    return this.http.put<ServiceCategory>(`${this.api}/${id}`, { name });
  }

  setActive(id: number, active: boolean): Observable<ServiceCategory> {
    return this.http.post<ServiceCategory>(`${this.api}/${id}/active`, { active });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  reorder(ids: number[]): Observable<ServiceCategory[]> {
    return this.http.post<ServiceCategory[]>(`${this.api}/reorder`, { ids });
  }

  apply(categories: CategoryProposal[], staffMemberIds: number[]): Observable<ApplyProposalsResult> {
    return this.http.post<ApplyProposalsResult>(`${this.api}/apply`, { categories, staff_member_ids: staffMemberIds });
  }
}
