import { Types } from 'mongoose';

export type ProductCategory = 'supplement' | 'merchandise' | 'service_package';

export interface IProduct {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  name: string;
  category: ProductCategory;
  price: number;
  stockQuantity?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
