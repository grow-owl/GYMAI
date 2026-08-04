import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/modules/user/user.model';
import { Gym } from '../../src/modules/gym/gym.model';
import { Branch } from '../../src/modules/gym/branch.model';
import { Member } from '../../src/modules/member/member.model';
import { Attendance } from '../../src/modules/attendance/attendance.model';
import { MemberPayment } from '../../src/modules/payment/memberPayment.model';
import { WhatsAppMessageLog } from '../../src/modules/notification/whatsapp/whatsAppMessageLog.model';
import { MembershipReminderLog } from '../../src/jobs/membershipReminderLog.model';
import { MembershipReminderJob } from '../../src/jobs/membershipReminder.job';
import { WhatsAppProviderFactory } from '../../src/modules/notification/whatsapp/whatsapp.factory';
import { WhatsAppNotificationService } from '../../src/modules/notification/whatsapp/whatsappNotification.service';
import { Role } from '../../src/common/constants/roles.enum';
import { MembershipStatus } from '../../src/modules/member/member.types';
import { generateAccessToken } from '../../src/common/utils/generateTokens';

let mongoServer: MongoMemoryServer;
let ownerToken: string;
let gymId: string;
let branchId: string;
let memberDocId: string;

describe('WhatsApp Provider & Automated Reminders Integration Tests', () => {
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
    await Attendance.deleteMany({});
    await MemberPayment.deleteMany({});
    await WhatsAppMessageLog.deleteMany({});
    await MembershipReminderLog.deleteMany({});

    // 1. Create Owner & Gym & Branch
    const owner = await User.create({
      fullName: 'Gym Owner',
      email: 'owner@whatsappgym.com',
      password: 'password123',
      role: Role.GYM_OWNER,
      phone: '+919876543210',
    });

    const gym = await Gym.create({
      name: 'WhatsApp Fitness Gym',
      ownerId: owner._id,
      slug: 'whatsapp-fitness',
      billingEmail: 'billing@whatsappgym.com',
    });
    gymId = gym._id.toString();

    const branch = await Branch.create({
      gymId: gym._id,
      name: 'Main Branch',
      code: 'WB-01',
      address: { line1: '123 Tech Park', city: 'Mumbai', state: 'MH', pincode: '400001', country: 'India' },
      contactPhone: '+919876543210',
    });
    branchId = branch._id.toString();

    owner.gymId = gym._id;
    owner.branchId = branch._id;
    await owner.save();

    ownerToken = generateAccessToken({
      id: owner._id.toString(),
      role: Role.GYM_OWNER,
      gymId: gymId,
      branchId: branchId,
    });

    // 2. Create Member expiring in 7 days
    const memberUser = await User.create({
      fullName: 'Expiring Member',
      email: 'expiring@whatsappgym.com',
      password: 'password123',
      role: Role.MEMBER,
      phone: '+919999888877',
      gymId: gym._id,
      branchId: branch._id,
    });

    const now = Date.now();
    const in7Days = new Date(now + 7 * 24 * 60 * 60 * 1000);

    const member = await Member.create({
      userId: memberUser._id,
      gymId: gym._id,
      branchId: branch._id,
      membershipStatus: MembershipStatus.ACTIVE,
      planName: 'Standard Plan',
      membershipStartDate: new Date(),
      membershipEndDate: in7Days,
      qrCode: `QR_${Date.now()}_1`,
      fitnessGoals: ['weight_loss'],
    });
    memberDocId = member._id.toString();
  });

  describe('WhatsApp Provider Factory Mock Fallback', () => {
    it('should use Mock WhatsApp Provider in test environment', () => {
      expect(WhatsAppProviderFactory.isMockMode()).toBe(true);
      const provider = WhatsAppProviderFactory.getProvider();
      expect(provider.name).toBe('MOCK_WHATSAPP');
    });

    it('should send WhatsApp notification and write WhatsAppMessageLog audit entry', async () => {
      const success = await WhatsAppNotificationService.sendWhatsApp(
        memberDocId,
        gymId,
        'MEMBERSHIP_EXPIRING_7D',
        ['7']
      );

      expect(success).toBe(true);

      const log = await WhatsAppMessageLog.findOne({ memberId: memberDocId });
      expect(log).toBeDefined();
      expect(log?.phone).toBe('+919999888877');
      expect(log?.status).toBe('SENT');
      expect(log?.providerMessageId).toContain('wmid.mock_');
    });
  });

  describe('Automated Reminder Scheduler & Manual Ops Trigger', () => {
    it('should send 7D expiry reminder and log reminder tier', async () => {
      const result = await MembershipReminderJob.runReminders(gymId);

      expect(result.processedGyms).toBe(1);
      expect(result.remindersSent).toBeGreaterThanOrEqual(1);

      const reminderLog = await MembershipReminderLog.findOne({ memberId: memberDocId, tier: '7D' });
      expect(reminderLog).toBeDefined();
    });

    it('should PREVENT duplicate reminder sends on repeated runs on the same day', async () => {
      // First Run
      const run1 = await MembershipReminderJob.runReminders(gymId);
      expect(run1.remindersSent).toBeGreaterThanOrEqual(1);

      // Second Run on same day
      const run2 = await MembershipReminderJob.runReminders(gymId);
      expect(run2.remindersSent).toBe(0);
      expect(run2.skippedDuplicates).toBeGreaterThanOrEqual(1);
    });

    it('should trigger reminder job manually via API endpoint POST /api/v1/gyms/:gymId/jobs/run-reminders', async () => {
      const res = await request(app)
        .post(`/api/v1/gyms/${gymId}/jobs/run-reminders`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.processedGyms).toBe(1);
    });
  });
});
