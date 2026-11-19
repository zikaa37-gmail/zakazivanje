import { Pipe, PipeTransform } from '@angular/core';
import { NamedClient, clientName } from '../../core/utils/client-name';

@Pipe({
  name: 'clientName',
})
export class ClientNamePipe implements PipeTransform {
  transform(client: NamedClient | null | undefined): string {
    return clientName(client);
  }
}
