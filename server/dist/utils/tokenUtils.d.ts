export interface TokenInfo {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
}
/**
 * Dynamically fetch ERC20 token decimals from contract
 */
export declare function getTokenDecimals(tokenAddress: string, chainId: number): Promise<number>;
/**
 * Dynamically fetch ERC20 token symbol from contract
 */
export declare function getTokenSymbol(tokenAddress: string, chainId: number): Promise<string>;
/**
 * Dynamically fetch ERC20 token name from contract
 */
export declare function getTokenName(tokenAddress: string, chainId: number): Promise<string>;
/**
 * Fetch complete token information including name, symbol, and decimals
 */
export declare function getTokenInfo(tokenAddress: string, chainId: number): Promise<TokenInfo>;
/**
 * Check if an address is a native token (zero address)
 */
export declare function isNativeToken(tokenAddress: string): boolean;
/**
 * Get the RPC URL for a given chain ID
 */
export declare function getRpcUrlForChain(chainId: number): string;
/**
 * Get the native currency symbol for a chain
 */
export declare function getNativeCurrencySymbol(chainId: number): string;
declare const _default: {
    getTokenDecimals: typeof getTokenDecimals;
    getTokenSymbol: typeof getTokenSymbol;
    getTokenName: typeof getTokenName;
    getTokenInfo: typeof getTokenInfo;
    isNativeToken: typeof isNativeToken;
    getRpcUrlForChain: typeof getRpcUrlForChain;
    getNativeCurrencySymbol: typeof getNativeCurrencySymbol;
};
export default _default;
//# sourceMappingURL=tokenUtils.d.ts.map