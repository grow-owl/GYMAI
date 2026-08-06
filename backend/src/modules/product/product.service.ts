import mongoose from 'mongoose';
import { Product } from './product.model';
import { Member } from '../member/member.model';
import { User } from '../user/user.model';
import { IProduct, ProductCategory } from './product.types';
import { MemberPaymentService } from '../payment/memberPayment.service';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { PaymentMethod } from '../payment/memberPayment.types';

import { Branch } from '../gym/branch.model';

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
  customerName?: string;
  notes?: string;
}

export class ProductService {
    let branch = await Branch.findOne({ gymId: mongoose.Types.ObjectId.isValid(gymId) ? new mongoose.Types.ObjectId(gymId) : undefined, isDeleted: false });
    const targetGymId = branch ? branch.gymId : (mongoose.Types.ObjectId.isValid(gymId) ? new mongoose.Types.ObjectId(gymId) : null);
    if (!targetGymId) {
      throw AppError.badRequest('Valid gym identifier is required for creating a product');
    }

    const product = new Product({
      gymId: targetGymId,
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

    let filter: Record<string, unknown> = { isDeleted: false };
    if (mongoose.Types.ObjectId.isValid(gymId)) {
      filter.gymId = new mongoose.Types.ObjectId(gymId);
    }
    if (filters.category) {
      filter.category = filters.category;
    }
    if (filters.isActive !== undefined) {
      filter.isActive = filters.isActive;
    }

    let [products, totalItems] = await Promise.all([
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

    // 3. Member Resolution for Payment Record
    let validMemberId = targetMemberId;
    const isTargetValidObjId = mongoose.Types.ObjectId.isValid(targetMemberId);
    let memberDoc = await Member.findOne({
      $or: [
        { _id: isTargetValidObjId ? new mongoose.Types.ObjectId(targetMemberId) : undefined },
        { userId: isTargetValidObjId ? new mongoose.Types.ObjectId(targetMemberId) : undefined },
      ],
      isDeleted: false,
    });

    if (memberDoc) {
      validMemberId = memberDoc._id.toString();
    } else {
      // Fallback: search or create dedicated Walk-in Customer profile
      let walkInMember = await Member.findOne({ fullName: 'Walk-in Customer', isDeleted: false });
      if (!walkInMember) {
        let walkInUser = await User.findOne({ fullName: 'Walk-in Customer', isDeleted: false });
        if (!walkInUser) {
          walkInUser = await User.create({
            fullName: 'Walk-in Customer',
            email: `walkin_${Date.now()}@gymai.internal`,
            phone: '0000000000',
            role: 'MEMBER',
            isActive: true,
          });
        }

        walkInMember = await Member.create({
          gymId: updatedProduct.gymId,
          userId: walkInUser._id,
          fullName: 'Walk-in Customer',
          phone: '0000000000',
          membershipStatus: 'ACTIVE',
          planName: 'Walk-in Store Purchase',
          membershipStartDate: new Date(),
          membershipEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      }
      validMemberId = walkInMember._id.toString();
    }

    // 4. Payment Processing via existing Payment Module
    const totalAmount = updatedProduct.price * quantity;
    const notes = input.notes || `Purchased ${quantity}x ${updatedProduct.name}`;

    let paymentResult: any;

    if (paymentMethod === 'online') {
      paymentResult = await MemberPaymentService.initiateOnlineMemberPayment(
        {
          gymId: updatedProduct.gymId.toString(),
          amount: totalAmount,
          purpose: 'merchandise',
          memberId: validMemberId,
        },
        actingUser
      );
    } else {
      const customerName = input.customerName || (memberDoc ? ((memberDoc as any).fullName || 'Member') : 'Walk-in Customer');
      paymentResult = await MemberPaymentService.recordManualPayment(
        {
          gymId: updatedProduct.gymId.toString(),
          memberId: validMemberId,
          amount: totalAmount,
          method: paymentMethod,
          purpose: 'merchandise',
          customerName,
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
