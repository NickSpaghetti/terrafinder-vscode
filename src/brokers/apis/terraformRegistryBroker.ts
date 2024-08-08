import {TERRAFORM_REGISTRY_ROUTES} from "../../utils/constants"
import { ITerraformRegistyBroker } from "./iTerraformRegistryBroker";

export class TerraformRegistryBroker implements ITerraformRegistyBroker {
     /**
     * Gets a list of all current provider versions from registry.terraform.
     * @param providerSource provider full name ex: okta/oka
     * @param providerType provider type ie provider or module {@link TERRAFORM_REGISTRY_ROUTES}
     */
     public async getTerraformVersionsAsync(providerSource: string, providerType: string): Promise<Response> {
        const providerMetaEndpoint = `https://registry.terraform.io/v1/${providerType}/${providerSource}`;
        return await fetch(providerMetaEndpoint)
    }

    public async verifyTerraformVersionAsync(providerSource: string, providerType: string, version: string): Promise<Response                                                    > {
        const providerVersionEndpoint = `https://registry.terraform.io/v1/${providerType}/${providerSource}/${version}`;
        return await fetch(providerVersionEndpoint)
    }
}