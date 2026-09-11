import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class ValidateAtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    const propertyNames = args.constraints[0] as string[];
    return propertyNames.some((key) => {
      const value = object[key];
      return value !== undefined && value !== null && value !== '';
    });
  }

  defaultMessage(_: ValidationArguments): string {
    const propertyNames = _.constraints[0] as string[];
    return `At least one of ${propertyNames.join(', ')} must be provided`;
  }
}

export function ValidateAtLeastOne(
  propertyNames: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [propertyNames],
      validator: ValidateAtLeastOneConstraint,
    });
  };
}
