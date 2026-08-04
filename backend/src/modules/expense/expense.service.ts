import mongoose from 'mongoose';
import { Expense } from './expense.model';
import { IExpense, ExpenseCategory } from './expense.types';
import { MemberPaymentService } from '../payment/memberPayment.service';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';

export interface RecordExpenseInput {
  branchId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate?: Date;
  isRecurring?: boolean;
}

export class ExpenseService {
  public static async recordExpense(
    gymId: string,
    recordedByUserId: string,
    input: RecordExpenseInput
  ): Promise<IExpense> {
    const expense = new Expense({
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: new mongoose.Types.ObjectId(input.branchId),
      category: input.category,
      amount: input.amount,
      description: input.description,
      expenseDate: input.expenseDate || new Date(),
      recordedByUserId: new mongoose.Types.ObjectId(recordedByUserId),
      isRecurring: input.isRecurring || false,
    });
    await expense.save();
    return expense;
  }

  public static async listExpenses(
    gymId: string,
    filters: { branchId?: string; category?: ExpenseCategory; startDate?: Date; endDate?: Date } = {},
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ expenses: IExpense[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);

    const filter: Record<string, unknown> = {
      gymId: new mongoose.Types.ObjectId(gymId),
    };

    if (filters.branchId) {
      filter.branchId = new mongoose.Types.ObjectId(filters.branchId);
    }
    if (filters.category) {
      filter.category = filters.category;
    }
    if (filters.startDate || filters.endDate) {
      filter.expenseDate = {};
      if (filters.startDate) (filter.expenseDate as Record<string, Date>).$gte = filters.startDate;
      if (filters.endDate) (filter.expenseDate as Record<string, Date>).$lte = filters.endDate;
    }

    const [expenses, totalItems] = await Promise.all([
      Expense.find(filter).skip(skip).limit(limit).sort({ expenseDate: -1, createdAt: -1 }),
      Expense.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { expenses, meta };
  }

  public static async updateExpense(
    expenseId: string,
    gymId: string,
    input: Partial<RecordExpenseInput>
  ): Promise<IExpense> {
    const filter: Record<string, unknown> = {
      _id: expenseId,
      gymId: new mongoose.Types.ObjectId(gymId),
    };

    const updateData: Record<string, unknown> = { ...input };
    if (input.branchId) {
      updateData.branchId = new mongoose.Types.ObjectId(input.branchId);
    }

    const expense = await Expense.findOneAndUpdate(filter, { $set: updateData }, { new: true, runValidators: true });
    if (!expense) {
      throw AppError.notFound('Expense record not found');
    }

    return expense;
  }

  public static async deleteExpense(expenseId: string, gymId: string): Promise<void> {
    const expense = await Expense.findOneAndDelete({
      _id: expenseId,
      gymId: new mongoose.Types.ObjectId(gymId),
    });

    if (!expense) {
      throw AppError.notFound('Expense record not found');
    }
  }

  public static async getExpensesSummary(
    gymId: string,
    dateRange?: { startDate?: Date; endDate?: Date }
  ): Promise<{ totalExpenses: number; expensesByCategory: { category: string; amount: number }[] }> {
    const matchFilter: Record<string, unknown> = {
      gymId: new mongoose.Types.ObjectId(gymId),
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      matchFilter.expenseDate = {};
      if (dateRange.startDate) (matchFilter.expenseDate as Record<string, Date>).$gte = dateRange.startDate;
      if (dateRange.endDate) (matchFilter.expenseDate as Record<string, Date>).$lte = dateRange.endDate;
    }

    const categoryAgg = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
        },
      },
    ]);

    const expensesByCategory = categoryAgg.map((item) => ({
      category: item._id,
      amount: item.amount,
    }));

    const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.amount, 0);

    return { totalExpenses, expensesByCategory };
  }

  public static async getProfitSummary(
    gymId: string,
    dateRange?: { startDate?: Date; endDate?: Date }
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    expensesByCategory: { category: string; amount: number }[];
  }> {
    const [revenueSummary, expenseSummary] = await Promise.all([
      MemberPaymentService.getRevenueSummary(gymId, dateRange),
      ExpenseService.getExpensesSummary(gymId, dateRange),
    ]);

    const totalRevenue = revenueSummary.totalRevenue;
    const totalExpenses = expenseSummary.totalExpenses;
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      expensesByCategory: expenseSummary.expensesByCategory,
    };
  }
}
