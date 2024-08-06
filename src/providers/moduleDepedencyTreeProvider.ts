import path from "path";
import fs from "fs/promises"
import { HclFileTypes } from "../models/hclFileTypes";
import { SourceTypes } from "../models/sourceTypes";
import { HclService } from "../services/aggregations/hclService";
import { HclModule } from "../types/hclModule";
import { Nullable } from "../types/nullable";
import { HclModuleViewModel } from "../vm/hclModuleViewModel";
import * as vscode from 'vscode';
import { Module } from "../models/module";
import gitUrlParse from "git-url-parse";
import { error } from "console";
import { json } from "stream/consumers";
import { prototype } from "mocha";

export class ModuleDepedencyTreeProvider implements vscode.TreeDataProvider<HclModuleViewModel>{
    
    constructor(private readonly _hclService: HclService){}

    private _onDidChangeTreeData: vscode.EventEmitter<HclModuleViewModel | undefined | void> = new vscode.EventEmitter<HclModuleViewModel | undefined | void>();
    onDidChangeTreeData?: vscode.Event<void | HclModuleViewModel | HclModuleViewModel[] | null | undefined> | undefined;

    refresh(): void {
		this._onDidChangeTreeData.fire();
	}
    
    getTreeItem(element: HclModuleViewModel): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: HclModuleViewModel | undefined): vscode.ProviderResult<HclModuleViewModel[]> {
        if(element) {
            return Promise.resolve([element]);
        } else {
            return Promise.resolve(this.getDependenciesInTerraformAsync());
        }
    }

    async getDependenciesInTerraformAsync(): Promise<HclModuleViewModel[]>{
        const terraformFiles = [...await vscode.workspace.findFiles('**/*.tf', '**/*.terraform')
            ,...await vscode.workspace.findFiles('**/.hcl','**/*.terragrunt-cache')]
        const modulesDependencies: Array<HclModuleViewModel> = []
        while(terraformFiles.length > 0){
            const currentFile = terraformFiles.pop()
            if(currentFile == undefined){
                continue
            }
            try {
                const currentFileContent = Buffer.from(await vscode.workspace.fs.readFile(currentFile)).toString('utf-8')
                const modules = await this._hclService.findSourcesAsync(currentFileContent,currentFile.path)
                const moduleDepdnecies = await this.findTerraformModuleDepdendenciesAsync(modules)
                modulesDependencies.push(...this.toModuleVm(moduleDepdnecies))
            } catch(error){
                console.log(error)
                vscode.window.showErrorMessage("something went wrong when trying to find deps")
            }
        }
        return modulesDependencies
    }

    async findTerraformModuleDepdendenciesAsync(rootModules: Array<Module>):Promise<Map<string,Module>>{
        const allModules = new Map<string,Module>()
        async function processModule(provider: ModuleDepedencyTreeProvider, module:Module) {
            if(!module || !module.modifiedSourceType || allModules.has(module.source)){
                return;
            }
            allModules.set(module.source,module);
            const moduleSource = await provider.getSourceText(module.modifiedSourceType,module.sourceType)
            if(!moduleSource){
                return
            }
            const childModules = await provider._hclService.findSourcesAsync(moduleSource,module.modifiedSourceType)
            for(const childModule of childModules){
                await processModule(provider,childModule)
            } 
        }
        for (const rootModule of rootModules){
            await processModule(this,rootModule)
        }
        return allModules;
    }

    async getSourceText(modifiedSourceType: string, sourceType: Nullable<SourceTypes>): Promise<Nullable<string>> {
        switch (sourceType) {
            case SourceTypes.url || SourceTypes.ssh:
                return await this.pullRemoteFilesAsync(modifiedSourceType)
            case SourceTypes.path:
                 const moduleFilePath = path.join(modifiedSourceType)
                 try{
                    await fs.access(moduleFilePath)
                 } catch (error) {
                    vscode.window.showInformationMessage(`cannot access ${moduleFilePath}`)
                    return null
                 }
                return (await fs.readFile(moduleFilePath)).toString()
            case SourceTypes.registry:
                return null;
            case SourceTypes.privateRegistry:
                return null;
            default:
                return null;
        }
    }

    //TODO: Add support for other repoHosts ie gitlib and bitbucket.  Note auth is only supported for github atm
    private async pullRemoteFilesAsync(url: string, repositoryHost: string = 'github', scope: string[] = ['repo']): Promise<string> {
        const session = await vscode.authentication.getSession(repositoryHost,scope,{createIfNone: true})
        if(session === undefined){
            vscode.window.showErrorMessage(`Token not found for ${repositoryHost}`)
            return ""
        }
        switch(repositoryHost){
            case 'github':
                return await this.getContentFromGithubAsync(session?.accessToken,url)
            default:
                vscode.window.showErrorMessage(`${repositoryHost} not supported`)
        }

        return ""
    }

    private async getContentFromGithubAsync(token: string, url: string): Promise<string>{
        const parsedGithubUrl = gitUrlParse(url)
        try{
            const headers = new Headers({
                'Accept':'application/vnd.github+json',
                'Authorization': `Bearer ${token}`
            })
            let urlPath = parsedGithubUrl.filepath
            if(parsedGithubUrl.filepath === ''){
                urlPath = 'main.tf'
            }
            else if (!parsedGithubUrl.filepath.endsWith('.tf')){
                urlPath = `${path.join(parsedGithubUrl.filepath,'main.tf')}`
            }
            const contentUrl = `https://api.github.com/repos/${parsedGithubUrl.owner}/${parsedGithubUrl.name}/contents/${urlPath}?ref=${parsedGithubUrl.ref}`
            const response = await fetch(contentUrl, {
                method: 'GET',
                headers: headers
            });
            console.log(response.statusText)
            if(!response.ok){
                vscode.window.showErrorMessage(`error fetching data from ${url}: ${response.statusText}`)
                return ""
            }
            const jsonResponse = await response.json() as any
            if(Array.isArray(jsonResponse)){
                console.log(jsonResponse)
            }
            if ('content' in jsonResponse){
                return Buffer.from(jsonResponse.content,'base64').toString('utf-8')
            }
        } catch(e){
            console.log(e)
            vscode.window.showErrorMessage(`Failed to get file from ${url}`)
        }
                
        return ""
    }

    private toModuleVm(modules:  Map<string, Module>): Array<HclModuleViewModel> {
        const hclModuleViewModel: HclModuleViewModel[] = []
        for(const mod of modules){
            const key = mod[0]
            const value = mod[1]
            if(!key && !value){
                continue
            }
            hclModuleViewModel.push(new HclModuleViewModel(value.name,key,vscode.TreeItemCollapsibleState.Expanded))
        }
        return hclModuleViewModel
    }

}