import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/modules/user/user.model';
import { Gym } from '../../src/modules/gym/gym.model';
import { Branch } from '../../src/modules/gym/branch.model';
import { Member } from '../../src/modules/member/member.model';
import { PlatformSubscription } from '../../src/modules/payment/platformSubscription.model';
import { PlatformInvoice } from '../../src/modules/payment/platformInvoice.model';
import { MemberPayment } from '../../src/modules/payment/memberPayment.model';
import { InvoiceCounter } from '../../src/modules/payment/invoiceCounter.model';
import { MemberService } from '../../src/modules/member/member.service';
import { PlatformBillingService } from '../../src/modules/payment/platformBilling.service';
import { GymPlan, GymStatus } from '../../src/modules/gym/gym.types';
import { Role } from '../../src/common/constants/roles.enum';
import { PaymentStatus } from '../../src/modules/payment/platformSubscription.types';
import { generateAccessToken } from '../../src/common/utils/generateTokens';

let mongoServer: MongoMemoryServer;
let ownerToken: string;
let memberToken: string;
let memberDocId: string;
let gymId: string;
let branchId: string;

describe('Payments & Subscriptions Module Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  beforeEach(async () => {
    await User.deleteMany({});
    await Gym.deleteMany({});
    await Branch.deleteMany({});
    await Member.deleteMany({});
    await PlatformSubscription.deleteMany({});
    await PlatformInvoice.deleteMany({});
    await MemberPayment.deleteMany({});
    await InvoiceCounter.deleteMany({});

    // 1. Create Owner & Gym & Branch
    const owner = await User.create({
      fullName: 'Gym Owner',
      email: 'owner@gym.com',
      phone: '9876543210',
      password: 'Password123',
      role: Role.GYM_OWNER,
      isActive: true,
    });

    const gym = await Gym.create({
      name: 'Spartan Gym',
      ownerId: owner._id,
      billingEmail: 'owner@gym.com',
      plan: GymPlan.BASIC,
      status: GymStatus.ACTIVE,
    });
    gymId = gym._id.toString();

    // Link gymId back to owner User document
    await User.findByIdAndUpdate(owner._id, { gymId: gym._id });

    const branch = await Branch.create({
      gymId: gym._id,
      name: 'Main Branch',
      address: { line1: 'L1', city: 'City', state: 'State', pincode: '000', country: 'Country' },
      contactPhone: '9998887776',
    });
    branchId = branch._id.toString();

    ownerToken = generateAccessToken({
      id: owner._id.toString(),
      role: Role.GYM_OWNER,
      gymId,
      branchId,
    });

    // 2. Onboard Member
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const member = await MemberService.createMember(gymId, branchId, {
      fullName: 'Member Bob',
      email: 'bob@member.com',
      phone: '9991112222',
      password: 'Password123',
      branchId,
      planName: 'Basic Plan',
      membershipStartDate: now,
      membershipEndDate: nextMonth,
    });

    memberDocId = member._id.toString();
    memberToken = generateAccessToken({
      id: member.userId.toString(),
      role: Role.MEMBER,
      gymId,
      branchId,
    });
  });

  describe('Platform SaaS Billing (B2B)', () => {
    it('should initiate plan upgrade order and process webhook to upgrade Gym plan to PRO', async () => {
      // 1. Initiate upgrade order
      const res = await request(app)
        .post('/api/v1/billing/platform/upgrade')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newPlan: GymPlan.PRO, billingCycle: 'MONTHLY' });

      expect(res.status).toBe(201);
      expect(res.body.data.order.orderId).toBeDefined();
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^PLT-\d{4}-\d{6}$/);

      const orderId = res.body.data.order.orderId;

      // 2. Simulate Webhook execution
      const webhookPayload = {
        event: 'payment.captured',
        orderId,
        paymentId: 'pay_rzp_mock_123',
        plan: GymPlan.PRO,
        billingCycle: 'MONTHLY',
      };

      const webhookRes = await request(app)
        .post('/api/v1/billing/platform/webhook')
        .set('x-razorpay-signature', 'mock_wb_sig_123')
        .send(webhookPayload);

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.data.success).toBe(true);

      // Verify Gym plan updated to PRO
      const updatedGym = await Gym.findById(gymId);
      expect(updatedGym?.plan).toBe(GymPlan.PRO);
      expect(updatedGym?.status).toBe(GymStatus.ACTIVE);
    });

    it('should suspend unpaid gyms past subscription expiration via checkAndSuspendUnpaidGyms()', async () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await Gym.findByIdAndUpdate(gymId, {
        plan: GymPlan.PRO,
        status: GymStatus.ACTIVE,
        subscriptionExpiresAt: pastDate,
      });

      const count = await PlatformBillingService.checkAndSuspendUnpaidGyms();
      expect(count).toBe(1);

      const suspendedGym = await Gym.findById(gymId);
      expect(suspendedGym?.status).toBe(GymStatus.SUSPENDED);
    });
  });

  describe('Member Payments & Billing (B2C)', () => {
    it('should allow staff to record manual cash payment with atomic invoice generation and membership renewal', async () => {
      const newEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      const res = await request(app)
        .post(`/api/v1/gyms/${gymId}/payments/manual`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          branchId,
          memberId: memberDocId,
          amount: 2500,
          purpose: 'membership_fee',
          method: 'cash',
          notes: 'Paid 2 months fee in cash',
          triggerRenewal: true,
          newEndDate: newEndDate.toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.invoiceNumber).toMatch(/^GYM-\d{4}-\d{6}$/);
      expect(res.body.data.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(res.body.data.payment.relatedMembershipRenewal).toBe(true);

      const updatedMember = await Member.findById(memberDocId);
      expect(new Date(updatedMember!.membershipEndDate).getTime()).toBeCloseTo(newEndDate.getTime(), -3);
    });

    it('should initiate online member order and complete payment via webhook', async () => {
      const initRes = await request(app)
        .post(`/api/v1/gyms/${gymId}/payments/online-order`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          branchId,
          memberId: memberDocId,
          amount: 1500,
          purpose: 'personal_training',
          notes: 'PT Session Package',
        });

      expect(initRes.status).toBe(201);
      const orderId = initRes.body.data.order.orderId;

      const webhookRes = await request(app)
        .post('/api/v1/billing/member/webhook')
        .set('x-razorpay-signature', 'mock_wb_sig_456')
        .send({
          event: 'payment.captured',
          orderId,
          paymentId: 'pay_member_999',
        });

      expect(webhookRes.status).toBe(200);

      const payment = await MemberPayment.findOne({ gatewayOrderId: orderId });
      expect(payment?.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should generate revenue summary aggregation for Owner Dashboard', async () => {
      await MemberPayment.create({
        gymId,
        branchId,
        memberId: memberDocId,
        amount: 2000,
        purpose: 'membership_fee',
        method: 'cash',
        status: PaymentStatus.SUCCESS,
        recordedByUserId: new mongoose.Types.ObjectId(),
        invoiceNumber: 'GYM-2026-999001',
        paidAt: new Date(),
      });

      const res = await request(app)
        .get(`/api/v1/gyms/${gymId}/payments/revenue-summary?groupBy=day`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.revenue.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.revenue[0].totalRevenue).toBe(2000);
    });

    it('should allow owner to refund a payment', async () => {
      const payment = await MemberPayment.create({
        gymId,
        branchId,
        memberId: memberDocId,
        amount: 1000,
        purpose: 'merchandise',
        method: 'cash',
        status: PaymentStatus.SUCCESS,
        recordedByUserId: new mongoose.Types.ObjectId(),
        invoiceNumber: 'GYM-2026-999002',
        paidAt: new Date(),
      });

      const refundRes = await request(app)
        .patch(`/api/v1/gyms/${gymId}/payments/${payment._id}/refund`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Defective T-Shirt returned' });

      expect(refundRes.status).toBe(200);
      expect(refundRes.body.data.payment.status).toBe(PaymentStatus.REFUNDED);
      expect(refundRes.body.data.payment.refundedAmount).toBe(1000);
    });
  });
});
