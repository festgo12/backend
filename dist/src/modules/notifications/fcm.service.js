"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var FcmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcmService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
const axios_1 = __importDefault(require("axios"));
let FcmService = FcmService_1 = class FcmService {
    configService;
    logger = new common_1.Logger(FcmService_1.name);
    auth = null;
    projectId = null;
    isConfigured = false;
    constructor(configService) {
        this.configService = configService;
        const credentialsPath = this.configService.get('FIREBASE_CREDENTIALS_PATH');
        const credentialsJson = this.configService.get('FIREBASE_CREDENTIALS_JSON');
        this.projectId = this.configService.get('FIREBASE_PROJECT_ID') || null;
        try {
            if (credentialsJson) {
                const credentials = JSON.parse(credentialsJson);
                this.projectId = this.projectId || credentials.project_id;
                this.auth = new google_auth_library_1.GoogleAuth({
                    credentials,
                    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
                });
                this.isConfigured = true;
                this.logger.log('FCM Service initialized via JSON credentials.');
            }
            else if (credentialsPath) {
                this.auth = new google_auth_library_1.GoogleAuth({
                    keyFilename: credentialsPath,
                    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
                });
                this.isConfigured = true;
                this.logger.log(`FCM Service initialized via keyfile: ${credentialsPath}`);
            }
            else {
                this.logger.warn('FCM credentials not configured. FCM service running in MOCK mode.');
            }
        }
        catch (e) {
            this.logger.error(`Failed to initialize FCM Service: ${e.message}. Running in MOCK mode.`);
        }
    }
    async sendPushNotification(token, title, body, data) {
        if (!token) {
            this.logger.warn('Skipping sendPushNotification: FCM token is blank.');
            return false;
        }
        if (!this.isConfigured || !this.auth || !this.projectId) {
            this.logger.log(`[MOCK FCM PUSH] To: ${token} | Title: "${title}" | Body: "${body}" | Data: ${JSON.stringify(data || {})}`);
            return true;
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
            await axios_1.default.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`Push notification sent successfully to FCM token ${token.substring(0, 10)}...`);
            return true;
        }
        catch (error) {
            const serverResponse = error.response?.data;
            this.logger.error(`Error sending push notification: ${error.message}. Response: ${JSON.stringify(serverResponse || {})}`, error.stack);
            return false;
        }
    }
    sanitizeDataMap(data) {
        const sanitized = {};
        for (const key of Object.keys(data)) {
            if (data[key] !== undefined && data[key] !== null) {
                sanitized[key] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
            }
        }
        return sanitized;
    }
};
exports.FcmService = FcmService;
exports.FcmService = FcmService = FcmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FcmService);
//# sourceMappingURL=fcm.service.js.map