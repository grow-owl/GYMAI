import mongoose, { Schema, Document } from 'mongoose';
import { ILead, LeadStatus } from './lead.types';

export interface LeadDocument extends Omit<ILead, '_id'>, Document {}

const leadNoteSchema = new Schema(
  {
    note: {
      type: String,
      required: true,
      trim: true,
    },
    addedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const leadSchema = new Schema<LeadDocument>(
  {
    gymId: {
      type: Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    source: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
      required: true,
    },
    trialDate: {
      type: Date,
    },
    followUpNotes: {
      type: [leadNoteSchema],
      default: [],
    },
    convertedMemberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ gymId: 1, branchId: 1, status: 1 });

export const Lead = mongoose.model<LeadDocument>('Lead', leadSchema);
