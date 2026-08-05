import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../modules/user/user.model';
import { Trainer } from '../modules/trainer/trainer.model';
import { Member } from '../modules/member/member.model';

async function cleanFakeAutoSeeds() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) process.exit(1);

  await mongoose.connect(mongoUri);
  console.log('Connected to DB for cleaning...');

  const fakeEmails = [
    "vikram@gym.com", "neha@gym.com", "karan@gym.com",
    "aarav.sharma@example.com", "priya.patel@example.com", "rohan.v@example.com", "sneha.r@example.com",
    "rahul.s@example.com", "ananya@example.com", "sameer@example.com", "pooja@example.com"
  ];

  const fakeUsers = await User.find({ email: { $in: fakeEmails } });
  const fakeUserIds = fakeUsers.map(u => u._id);

  if (fakeUserIds.length > 0) {
    await Trainer.deleteMany({ userId: { $in: fakeUserIds } });
    await Member.deleteMany({ userId: { $in: fakeUserIds } });
    await User.deleteMany({ _id: { $in: fakeUserIds } });
    console.log(`Deleted ${fakeUserIds.length} fake auto-seeded user records.`);
  }

  await mongoose.disconnect();
  console.log('Cleanup finished.');
}

cleanFakeAutoSeeds();
