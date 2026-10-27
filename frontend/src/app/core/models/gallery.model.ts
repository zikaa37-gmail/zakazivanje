export type GalleryKind = 'work' | 'salon';

export interface GalleryImage {
  id: number;
  caption: string | null;
  service_id: number | null;
  kind: GalleryKind;
  featured: boolean;
  service_name: string | null;
  width: number;
  height: number;
  visible: boolean;
  position: number;
  url: string;
}

export interface GalleryUpload {
  data: string;
  width: number;
  height: number;
  caption?: string | null;
  service_id?: number | null;
}

export interface GalleryImageDetails {
  caption: string | null;
  service_id: number | null;
  kind: GalleryKind;
  featured: boolean;
  visible: boolean;
}
