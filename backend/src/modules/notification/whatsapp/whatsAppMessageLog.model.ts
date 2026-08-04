import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessageLog {
  _id: mongoose.Types.ObjectId;
  gymId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  phone: string;
  templateName?: string;
  params?: string[];
  body?: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  providerMessageId?: string;
  sentAt: Date;
  errorReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppMessageLogDocument extends Omit<IWhatsAppMessageLog, '_id'>, Document {}

const whatsAppMessageLogSchema = new Schema<WhatsAppMessageLogDocument>(
  {
    gymId: {
      type: Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    templateName: {
      type: String,
      trim: true,
    },
    params: {
      type: [String],
      default: [],
    },
    body: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['SENT', 'FAILED', 'PENDING'],
      default: 'PENDING',
      required: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    errorReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

whatsAppMessageLogSchema.index({ gymId: 1, memberId: 1, sentAt: -1 });

export const WhatsAppMessageLog = mongoose.model<WhatsAppMessageLogDocument>(
  'WhatsAppMessageLog',
  whatsAppMessageLogSchema
);
