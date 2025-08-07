import { StealthAddressRequest, StealthAddressResult } from '../types';
export interface ServiceStealthAddressResponse {
    addresses: StealthAddressResult[];
    totalGenerated: number;
    chainId: number;
    startNonce: string;
    endNonce: string;
}
export declare class StealthAddressService {
    private readonly DEFAULT_CHAIN_ID;
    private readonly MAX_ACCOUNT_AMOUNT;
    computeStealthAddresses(params: StealthAddressRequest): Promise<ServiceStealthAddressResponse>;
    private validateInput;
    getSupportedChainIds(): number[];
    isChainIdSupported(chainId: number): boolean;
}
//# sourceMappingURL=StealthAddressService.d.ts.map