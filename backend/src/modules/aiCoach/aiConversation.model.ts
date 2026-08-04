import mongoose, { Schema, Model } from 'mongoose';
import { IAIConversation } from './aiCoach.types';

const aiConversationSchema = new Schema<IAIConversation>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    gymId: {
      type: Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

aiConversationSchema.index({ memberId: 1, lastMessageAt: -1 });

export const AIConversation: Model<IAIConversation> = mongoose.model<IAIConversation>(
  'AIConversation',
  aiConversationSchema
);
