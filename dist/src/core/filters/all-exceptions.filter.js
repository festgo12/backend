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
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter extends core_1.BaseExceptionFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    constructor(httpAdapter) {
        super(httpAdapter);
    }
    catch(exception, host) {
        const isProduction = process.env.NODE_ENV === 'production';
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();
            if (isProduction && status >= 500) {
                this.logger.error('Internal server error', exception.stack);
                super.catch(new common_1.HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR), host);
                return;
            }
            super.catch(exception, host);
            return;
        }
        this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
        if (isProduction) {
            super.catch(new common_1.HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR), host);
        }
        else {
            super.catch(exception, host);
        }
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [Object])
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map