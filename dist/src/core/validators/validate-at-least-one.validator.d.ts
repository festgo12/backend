import { ValidationOptions, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class ValidateAtLeastOneConstraint implements ValidatorConstraintInterface {
    validate(_: unknown, args: ValidationArguments): boolean;
    defaultMessage(_: ValidationArguments): string;
}
export declare function ValidateAtLeastOne(propertyNames: string[], validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
