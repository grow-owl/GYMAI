import { Types } from 'mongoose';

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  TRIAL_SCHEDULED = 'TRIAL_SCHEDULED',
  TRIAL_COMPLETED = 'TRIAL_COMPLETED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export interface ILeadNote {
  note: string;
  addedByUserId: Types.ObjectId;
  addedAt: Date;
}

export interface ILead {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  branchId: Types.ObjectId;
  fullName: string;
  phone: string;
  email?: string;
  source?: string;
  status: LeadStatus;
  trialDate?: Date;
  followUpNotes: ILeadNote[];
  convertedMemberId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
