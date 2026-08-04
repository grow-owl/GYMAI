import mongoose from 'mongoose';
import { Product } from './product.model';
import { IProduct, ProductCategory } from './product.types';
import { MemberPaymentService } from '../payment/memberPayment.service';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { PaymentMethod } from '../payment/memberPayment.types';

export interface CreateProductInput {
  name: string;
  category: ProductCategory;
  price: number;
  stockQuantity?: number;
  isActive?: boolean;
}

export interface PurchaseProductInput {
  memberId?: string; // target member ID (or user ID)
  quantity?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export class ProductService {
  public static async createProduct(gymId: string, input: CreateProductInput): Promise<IProduct> {
    const product = new Product({
      gymId: new mongoose.Types.ObjectId(gymId),
      name: input.name,
      category: input.category,
      price: input.price,
      stockQuantity: input.category === 'service_package' ? undefined : input.stockQuantity,
      isActive: input.isActive !== undefined ? input.isActive : true,
    });
    await product.save();
    return product;
  }

  public static async listProducts(
    gymId: string,
    filters: { category?: ProductCategory; isActive?: boolean } = {},
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ products: IProduct[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);

    const filter: Record<string, unknown> = {
      gymId: new mongoose.Types.ObjectId(gymId),
      isDeleted: false,
    };

    if (filters.category) {
      filter.category = filters.category;
    }
    if (filters.isActive !== undefined) {
      filter.isActive = filters.isActive;
    }

    const [products, totalItems] = await Promise.all([
      Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { products, meta };
  }

  public static async updateProduct(
    productId: string,
    gymId: string,
    input: Partial<CreateProductInput>
  ): Promise<IProduct> {
    const filter: Record<string, unknown> = {
      _id: productId,
      gymId: new mongoose.Types.ObjectId(gymId),
      isDeleted: false,
    };

    const product = await Product.findOneAndUpdate(filter, { $set: input }, { new: true, runValidators: true });
    if (!product) {
      throw AppError.notFound('Product not found');
    }

    return product;
  }

  public static async softDeleteProduct(productId: string, gymId: string): Promise<void> {
    const product = await Product.findOneAndUpdate(
      {
        _id: productId,
        gymId: new mongoose.Types.ObjectId(gymId),
        isDeleted: false,
      },
      { $set: { isDeleted: true, isActive: false } },
      { new: true }
    );

    if (!product) {
      throw AppError.notFound('Product not found');
    }
  }

  public static async purchaseProduct(
    productId: string,
    targetMemberId: string,
    actingUser: { id: string; role: string; gymId?: string },
    input: PurchaseProductInput
  ): Promise<{ product: IProduct; payment: any }> {
    const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
    const paymentMethod: PaymentMethod = input.paymentMethod || 'cash';

    // 1. Initial product fetch to check existence and status
    const existingProduct = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true,
    });

    if (!existingProduct) {
      throw AppError.notFound('Product not found or currently unavailable');
    }

    // 2. Atomic Stock Decrement with Race Condition Guard
    let updatedProduct: IProduct | null = existingProduct;

    if (existingProduct.category !== 'service_package' && existingProduct.stockQuantity !== undefined) {
      updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          isActive: true,
          isDeleted: false,
          stockQuantity: { $gte: quantity },
        },
        { $inc: { stockQuantity: -quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        throw AppError.badRequest('Product out of stock or insufficient quantity available');
      }
    }

    // 3. Payment Processing via existing Payment Module
    const totalAmount = updatedProduct.price * quantity;
    const notes = input.notes || `Purchased ${quantity}x ${updatedProduct.name}`;

    let paymentResult: any;

    if (paymentMethod === 'online') {
      paymentResult = await MemberPaymentService.initiateOnlineMemberPayment(
        {
          gymId: updatedProduct.gymId.toString(),
          amount: totalAmount,
          purpose: 'merchandise',
          memberId: targetMemberId,
        },
        actingUser
      );
    } else {
      paymentResult = await MemberPaymentService.recordManualPayment(
        {
          gymId: updatedProduct.gymId.toString(),
          memberId: targetMemberId,
          amount: totalAmount,
          method: paymentMethod,
          purpose: 'merchandise',
          notes,
        },
        actingUser
      );
    }

    return {
      product: updatedProduct,
      payment: paymentResult,
    };
  }
}
