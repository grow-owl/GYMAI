import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/modules/user/user.model';
import { Gym } from '../../src/modules/gym/gym.model';
import { Branch } from '../../src/modules/gym/branch.model';
import { Member } from '../../src/modules/member/member.model';
import { Lead } from '../../src/modules/lead/lead.model';
import { MemberPayment } from '../../src/modules/payment/memberPayment.model';
import { WhatsAppMessageLog } from '../../src/modules/notification/whatsapp/whatsAppMessageLog.model';
import { MembershipReminderLog } from '../../src/jobs/membershipReminderLog.model';
import { BirthdayReminderLog } from '../../src/jobs/birthdayReminderLog.model';
import { MemberService } from '../../src/modules/member/member.service';
import { LeadService } from '../../src/modules/lead/lead.service';
import { MemberPaymentService } from '../../src/modules/payment/memberPayment.service';
import { GamificationService } from '../../src/modules/gamification/gamification.service';
import { MembershipReminderJob } from '../../src/jobs/membershipReminder.job';
import { BirthdayReminderJob } from '../../src/jobs/birthdayReminder.job';
import { Role } from '../../src/common/constants/roles.enum';
import { MembershipStatus } from '../../src/modules/member/member.types';
import { generateAccessToken } from '../../src/common/utils/generateTokens';

let mongoServer: MongoMemoryServer;
let ownerToken: string;
let ownerUserId: string;
let gymId: string;
let branchId: string;
let referrerMemberDocId: string;
let referralCode: string;

describe('WhatsApp Notification Completion & Referral System Tests', () => {
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
    await Lead.deleteMany({});
    await MemberPayment.deleteMany({});
    await WhatsAppMessageLog.deleteMany({});
    await MembershipReminderLog.deleteMany({});
    await BirthdayReminderLog.deleteMany({});

    // 1. Create Gym Owner
    const owner = await User.create({
      fullName: 'Gym Owner',
      email: 'owner@whatsappcomplete.com',
      password: 'password123',
      role: Role.GYM_OWNER,
      phone: '+919876543210',
    });
    ownerUserId = owner._id.toString();

    const gym = await Gym.create({
      name: 'PowerGym SaaS',
      ownerId: owner._id,
      slug: 'powergym-saas',
      billingEmail: 'billing@powergym.com',
    });
    gymId = gym._id.toString();

    const branch = await Branch.create({
      gymId: gym._id,
      name: 'Central Branch',
      code: 'CB-01',
      address: { line1: '100 Main St', city: 'Delhi', state: 'DL', pincode: '110001', country: 'India' },
      contactPhone: '+919876543210',
    });
    branchId = branch._id.toString();

    owner.gymId = gym._id;
    owner.branchId = branch._id;
    await owner.save();

    ownerToken = generateAccessToken({
      id: owner._id.toString(),
      role: Role.GYM_OWNER,
      gymId,
      branchId,
    });

    // 2. Onboard Referrer Member with Birthday today
    const today = new Date();
    const referrerMember = await MemberService.createMember(gymId, branchId, {
      fullName: 'Alice Referrer',
      email: 'alice@referral.com',
      phone: '+919876543211',
      planName: 'Gold Plan',
      membershipStartDate: new Date(),
      membershipEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dateOfBirth: today,
      referralCode: 'REF-ALICE1',
    });

    referrerMemberDocId = referrerMember._id.toString();
    referralCode = referrerMember.referralCode || 'REF-ALICE1';
  });

  it('should send WELCOME_NEW_MEMBER WhatsApp notification when member is created', async () => {
    const log = await WhatsAppMessageLog.findOne({
      memberId: referrerMemberDocId,
      templateName: 'WELCOME_NEW_MEMBER',
    });

    expect(log).toBeDefined();
    expect(log?.status).toBe('SENT');
    expect(log?.phone).toBe('+919876543211');
  });

  it('should resolve referralCode on Lead creation and set source to REFERRAL:<referrerMemberId>', async () => {
    const lead = await LeadService.createLead(gymId, branchId, {
      fullName: 'New Prospect',
      phone: '+919876543299',
      email: 'prospect@gmail.com',
      referralCode: referralCode,
    });

    expect(lead.source).toBe(`REFERRAL:${referrerMemberDocId}`);
  });

  it('should send WhatsApp notification for PAYMENT_SUCCESS on manual payment', async () => {
    await MemberPaymentService.recordManualPayment(gymId, ownerUserId, {
      memberId: referrerMemberDocId,
      amount: 4999,
      method: 'cash',
      purpose: 'membership_fee',
      renewMembership: true,
      renewMonths: 1,
    });

    const paymentLog = await WhatsAppMessageLog.findOne({
      memberId: referrerMemberDocId,
      templateName: 'PAYMENT_SUCCESS',
    });

    expect(paymentLog).toBeDefined();
    expect(paymentLog?.status).toBe('SENT');
  });

  it('should send WhatsApp notification for STREAK_MILESTONE when member reaches 7-day streak', async () => {
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const stats = await GamificationService.getOrCreateMemberGameStats(referrerMemberDocId);
    stats.currentStreak = 6;
    stats.lastActivityDayKey = yesterdayStr;
    await stats.save();

    await GamificationService.recordCheckInForStreak(referrerMemberDocId, gymId);

    const streakLog = await WhatsAppMessageLog.findOne({
      memberId: referrerMemberDocId,
      templateName: 'STREAK_MILESTONE',
    });

    expect(streakLog).toBeDefined();
    expect(streakLog?.status).toBe('SENT');
  });

  it('should trigger BIRTHDAY_WISH WhatsApp notification for members born today and prevent duplicate sends', async () => {
    const run1 = await BirthdayReminderJob.runBirthdayWishes(gymId);
    expect(run1.processedGyms).toBe(1);
    expect(run1.wishesSent).toBe(1);

    const bdayLog = await WhatsAppMessageLog.findOne({
      memberId: referrerMemberDocId,
      templateName: 'BIRTHDAY_WISH',
    });
    expect(bdayLog).toBeDefined();

    // Second run should be skipped due to BirthdayReminderLog unique index
    const run2 = await BirthdayReminderJob.runBirthdayWishes(gymId);
    expect(run2.wishesSent).toBe(0);
    expect(run2.skippedDuplicates).toBe(1);
  });

  it('should send REFERRAL_ASK WhatsApp notification via manual endpoint POST /api/v1/members/:memberId/referral-ask', async () => {
    const res = await request(app)
      .post(`/api/v1/members/${referrerMemberDocId}/referral-ask`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.referralCode).toBe('REF-ALICE1');

    const log = await WhatsAppMessageLog.findOne({
      memberId: referrerMemberDocId,
      templateName: 'REFERRAL_ASK',
    });

    expect(log).toBeDefined();
    expect(log?.status).toBe('SENT');
  });

  it('should process RENEWAL_DISCOUNT_OFFER in membershipReminder job for expired members', async () => {
    // Set member as expired 4 days ago
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Member.findByIdAndUpdate(referrerMemberDocId, {
      membershipEndDate: fourDaysAgo,
      membershipStatus: MembershipStatus.EXPIRED,
    });

    const reminderResult = await MembershipReminderJob.runReminders(gymId);
    expect(reminderResult.remindersSent).toBeGreaterThanOrEqual(1);

    const offerLog = await WhatsAppMessageLog.findOne({
      memberId: referrerMemberDocId,
      templateName: 'RENEWAL_DISCOUNT_OFFER',
    });

    expect(offerLog).toBeDefined();
    expect(offerLog?.status).toBe('SENT');
  });
});
