"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateAtLeastOneConstraint = void 0;
exports.ValidateAtLeastOne = ValidateAtLeastOne;
const class_validator_1 = require("class-validator");
let ValidateAtLeastOneConstraint = class ValidateAtLeastOneConstraint {
    validate(_, args) {
        const object = args.object;
        const propertyNames = args.constraints[0];
        return propertyNames.some((key) => {
            const value = object[key];
            return value !== undefined && value !== null && value !== '';
        });
    }
    defaultMessage(_) {
        const propertyNames = _.constraints[0];
        return `At least one of ${propertyNames.join(', ')} must be provided`;
    }
};
exports.ValidateAtLeastOneConstraint = ValidateAtLeastOneConstraint;
exports.ValidateAtLeastOneConstraint = ValidateAtLeastOneConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ async: false })
], ValidateAtLeastOneConstraint);
function ValidateAtLeastOne(propertyNames, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [propertyNames],
            validator: ValidateAtLeastOneConstraint,
        });
    };
}
//# sourceMappingURL=validate-at-least-one.validator.js.map