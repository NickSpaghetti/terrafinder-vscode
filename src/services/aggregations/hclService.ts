import path from "path";
import { HclFileTypes } from "../../models/hclFileTypes";
import { HclModule } from "../../types/hclModule";
import { Nullable } from "../../types/nullable";
import { ProviderType, RequiredProvider, TerraformModule } from "../../types/terraform";
import { TERRAFORM_SYNTAX } from "../../utils/constants";
import { HclSourceService } from "../orchestrations/hlcSourceService";
import { HclFile } from "../../types/hclFile";
import * as hcl  from "hcl2-parser"
import { Module } from "../../models/module";
export class HclService {
    constructor(private readonly hclSourceService: HclSourceService){}
    isHclModule(obj: any): obj is HclModule {
        return (
            typeof obj[0] === 'object'
            && obj[0] !== null
            && ('source' in obj[0] || 'Source' in obj[0])
        );
    }

    getFileType = (fullPath: string):Nullable<HclFileTypes> => {
        const ext = path.extname(fullPath).toLowerCase()
        if(ext == null || ext == ""){
            return null;
        }
        if(!Object.values(HclFileTypes as unknown as string[]).includes(ext)){
            return null;
        }

        return  ext as unknown as HclFileTypes;
    }
    //regex to get source = "foo" ((source)\s*=\s*("(.*?)"))
    findTerraformSources = (hclFile: HclFile[]):Nullable<Map<string,TerraformModule>> => {
        if(hclFile[0] === null || hclFile[0]?.terraform === undefined || hclFile[0]?.terraform[0] === undefined) {
            console.log('No terraform section found');
            return null;
        }

        let foundModules:  Map<string,TerraformModule> = new Map<string,TerraformModule>();
        try {
            hclFile[0]?.terraform.forEach(tf => {
                let requiredProvidersCount = 0;
                if(tf.source !== undefined){
                    foundModules.set(TERRAFORM_SYNTAX.TERRAFORM, {
                        moduleName: TERRAFORM_SYNTAX.TERRAFORM,
                        terraformProperty: TERRAFORM_SYNTAX.TERRAFORM,
                        provider: {
                            source: tf.source,
                            version: ''
                        },
                    })
                }
                if(tf.required_providers !== undefined){
                    let providers = tf.required_providers[requiredProvidersCount] ?? [];
                    Object.keys(providers).forEach(key => {
                        let providerType = providers[key as keyof RequiredProvider] as ProviderType;
                        if(providerType.source !== undefined){
                            foundModules.set(`${TERRAFORM_SYNTAX.REQUIRED_PROVIDERS}.${key}`,  {
                                moduleName: `${TERRAFORM_SYNTAX.REQUIRED_PROVIDERS}.${key}`,
                                terraformProperty: TERRAFORM_SYNTAX.REQUIRED_PROVIDERS,
                                provider: providerType
                            } as TerraformModule);
                        }
                    })
                }
                requiredProvidersCount++;
            });
        } catch (error) {
            console.log(`error parsing terraform section in hcl file: ${error}`)
            return null;
        }
        return foundModules
    }
    //((source)\s*=\s*("(.*?)"))
    //module\s+"(\w+)"\s+{[^}]
    //+version\s+=\s+"([\d\.]+)"[^}]+}
    findModuleSources = (hclFile: HclFile[]):Nullable<Map<string,TerraformModule>> => {
        let foundModules: Map<string,TerraformModule> = new Map<string,TerraformModule>();
        try {
            if(hclFile[0] === null || hclFile[0].module === undefined) {
                console.log('No module found file');
                return null;
            }
            for (let [moduleName, modules] of Object.entries(hclFile[0].module)) {
                if(this.isHclModule(modules)){
                    foundModules.set(moduleName,{
                        moduleName: moduleName,
                        terraformProperty: TERRAFORM_SYNTAX.MODULE,
                        provider: {
                            source: modules[0]?.source ?? '',
                            version: modules[0]?.version ?? ''
                        }
                    } as TerraformModule)
                }
            }
        } catch (error) {
            console.log(`error parsing modules hcl file: ${error}`)
            return null;
        }
        return foundModules;
    }


    findSourcesAsync = async (fileText: string, fileSource: string): Promise<Module[]> => {
        if (fileText == null || fileText == '') {
            console.log("cannot parese text that is null or empty");
            return [];
        }
        //const regex = new RegExp(/((source)\s*=\s*("(.*?)"))/g)
        let sources: Module[] = [];
        try {
            let hclFile = hcl.parseToObject(fileText) as HclFile[];
            let terraformSources = this.findTerraformSources(hclFile);
            let moduleSources = this.findModuleSources(hclFile);
            const mergedSources = new Map<string, TerraformModule>(
                [...terraformSources?.entries() ?? new Map<string, TerraformModule>(),
                    ...moduleSources?.entries() ?? new Map<string, TerraformModule>()]);
            for (let [_, module] of mergedSources) {
                if (module.provider.source !== undefined) {
                    const url = !fileSource.startsWith(`file:///`) ? new URL(`file:///${fileSource}`) : new URL(fileSource)
                    const mod = await this.buildModuleSource(module,url);
                    if (mod != null){
                        sources.push(mod);
                    }
                }
            }

        } catch (error) {
            console.log(`error parsing hcl file: ${error}`)
            return [];
        }
        return sources;
    }

    private async buildModuleSource(terraformModule: TerraformModule, sourceUri: URL): Promise<Nullable<Module>> {
        if (terraformModule.provider.source !== undefined && terraformModule.provider.source !== '' && terraformModule.provider.version !== undefined) {
            const hclSource = terraformModule.provider.source;
            const hclSourceType = this.hclSourceService.GetSourceType(terraformModule.provider.source);
            const modifiedSourceType = await this.hclSourceService.ResolveSource(hclSourceType, hclSource, terraformModule.moduleName, terraformModule.provider.version, sourceUri);
            return new Module(hclSource, terraformModule.moduleName,sourceUri.href,hclSourceType, modifiedSourceType);
        }
        return null;
    }
}