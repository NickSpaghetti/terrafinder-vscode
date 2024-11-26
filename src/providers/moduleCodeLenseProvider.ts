import { CancellationToken, CodeLensProvider, TextDocument, CodeLens, ProviderResult, Event, Range, window, workspace, EventEmitter } from "vscode";
import { HclService } from "../services/aggregations/hclService";
import { Module } from "../models/module";
import { Nullable } from "../types/nullable";
import { TERRAFORM_SYNTAX } from "../utils/constants";

export class ModuleCodeLenseProvider implements CodeLensProvider {
    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses?: Event<void> | undefined = this._onDidChangeCodeLenses.event;

    constructor(private readonly _hclService: HclService){
        workspace.onDidChangeConfiguration(() => {
            this._onDidChangeCodeLenses.fire();
        })
    }

    provideCodeLenses(document: TextDocument, token: CancellationToken): ProviderResult<CodeLens[]> {
        return Promise.resolve(this.getCodeLensesFromDocument(document));
    }
    resolveCodeLens?(codeLens: CodeLens, token: CancellationToken): ProviderResult<CodeLens> {
        return codeLens;
    }

    async getCodeLensesFromDocument(document: TextDocument): Promise<Array<CodeLens>> {
        const modules = await this._hclService.findSourcesAsync(document.getText(),document.uri.path);
        const lenses: Array<CodeLens> = [];
        for (const module of modules) {
            try{
                lenses.push(new CodeLens(
                    this.createRangeFromModule(document,module),
                    {
                        title: `Inspect Module: ${module.name}`,
                        command: 'terrafinder.inspectTerraformModule',
                        arguments: [module]
                    }
                ))
            } catch(err){
                if(err instanceof Error){
                    window.showErrorMessage(err.message);
                }
                
            }
        }
        return lenses;
    }

    //module\s+"(\w+)"\s+{[^}]
    private createRangeFromModule(document: TextDocument, module: Module): Range {
        if(module.name.startsWith(TERRAFORM_SYNTAX.REQUIRED_PROVIDERS)){
           let range = this.createRangeForReqiuredProvider(document,module);
           if(range === null){
            throw Error(`Could not find ${module.name} in ${document.fileName}`);
           }
           return range;
        }

        if(module.name.startsWith(TERRAFORM_SYNTAX.TERRAFORM)){
            let range = this.createRangeFromTerraform(document);
            if(range === null){
                throw Error(`Could not find ${module.name} in ${document.fileName}`);
            }
            return range;
        }

        const moduleExp = new RegExp(`module\\s+"(${module.name})"\\s+{[^}]`,"g");
        let range = this.createRange(document,moduleExp);
        if(range === null){
            throw Error(`Could not find ${module.name} in ${document.fileName}`);
        }
        return range;
    }

    private createRange(document: TextDocument, regex: RegExp): Nullable<Range> {
        let startPos = null;
        let endPos = null;
        let match;
        while((match = regex.exec(document.getText())) !== null){
            startPos = document.positionAt(match.index);
            endPos = document.positionAt(match.index + match[0].length);
        }
        if(startPos === null || endPos === null){
            return null;
        }

        return new Range(startPos,endPos);
    }

    ///(\w+)\s*=\s*{[^}]*}/g;
    private createRangeForReqiuredProvider(document: TextDocument, module: Module): Nullable<Range> {
        const beforeRequiredProvidersRegex = /([\s\S]*?required_providers\s*{)/g;
        const requiredProviderRegex = /required_providers\s*{\s*((?:\w+\s*=\s*{[^}]*}\s*)+)}/g;
        const providerRegex = new RegExp(`(${module.name.split('.').at(-1)})\\s*=\\s*{[^}]*}`,'g');
        const doc = document.getText();
        const beforeMatch = beforeRequiredProvidersRegex.exec(doc);
        if(!beforeMatch){
            return null;
        }

        const blockMatch = requiredProviderRegex.exec(doc);
        if(!blockMatch){
            return null;
        }
        const providersBlock = blockMatch[0];
        let startPos = null;
        let endPos = null;
        let providerMatch;
        while((providerMatch = providerRegex.exec(providersBlock))){
            startPos = document.positionAt(doc.indexOf(providerMatch[0]));
            endPos = document.positionAt(beforeMatch[0].length + doc.indexOf(providerMatch[0]));
            console.log(providerRegex);
        }
        if(startPos === null || endPos === null){
            return null;
        }
        return new Range(startPos,endPos);
    }

    private createRangeFromTerraform(document: TextDocument){
        const terraformSourceExp = /^\s*terraform\s*{[^}]*\bsource\s*=\s*["'][^"']*["']/gms
        const doc = document.getText();
        const firstSource = terraformSourceExp.exec(doc);
        if(firstSource === null){
            return null;
        }
        let startPos = document.positionAt(doc.indexOf(firstSource[0]));
        let endPos = document.positionAt(doc.indexOf(firstSource[0]));
        return new Range(startPos,endPos);
    }

}