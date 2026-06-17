import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly logger = new Logger(PaystackService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  /**
   * DEPOSIT: Initialize a transaction
   */
  async initializeTransaction(email: string, amount: number, reference: string, metadata?: any) {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/transaction/initialize`,
          {
            email,
            amount: Math.round(amount * 100), // Convert to kobo
            reference,
            callback_url: this.configService.get<string>('PAYSTACK_CALLBACK_URL'),
            metadata,
          },
          {
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Paystack initializeTransaction error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * VERIFY: Verify a transaction
   */
  async verifyTransaction(reference: string) {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/transaction/verify/${reference}`, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Paystack verifyTransaction error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * WITHDRAWAL: List banks
   */
  async listBanks() {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/bank`, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Paystack listBanks error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * WITHDRAWAL: Verify Account Number
   */
  async verifyAccountNumber(accountNumber: string, bankCode: string) {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Paystack verifyAccountNumber error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * WITHDRAWAL: Create Transfer Recipient
   */
  async createTransferRecipient(name: string, accountNumber: string, bankCode: string) {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/transferrecipient`,
          {
            type: 'nuban',
            name,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: 'NGN',
          },
          {
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Paystack createTransferRecipient error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * WITHDRAWAL: Initiate Transfer
   */
  async initiateTransfer(amount: number, recipient: string, reason: string, reference: string) {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/transfer`,
          {
            source: 'balance',
            amount: Math.round(amount * 100), // Convert to kobo
            recipient,
            reason,
            reference,
          },
          {
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Paystack initiateTransfer error: ${error.message}`, error.stack);
      throw error;
    }
  }


  /**
   * WEBHOOK: Verify Signature
   */
  verifySignature(payload: any, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    return hash === signature;
  }
}
