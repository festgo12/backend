import { DisputeStatus } from '@src/generated/client';
export declare class ResolveDisputeDto {
    resolution: string;
    outcome?: DisputeStatus;
}
