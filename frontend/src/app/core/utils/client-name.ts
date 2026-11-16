export interface NamedClient {
  first_name: string;
  last_name: string;
  nickname?: string | null;
}

export function clientName(client: NamedClient | null | undefined): string {
  if (!client) return '';
  return client.nickname?.trim() || `${client.first_name} ${client.last_name}`.trim();
}

export function clientShortName(client: NamedClient | null | undefined): string {
  if (!client) return '';
  return client.nickname?.trim() || `${client.first_name} ${client.last_name?.[0] ?? ''}.`.trim();
}
