export interface GalleryImage {
  id: number;
  caption: string | null;
  service_id: number | null;
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
  visible: boolean;
}
