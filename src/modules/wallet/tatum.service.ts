import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class TatumService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  async generateWallet(chain: string) {
    const response: AxiosResponse = await lastValueFrom(
      this.httpService.get(`${this.baseUrl}/${chain}/wallet`, {
        headers: { 'x-api-key': this.apiKey },
      }),
    );
    return response.data;
  }

  async generateAddress(chain: string, xpub: string, index: number) {
    const response: AxiosResponse = await lastValueFrom(
      this.httpService.get(`${this.baseUrl}/${chain}/address/${xpub}/${index}`, {
        headers: { 'x-api-key': this.apiKey },
      }),
    );
    return response.data;
  }
}
