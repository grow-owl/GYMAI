import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  IPaymentGateway,
  CreateOrderParams,
  GatewayOrderResult,
  VerifySignatureParams,
  RefundParams,
  RefundResult,
} from './paymentGateway.interface';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

const isProduction = (): boolean =>
  process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production';

/**
 * Lazily creates a Razorpay SDK instance only when real credentials are configured.
 * This avoids crashing the app in dev/test when credentials are absent.
 */
function getRazorpayInstance(): Razorpay | null {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret) {
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return null;
}

export class RazorpayGateway implements IPaymentGateway {
  public readonly name = 'RAZORPAY';

  public async createOrder(
    amountOrParams: number | CreateOrderParams,
    currencyArg: string = 'INR',
    receiptArg: string = 'receipt_1'
  ): Promise<GatewayOrderResult> {
    const amount = typeof amountOrParams === 'number' ? amountOrParams : amountOrParams.amount;
    const currency = typeof amountOrParams === 'number' ? currencyArg : amountOrParams.currency;
    const receipt = typeof amountOrParams === 'number' ? receiptArg : amountOrParams.receipt;

    // --- PRODUCTION: Use real Razorpay SDK ---
    if (isProduction()) {
      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        throw new Error('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured for production');
      }
      // Razorpay expects amount in paise (smallest currency unit)
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: currency || 'INR',
        receipt: receipt || `rcpt_${Date.now()}`,
      });

      logger.info(`💳 [LIVE] Razorpay order created: [ID: ${order.id}] [Amount: ${amount} ${currency}]`);

      return {
        orderId: order.id,
        amount,
        currency: order.currency,
        receipt: (order as any).receipt,
        status: order.status,
      };
    }

    // --- DEV / TEST: Mock order ---
    const orderId = `order_rzp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    logger.info(`💳 [MOCK] Gateway createOrder: [ID: ${orderId}] [Amount: ${amount} ${currency}]`);

    return {
      orderId,
      amount,
      currency,
      receipt,
      status: 'created',
    };
  }

  public verifyPaymentSignature(params: VerifySignatureParams): boolean {
    if (!params?.signature || !params?.orderId || !params?.paymentId) {
      return false;
    }

    const secret = env.RAZORPAY_KEY_SECRET || 'mock_razorpay_secret';
    const text = `${params.orderId}|${params.paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    const isMatch = generatedSignature === params.signature;

    if (isProduction()) {
      return isMatch;
    }

    return isMatch || params.signature.startsWith('mock_sig_');
  }

  public verifyWebhookSignature(rawBody: string | Buffer, signature: string, secretArg?: string): boolean {
    if (!signature) {
      return false;
    }

    const secret = secretArg || env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET || 'mock_razorpay_secret';
    const bodyStr = typeof rawBody === 'string' ? rawBody : (rawBody ? rawBody.toString('utf8') : JSON.stringify(rawBody || {}));

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    const isMatch = expectedSignature === signature;

    if (isProduction()) {
      return isMatch;
    }

    return isMatch || signature.startsWith('mock_wb_sig_');
  }

  public parseWebhookPayload(payload: any): { orderId: string; paymentId?: string; status: string; invoiceNumber?: string } {
    const entity = payload?.payload?.payment?.entity || payload?.payload?.order?.entity || payload || {};
    return {
      orderId: entity.order_id || entity.orderId || entity.id || 'order_rzp_mock',
      paymentId: entity.id || entity.paymentId || 'pay_rzp_mock',
      status: payload?.event === 'payment.failed' ? 'FAILED' : 'SUCCESS',
      invoiceNumber: entity.receipt || entity.invoiceNumber,
    };
  }

  public async refundPayment(
    paramsOrPaymentId: RefundParams | string,
    amountArg?: number,
    _reasonArg?: string
  ): Promise<RefundResult> {
    const paymentId = typeof paramsOrPaymentId === 'string' ? paramsOrPaymentId : paramsOrPaymentId.paymentId;
    const amount = typeof paramsOrPaymentId === 'string' ? amountArg || 0 : paramsOrPaymentId.amount || 0;

    // --- PRODUCTION: Use real Razorpay SDK ---
    if (isProduction()) {
      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        throw new Error('Razorpay credentials are not configured for production refunds');
      }
      const refund = await (razorpay.payments as any).refund(paymentId, {
        amount: Math.round(amount * 100),
      });
      logger.info(`💸 [LIVE] Razorpay refund created: [RefundID: ${refund.id}] [PaymentID: ${paymentId}]`);
      return {
        refundId: refund.id,
        paymentId,
        amount,
        status: refund.status || 'processed',
      };
    }

    // --- DEV / TEST: Mock refund ---
    const refundId = `rfnd_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    logger.info(`💸 [MOCK] Gateway refundPayment: [RefundID: ${refundId}] [PaymentID: ${paymentId}]`);

    return {
      refundId,
      paymentId,
      amount,
      status: 'processed',
    };
  }
}

export const defaultPaymentGateway: IPaymentGateway = new RazorpayGateway();
