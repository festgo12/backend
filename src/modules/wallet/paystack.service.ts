import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  async initializeTransaction(email: string, amount: number, reference: string) {
    const response: AxiosResponse = await lastValueFrom(
      this.httpService.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Convert to kobo
          reference,
          callback_url: this.configService.get<string>('PAYSTACK_CALLBACK_URL'),
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      ),
    );
    return response.data;
  }

  async verifyTransaction(reference: string) {
    const response: AxiosResponse = await lastValueFrom(
      this.httpService.get(`${this.baseUrl}/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      }),
    );
    return response.data;
  }
}
