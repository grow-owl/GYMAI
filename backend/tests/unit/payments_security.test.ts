import crypto from 'crypto';
import { RazorpayGateway } from '../../src/modules/payment/gateway/razorpay.gateway';

describe('Razorpay Gateway Security Unit Tests', () => {
  const gateway = new RazorpayGateway();
  const secret = 'test_webhook_secret';
  const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123' } } } });

  const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('verifyWebhookSignature Security Checks', () => {
    it('should reject empty or missing signatures', () => {
      expect(gateway.verifyWebhookSignature(payload, '', secret)).toBe(false);
      expect(gateway.verifyWebhookSignature(payload, undefined as any, secret)).toBe(false);
    });

    it('should verify valid signatures in development', () => {
      process.env.NODE_ENV = 'development';
      expect(gateway.verifyWebhookSignature(payload, validSignature, secret)).toBe(true);
    });

    it('should allow mock signatures in non-production environments', () => {
      process.env.NODE_ENV = 'development';
      expect(gateway.verifyWebhookSignature(payload, 'mock_wb_sig_xyz', secret)).toBe(true);
    });

    it('STRICT SECURITY: should REJECT mock signatures when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(gateway.verifyWebhookSignature(payload, 'mock_wb_sig_xyz', secret)).toBe(false);
    });

    it('STRICT SECURITY: should REJECT forged signatures when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(gateway.verifyWebhookSignature(payload, 'forged_signature_12345', secret)).toBe(false);
    });

    it('should accept only valid cryptographic signatures in production', () => {
      process.env.NODE_ENV = 'production';
      expect(gateway.verifyWebhookSignature(payload, validSignature, secret)).toBe(true);
    });
  });

  describe('verifyPaymentSignature Security Checks', () => {
    const params = { orderId: 'order_999', paymentId: 'pay_888', signature: '' };
    const validPaySig = crypto
      .createHmac('sha256', 'mock_razorpay_secret')
      .update('order_999|pay_888')
      .digest('hex');

    it('should reject missing or empty signature parameter', () => {
      expect(gateway.verifyPaymentSignature({ ...params, signature: '' })).toBe(false);
    });

    it('should allow mock_sig_ in non-production', () => {
      process.env.NODE_ENV = 'development';
      expect(gateway.verifyPaymentSignature({ ...params, signature: 'mock_sig_abc' })).toBe(true);
    });

    it('STRICT SECURITY: should REJECT mock_sig_ when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(gateway.verifyPaymentSignature({ ...params, signature: 'mock_sig_abc' })).toBe(false);
    });

    it('should accept valid signature in production', () => {
      process.env.NODE_ENV = 'production';
      expect(gateway.verifyPaymentSignature({ ...params, signature: validPaySig })).toBe(true);
    });
  });
});
