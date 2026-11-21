export interface Studio {
  title: string;
  category: string;
  hourlyRate: number;
  securityDeposit: number;
  maxCapacity: number;
  location: string;
  imageUrl: string;
  images?: string[];
  amenities: string[];
  overview: string;

  ownerId: string;
  ownerName: string;
  ownerEmail: string;

  createdAt: Date;
  updatedAt: Date;
}