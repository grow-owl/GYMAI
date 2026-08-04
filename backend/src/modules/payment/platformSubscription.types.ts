import { Types } from 'mongoose';
import { GymPlan } from '../gym/gym.types';

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface IPlatformSubscription {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  plan: GymPlan;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  gatewaySubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlatformInvoice {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  invoiceNumber: string; // e.g. "PLT-2026-000001"
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date;
  failureReason?: string;
  createdAt: Date;
}
