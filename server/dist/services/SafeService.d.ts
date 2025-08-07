import Safe from '@safe-global/protocol-kit';
export interface SafeAddressResult {
    stealthAddress: string;
    safeAddress: string;
    isDeployed: boolean;
    error?: string;
}
export interface SafeConfiguration {
    owners: string[];
    threshold: number;
    saltNonce: string;
}
export declare class SafeService {
    private readonly chainId;
    private readonly rpcUrl;
    constructor(chainId?: number, rpcUrl?: string);
    private createSafeConfig;
    private predictSafeAddressUsingProtocolKit;
    predictSafeAddressOnTheBasisOfStealthAddress(stealthAddresses: string[]): Promise<SafeAddressResult[]>;
    private checkSafeDeploymentStatus;
    getSafeInfo(safeAddress: string): Promise<{
        safeAddress: string;
        isDeployed: boolean;
        owners?: string[];
        threshold?: number;
        nonce?: number;
        version?: string;
        masterCopy?: string;
        fallbackHandler?: string;
        error?: string;
    }>;
    createSafeInstance(safeAddress: string): Promise<Safe>;
    getSafeDeploymentConfig(stealthAddress: string, saltNonce?: string): Promise<{
        safeAccountConfig: any;
        safeDeploymentConfig: any;
        predictedAddress: string;
    }>;
    private getChainName;
    static getSupportedNetworks(): Array<{
        chainId: number;
        name: string;
        rpcUrl: string;
    }>;
}
//# sourceMappingURL=SafeService.d.ts.map