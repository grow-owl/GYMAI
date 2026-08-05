import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../modules/user/user.model';
import { Gym } from '../modules/gym/gym.model';
import { Branch } from '../modules/gym/branch.model';
import { Member } from '../modules/member/member.model';
import { Trainer } from '../modules/trainer/trainer.model';
import { Attendance } from '../modules/attendance/attendance.model';
import { MemberPayment } from '../modules/payment/memberPayment.model';
import { MemberGameStats } from '../modules/gamification/memberGameStats.model';
import { WorkoutPlan } from '../modules/workout/workoutPlan.model';
import { Exercise } from '../modules/workout/exercise.model';
import { MuscleGroup } from '../modules/workout/exercise.types';
import { DietPlan } from '../modules/dietPlan/dietPlan.model';
import { Product } from '../modules/product/product.model';
import { Equipment } from '../modules/equipment/equipment.model';
import { EquipmentStatus } from '../modules/equipment/equipment.types';
import { Expense } from '../modules/expense/expense.model';
import { ExpenseCategory } from '../modules/expense/expense.types';
import { Lead } from '../modules/lead/lead.model';
import { LeadStatus } from '../modules/lead/lead.types';
import { Role } from '../common/constants/roles.enum';
import { GymPlan, GymStatus } from '../modules/gym/gym.types';
import { MembershipStatus } from '../modules/member/member.types';
import { PaymentStatus } from '../modules/payment/platformSubscription.types';
import { AttendanceStatus } from '../modules/attendance/attendance.types';
import { PlanStatus } from '../modules/workout/workoutPlan.types';

async function seedCompleteDatabase() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI missing in .env');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    // 1. Create or Find Super Admin
    let admin = await User.findOne({ email: 'admin@admin.com' });
    if (!admin) {
      admin = new User({
        fullName: 'Super Admin',
        email: 'admin@admin.com',
        password: 'Admin@123',
        role: Role.SUPER_ADMIN,
        phone: '+919999999999',
        isActive: true,
        isEmailVerified: true,
      });
      await admin.save();
      console.log('✅ Created Super Admin: admin@admin.com / Admin@123');
    }

    // 2. Create or Find Gym Owner User
    let ownerUser = await User.findOne({ email: 'owner@gym.com' });
    if (!ownerUser) {
      ownerUser = new User({
        fullName: 'Vikram Malhotra (Owner)',
        email: 'owner@gym.com',
        password: 'Owner@123',
        role: Role.GYM_OWNER,
        phone: '+919876543210',
        isActive: true,
        isEmailVerified: true,
      });
      await ownerUser.save();
      console.log('✅ Created Gym Owner User: owner@gym.com / Owner@123');
    }

    // 3. Create or Find Primary Gym
    let gym = await Gym.findById('65a000000000000000000001') || await Gym.findOne({ ownerId: ownerUser._id });
    if (!gym) {
      gym = new Gym({
        _id: new mongoose.Types.ObjectId('65a000000000000000000001'),
        name: 'Spartan Fitness Center',
        ownerId: ownerUser._id,
        plan: GymPlan.PRO,
        status: GymStatus.ACTIVE,
        billingEmail: 'billing@spartanfitness.com',
        isMultiBranch: true,
      });
      await gym.save();
      console.log('✅ Created Gym: Spartan Fitness Center');
    }

    // Link GymId to Owner
    ownerUser.gymId = gym._id as any;
    await ownerUser.save();

    // 4. Create or Find Primary Branch
    let branch = await Branch.findById('65a000000000000000000002') || await Branch.findOne({ gymId: gym._id, name: 'Connaught Place Branch' });
    if (!branch) {
      branch = new Branch({
        _id: new mongoose.Types.ObjectId('65a000000000000000000002'),
        gymId: gym._id,
        name: 'Connaught Place Branch',
        address: {
          line1: 'Block A, Inner Circle',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India',
        },
        managerId: ownerUser._id,
        contactPhone: '+919876543210',
        timezone: 'Asia/Kolkata',
        isActive: true,
      });
      await branch.save();
      console.log('✅ Created Branch: Connaught Place Branch');
    }

    // Link BranchId to Owner
    ownerUser.branchId = branch._id as any;
    await ownerUser.save();

    // 5. Create Reception Staff User
    let receptionUser = await User.findOne({ email: 'reception@gym.com' });
    if (!receptionUser) {
      receptionUser = new User({
        fullName: 'Front Desk Officer',
        email: 'reception@gym.com',
        password: 'Reception@123',
        role: Role.KIOSK,
        gymId: gym._id as any,
        branchId: branch._id as any,
        phone: '+919811122233',
        isActive: true,
        isEmailVerified: true,
      });
      await receptionUser.save();
      console.log('✅ Created Reception User: reception@gym.com / Reception@123');
    }

    // 6. Create 2 Trainers
    const trainerSeedData = [
      { name: 'Rajesh Sharma', email: 'trainer1@gym.com', phone: '+919822233344', specs: ['Bodybuilding', 'Hypertrophy'] },
      { name: 'Rohan Verma', email: 'trainer2@gym.com', phone: '+919833344455', specs: ['Fat Loss', 'Crossfit'] },
    ];

    const trainerDocs: any[] = [];
    for (const tData of trainerSeedData) {
      let tUser = await User.findOne({ email: tData.email });
      if (!tUser) {
        tUser = new User({
          fullName: tData.name,
          email: tData.email,
          password: 'Trainer@123',
          role: Role.TRAINER,
          gymId: gym._id as any,
          branchId: branch._id as any,
          phone: tData.phone,
          isActive: true,
          isEmailVerified: true,
        });
        await tUser.save();
      }

      let trainerDoc = await Trainer.findOne({ userId: tUser._id });
      if (!trainerDoc) {
        trainerDoc = new Trainer({
          userId: tUser._id,
          gymId: gym._id as any,
          branchId: branch._id as any,
          specializations: tData.specs,
          bio: `Certified fitness trainer with 5+ years experience in ${tData.specs.join(' & ')}.`,
          maxMemberCapacity: 25,
        });
        await trainerDoc.save();
      }
      trainerDocs.push(trainerDoc);
      console.log(`✅ Seeded Trainer: ${tData.name} (${tData.email})`);
    }

    // 7. Create 5 Members & Member Accounts
    const memberSeedData = [
      { name: 'Amit Kumar', email: 'member1@gym.com', phone: '+919900011101', plan: 'Platinum 12-Month', amount: 25000 },
      { name: 'Priya Sharma', email: 'member2@gym.com', phone: '+919900011102', plan: 'Gold 6-Month', amount: 15000 },
      { name: 'Rohan Gupta', email: 'member3@gym.com', phone: '+919900011103', plan: 'Platinum 12-Month', amount: 25000 },
      { name: 'Ananya Patel', email: 'member4@gym.com', phone: '+919900011104', plan: 'Monthly Elite', amount: 5000 },
      { name: 'Devendra Singh', email: 'member5@gym.com', phone: '+919900011105', plan: 'Platinum 12-Month', amount: 25000 },
    ];

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const createdMemberDocs: any[] = [];
    let memberIndex = 0;
    for (const mData of memberSeedData) {
      memberIndex++;
      let mUser = await User.findOne({ email: mData.email });
      if (!mUser) {
        mUser = new User({
          fullName: mData.name,
          email: mData.email,
          password: 'Member@123',
          role: Role.MEMBER,
          gymId: gym._id as any,
          branchId: branch._id as any,
          phone: mData.phone,
          isActive: true,
          isEmailVerified: true,
        });
        await mUser.save();
      }

      let memberDoc = await Member.findOne({ userId: mUser._id });
      if (!memberDoc) {
        const endDate = memberIndex <= 2 ? in5Days : in30Days;
        memberDoc = new Member({
          userId: mUser._id,
          gymId: gym._id as any,
          branchId: branch._id as any,
          assignedTrainerId: trainerDocs[memberIndex % 2]._id,
          membershipStatus: MembershipStatus.ACTIVE,
          membershipStartDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          membershipEndDate: endDate,
          planName: mData.plan,
          qrCode: `QR-SPARTAN-${mUser._id}`,
          referralCode: `REF-${mData.name.split(' ')[0].toUpperCase()}-100`,
          healthInfo: {
            height_cm: 175,
            currentWeight_kg: 78.5 - memberIndex,
            targetWeight_kg: 72.0,
          },
        });
        await memberDoc.save();
      }
      createdMemberDocs.push(memberDoc);

      // Create Member Payment Record (Success)
      const existingPay = await MemberPayment.findOne({ memberId: memberDoc._id });
      if (!existingPay) {
        await MemberPayment.create({
          gymId: gym._id,
          branchId: branch._id,
          memberId: memberDoc._id,
          amount: mData.amount,
          currency: 'INR',
          purpose: 'membership_fee',
          method: 'upi',
          status: PaymentStatus.SUCCESS,
          invoiceNumber: `INV-SPARTAN-${Date.now()}-${memberIndex}`,
          recordedByUserId: ownerUser._id,
          paidAt: now,
        });
      }

      // Create Attendance Logs
      const existingAtt = await Attendance.findOne({ memberId: memberDoc._id, dayKey: todayKey });
      if (!existingAtt) {
        await Attendance.create({
          gymId: gym._id,
          branchId: branch._id,
          memberId: memberDoc._id,
          checkInAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          checkOutAt: memberIndex > 2 ? new Date(now.getTime() - 1 * 60 * 60 * 1000) : undefined,
          durationMinutes: memberIndex > 2 ? 60 : undefined,
          status: memberIndex > 2 ? AttendanceStatus.CHECKED_OUT : AttendanceStatus.CHECKED_IN,
          checkInSource: 'QR',
          dayKey: todayKey,
        });
      }

      // Create Gamification Stats
      let gProf = await MemberGameStats.findOne({ memberId: memberDoc._id });
      if (!gProf) {
        await MemberGameStats.create({
          gymId: gym._id,
          memberId: memberDoc._id,
          level: memberIndex + 1,
          totalXp: 1200 * memberIndex,
          currentStreakDays: 3 + memberIndex,
          maxStreakDays: 15,
        });
      }

      console.log(`✅ Seeded Member: ${mData.name} (${mData.email})`);
    }

    // 8. Seed Products / Store Items
    const productSeedData = [
      { name: 'Whey Protein Isolate (2kg)', category: 'supplement', price: 3499, stockQuantity: 18 },
      { name: 'Creatine Monohydrate (250g)', category: 'supplement', price: 999, stockQuantity: 4 },
      { name: 'BCAA Powder (300g)', category: 'supplement', price: 1499, stockQuantity: 12 },
      { name: 'GYMAI Shaker Bottle', category: 'merchandise', price: 399, stockQuantity: 45 },
      { name: 'Heavy Duty Lifting Belt', category: 'merchandise', price: 1299, stockQuantity: 8 },
    ];

    for (const pData of productSeedData) {
      let prod = await Product.findOne({ gymId: gym._id, name: pData.name });
      if (!prod) {
        await Product.create({
          gymId: gym._id,
          name: pData.name,
          category: pData.category as any,
          price: pData.price,
          stockQuantity: pData.stockQuantity,
          isActive: true,
        });
      }
    }
    console.log('✅ Seeded Store Products');

    // 9. Seed Equipment Items
    const equipmentSeedData = [
      { name: 'Treadmill Commercial (x6)', category: 'cardio', status: EquipmentStatus.WORKING },
      { name: 'Cable Crossover Station', category: 'strength', status: EquipmentStatus.MAINTENANCE },
      { name: 'Olympics Smith Machine', category: 'strength', status: EquipmentStatus.WORKING },
    ];

    for (const eqData of equipmentSeedData) {
      let eq = await Equipment.findOne({ gymId: gym._id, name: eqData.name });
      if (!eq) {
        await Equipment.create({
          gymId: gym._id,
          branchId: branch._id,
          name: eqData.name,
          category: eqData.category,
          status: eqData.status,
          purchaseDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
          lastServicedDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        });
      }
    }
    console.log('✅ Seeded Equipment');

    // 10. Seed Operating Expenses
    const expenseSeedData = [
      { description: 'Trainer & Staff Salaries', category: ExpenseCategory.SALARY, amount: 45000 },
      { description: 'Gym Rent - Connaught Place', category: ExpenseCategory.RENT, amount: 65000 },
      { description: 'Electricity & AC Power Utilities', category: ExpenseCategory.UTILITIES, amount: 18500 },
    ];

    for (const expData of expenseSeedData) {
      let exp = await Expense.findOne({ gymId: gym._id, description: expData.description });
      if (!exp) {
        await Expense.create({
          gymId: gym._id,
          branchId: branch._id,
          description: expData.description,
          category: expData.category,
          amount: expData.amount,
          recordedByUserId: ownerUser._id,
          expenseDate: now,
        });
      }
    }
    console.log('✅ Seeded Operating Expenses');

    // 11. Seed Leads
    const leadSeedData = [
      { fullName: 'Siddharth Kapoor', phone: '+919877788899', email: 'siddharth@gmail.com', status: LeadStatus.NEW, source: 'Website Inquiry' },
      { fullName: 'Kavita Roy', phone: '+919877788811', email: 'kavita@gmail.com', status: LeadStatus.TRIAL_SCHEDULED, source: 'Instagram Ad' },
    ];

    for (const lData of leadSeedData) {
      let lead = await Lead.findOne({ gymId: gym._id, phone: lData.phone });
      if (!lead) {
        await Lead.create({
          gymId: gym._id,
          branchId: branch._id,
          fullName: lData.fullName,
          phone: lData.phone,
          email: lData.email,
          status: lData.status,
          source: lData.source,
        });
      }
    }
    console.log('✅ Seeded Leads');

    // 12. Seed Exercises & Workout Plan
    let ex1 = await Exercise.findOne({ name: 'Barbell Bench Press' });
    if (!ex1) {
      ex1 = await Exercise.create({
        name: 'Barbell Bench Press',
        muscleGroup: MuscleGroup.CHEST,
        equipment: 'Barbell',
        instructions: 'Lie flat on bench, lower barbell to mid-chest, press upward explosively.',
      });
    }

    let ex2 = await Exercise.findOne({ name: 'Incline Dumbbell Press' });
    if (!ex2) {
      ex2 = await Exercise.create({
        name: 'Incline Dumbbell Press',
        muscleGroup: MuscleGroup.CHEST,
        equipment: 'Dumbbell',
        instructions: 'Set bench to 30 degrees incline and press dumbbells vertically.',
      });
    }

    let wPlan = await WorkoutPlan.findOne({ gymId: gym._id, title: 'Hypertrophy Push Day' });
    if (!wPlan) {
      await WorkoutPlan.create({
        gymId: gym._id,
        branchId: branch._id,
        memberId: createdMemberDocs[0]._id,
        creatorUserId: trainerDocs[0].userId,
        title: 'Hypertrophy Push Day',
        description: 'Target chest, shoulders and triceps for lean muscle building',
        daysPerWeek: 4,
        targetGoal: 'HYPERTROPHY',
        exercises: [
          { exerciseId: ex1._id, sets: 4, reps: '10-12', restSeconds: 90 },
          { exerciseId: ex2._id, sets: 3, reps: '12-15', restSeconds: 60 },
        ],
      });
    }

    // 13. Seed Diet Plan
    let dPlan = await DietPlan.findOne({ gymId: gym._id, title: 'High Protein Muscle Plan' });
    if (!dPlan) {
      await DietPlan.create({
        gymId: gym._id,
        memberId: createdMemberDocs[0]._id,
        createdByTrainerId: trainerDocs[0]._id,
        title: 'High Protein Muscle Plan',
        dailyCalorieTarget: 2600,
        dailyProteinTarget_g: 175,
        startDate: now,
        status: PlanStatus.ACTIVE,
        meals: [
          {
            mealType: 'breakfast',
            items: [
              { name: 'Eggs', quantity: '4 whole', calories: 280, protein_g: 24 },
              { name: 'Oats with Milk', quantity: '1 bowl', calories: 350, protein_g: 12 },
            ],
            notes: 'Take with multivitamin',
          },
          {
            mealType: 'lunch',
            items: [
              { name: 'Grilled Chicken Breast', quantity: '200g', calories: 330, protein_g: 62 },
              { name: 'Brown Rice', quantity: '150g', calories: 200, protein_g: 5 },
            ],
          },
          {
            mealType: 'snack',
            items: [
              { name: 'Whey Protein Isolate', quantity: '1 scoop', calories: 120, protein_g: 25 },
              { name: 'Large Banana', quantity: '1 unit', calories: 105, protein_g: 1 },
            ],
          },
        ],
      });
    }

    console.log('🎉 REAL DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Summary of Accounts Created:');
    console.log('----------------------------------------------------');
    console.log('• Super Admin:  admin@admin.com    / Admin@123');
    console.log('• Gym Owner:    owner@gym.com      / Owner@123');
    console.log('• Trainer:      trainer1@gym.com   / Trainer@123');
    console.log('• Reception:    reception@gym.com  / Reception@123');
    console.log('• Member:       member1@gym.com    / Member@123');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
}

seedCompleteDatabase();
