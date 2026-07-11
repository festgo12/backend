import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private auth: GoogleAuth | null = null;
  private projectId: string | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const credentialsPath = this.configService.get<string>('FIREBASE_CREDENTIALS_PATH');
    const credentialsJson = this.configService.get<string>('FIREBASE_CREDENTIALS_JSON');
    this.projectId = this.configService.get<string>('FIREBASE_PROJECT_ID') || null;

    try {
      if (credentialsJson) {
        const credentials = JSON.parse(credentialsJson);
        this.projectId = this.projectId || credentials.project_id;
        this.auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
        this.isConfigured = true;
        this.logger.log('FCM Service initialized via JSON credentials.');
      } else if (credentialsPath) {
        this.auth = new GoogleAuth({
          keyFilename: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
        this.isConfigured = true;
        this.logger.log(`FCM Service initialized via keyfile: ${credentialsPath}`);
      } else {
        this.logger.warn('FCM credentials not configured. FCM service running in MOCK mode.');
      }
    } catch (e: any) {
      this.logger.error(`Failed to initialize FCM Service: ${e.message}. Running in MOCK mode.`);
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    if (!token) {
      this.logger.warn('Skipping sendPushNotification: FCM token is blank.');
      return false;
    }

    if (!this.isConfigured || !this.auth || !this.projectId) {
      this.logger.log(
        `[MOCK FCM PUSH] To: ${token} | Title: "${title}" | Body: "${body}" | Data: ${JSON.stringify(data || {})}`,
      );
      return true; // Mock success
    }

    try {
      const client = await this.auth.getClient();
      const accessTokenObj = await client.getAccessToken();
      const accessToken = accessTokenObj.token;

      if (!accessToken) {
        throw new Error('Could not request access token from GoogleAuth.');
      }

      const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
      const payload = {
        message: {
          token,
          notification: {
            title,
            body,
          },
          data: data ? this.sanitizeDataMap(data) : undefined,
        },
      };

      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Push notification sent successfully to FCM token ${token.substring(0, 10)}...`);
      return true;
    } catch (error: any) {
      const serverResponse = error.response?.data;
      this.logger.error(
        `Error sending push notification: ${error.message}. Response: ${JSON.stringify(serverResponse || {})}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * FCM data values must be string key/value pairs.
   */
  private sanitizeDataMap(data: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined && data[key] !== null) {
        sanitized[key] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
      }
    }
    return sanitized;
  }
}
