export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'client' | 'provider' | 'admin';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Business {
  id: number;
  ownerId: number;
  name: string;
  description?: string;
  category: string;
  address: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  phone: string;
  email?: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: number;
  businessId: number;
  name: string;
  description?: string;
  duration: number;
  price: number;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: number;
  businessId: number;
  serviceId: number;
  clientId: number;
  employeeId?: number;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: number;
  businessId: number;
  userId: number;
  appointmentId?: number;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}
