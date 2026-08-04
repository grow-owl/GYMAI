export interface CreateOrderParams {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface GatewayOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface VerifySignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RefundParams {
  paymentId: string;
  amount?: number;
  notes?: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  status: string;
}

export interface IPaymentGateway {
  name: string;
  createOrder(
    amountOrParams: number | CreateOrderParams,
    currency?: string,
    receipt?: string
  ): Promise<GatewayOrderResult>;
  verifyPaymentSignature(params: VerifySignatureParams): boolean;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean;
  parseWebhookPayload(payload: any): { orderId: string; paymentId?: string; status: string; invoiceNumber?: string };
  refundPayment(params: RefundParams | string, amount?: number, reason?: string): Promise<RefundResult>;
}
