export interface ITerraformRegistyBroker {
    getTerraformVersionsAsync(providerSource: string, providerType: string): Promise<Response>;
    verifyTerraformVersionAsync(providerSource: string, providerType: string, version: string): Promise<Response>
}