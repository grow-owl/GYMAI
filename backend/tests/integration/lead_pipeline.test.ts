import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/modules/user/user.model';
import { Gym } from '../../src/modules/gym/gym.model';
import { Branch } from '../../src/modules/gym/branch.model';
import { Lead } from '../../src/modules/lead/lead.model';
import { SaasInquiry } from '../../src/modules/saasInquiry/saasInquiry.model';
import { Role } from '../../src/common/constants/roles.enum';
import { GymPlan, GymStatus } from '../../src/modules/gym/gym.types';
import { generateAccessToken } from '../../src/common/utils/generateTokens';

let mongoServer: MongoMemoryServer;
let superAdminToken: string;
let testGym: any;
let testBranch: any;

describe('Dual-Track Lead Pipeline & Dynamic Trial Engine Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);

    // Seed Super Admin
    const admin = await User.create({
      fullName: 'Super Admin',
      email: 'admin@gymai.com',
      phone: '9999999999',
      password: 'Password123',
      role: Role.SUPER_ADMIN,
    });
    superAdminToken = generateAccessToken({
      id: admin._id.toString(),
      role: Role.SUPER_ADMIN,
    });

    // Seed Gym with Branch
    const owner = await User.create({
      fullName: 'Gym Owner Dave',
      email: 'dave@gym.com',
      phone: '9888877777',
      password: 'Password123',
      role: Role.GYM_OWNER,
    });

    testGym = await Gym.create({
      name: 'Iron Pulse Gym',
      ownerId: owner._id,
      billingEmail: 'dave@gym.com',
      plan: GymPlan.TRIAL,
      status: GymStatus.ACTIVE,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days trial
      settings: {
        defaultTrialPassDays: 3,
      },
    });

    testBranch = await Branch.create({
      gymId: testGym._id,
      name: 'Andheri West Branch',
      address: {
        line1: '101 Fitness Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
        country: 'India',
      },
      contactPhone: '9888877777',
      isPrimary: true,
      isActive: true,
    });
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await User.deleteMany({});
      await Gym.deleteMany({});
      await Branch.deleteMany({});
      await Lead.deleteMany({});
      await SaasInquiry.deleteMany({});
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Track 1: B2B SaaS Leads (Super Admin Pipeline)', () => {
    let createdInquiryId: string;

    it('should allow gym owner to submit B2B SaaS demo inquiry from /register', async () => {
      const res = await request(app).post('/api/v1/public/saas-inquiry').send({
        ownerName: 'Sunil Gavaskar',
        gymName: 'Sunny Fitness Club',
        phone: '9820123456',
        city: 'Mumbai',
        email: 'sunil@sunnyfitness.com',
        message: 'Looking for 3 branch management with automated WhatsApp reminders',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerName).toBe('Sunil Gavaskar');
      expect(res.body.data.gymName).toBe('Sunny Fitness Club');
      createdInquiryId = res.body.data.id;
    });

    it('should list inquiries for Super Admin on /admin panel', async () => {
      const res = await request(app)
        .get('/api/v1/admin/saas-inquiries')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.inquiries)).toBe(true);
      expect(res.body.data.inquiries.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow Super Admin to update inquiry status and record notes', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/saas-inquiries/${createdInquiryId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'CONTACTED',
          note: 'Called owner, scheduled live demo for tomorrow 4 PM',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CONTACTED');
      expect(res.body.data.notes.length).toBe(1);
      expect(res.body.data.notes[0].note).toContain('scheduled live demo');
    });
  });

  describe('Track 2: B2C Member Leads (Gym-Branded Trial Pass)', () => {
    it('should fetch branded branch details and configured trial days via public URL', async () => {
      const res = await request(app).get(`/api/v1/public/branches/${testBranch._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gym.name).toBe('Iron Pulse Gym');
      expect(res.body.data.gym.defaultTrialPassDays).toBe(3);
      expect(res.body.data.branch.name).toBe('Andheri West Branch');
    });

    it('should allow prospective member to claim a trial workout pass', async () => {
      const res = await request(app).post('/api/v1/public/leads').send({
        branchId: testBranch._id.toString(),
        fullName: 'Aakash Verma',
        phone: '9876500001',
        email: 'aakash@gmail.com',
        fitnessGoal: 'Fat Loss & Stamina',
        preferredTiming: 'Morning (6 AM - 10 AM)',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trialDays).toBe(3);

      const savedLead = await Lead.findOne({ phone: '9876500001' });
      expect(savedLead).toBeDefined();
      expect(savedLead?.fullName).toBe('Aakash Verma');
      expect(savedLead?.source).toBe('Public Join Link');
      expect(savedLead?.gymId.toString()).toBe(testGym._id.toString());
    });
  });

  describe('Real-Time Trial Expiry & Access Revocation', () => {
    it('should automatically mark gym TRIAL_EXPIRED and block access if trialEndsAt is in the past', async () => {
      // Create an expired trial gym
      const expiredOwner = await User.create({
        fullName: 'Expired Owner',
        email: 'expired@gym.com',
        phone: '9111111111',
        password: 'Password123',
        role: Role.GYM_OWNER,
      });

      const expiredGym = await Gym.create({
        name: 'Past Due Gym',
        ownerId: expiredOwner._id,
        billingEmail: 'expired@gym.com',
        plan: GymPlan.TRIAL,
        status: GymStatus.ACTIVE,
        trialEndsAt: new Date(Date.now() - 1000 * 60 * 60), // Expired 1 hour ago
      });

      const expiredBranch = await Branch.create({
        gymId: expiredGym._id,
        name: 'Expired Branch',
        address: { line1: 'Old Rd', city: 'Delhi', state: 'Delhi', pincode: '110001', country: 'India' },
        contactPhone: '9111111111',
        isPrimary: true,
        isActive: true,
      });

      await User.findByIdAndUpdate(expiredOwner._id, {
        gymId: expiredGym._id,
        branchId: expiredBranch._id,
      });

      const expiredOwnerToken = generateAccessToken({
        id: expiredOwner._id.toString(),
        role: Role.GYM_OWNER,
        gymId: expiredGym._id.toString(),
        branchId: expiredBranch._id.toString(),
      });

      // Attempt to access any standard protected endpoint (e.g. leads)
      const res = await request(app)
        .get(`/api/v1/gyms/${expiredGym._id}/branches/${expiredBranch._id}/leads`)
        .set('Authorization', `Bearer ${expiredOwnerToken}`);

      // Middleware should detect expired trial real-time and block with 403 Forbidden
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Your free trial has expired');

      // Verify gym status is updated to TRIAL_EXPIRED
      const updatedGym = await Gym.findById(expiredGym._id);
      expect(updatedGym?.status).toBe(GymStatus.TRIAL_EXPIRED);
    });
  });
});
