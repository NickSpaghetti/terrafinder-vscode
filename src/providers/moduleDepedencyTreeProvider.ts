import path from "path";
import fs from "fs/promises"
import { SourceTypes } from "../models/sourceTypes";
import { HclService } from "../services/aggregations/hclService";
import { Nullable } from "../types/nullable";
import { HclModuleViewModel } from "../vm/hclModuleViewModel";
import * as vscode from 'vscode';
import { Module } from "../models/module";
import gitUrlParse from "git-url-parse";
import { GITHUB_ROUTES } from "../utils/constants";
import * as semver from "semver";

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
            //get dependencies for each element in the activity bar
            return Promise.resolve(this.getDependenciesFromSource(element));
        } else {
            //get dependincies in project files
            return Promise.resolve(this.getDependenciesInTerraformAsync());
        }
    }

    async getDependenciesFromSource(hclModule: HclModuleViewModel): Promise<Array<HclModuleViewModel>>{
        const allModules = new Set<HclModuleViewModel>()
        try {
            const sourceText = await this.getSourceText(hclModule.modifiedSource,hclModule.sourceType);
            if(sourceText == null){
                return []
            }
            const modules = await this._hclService.findSourcesAsync(sourceText,hclModule.modifiedSource)
            const moduleDepdnecies = await this.findTerraformModuleDepdendenciesAsync(modules)
            for(const moduleDependency of this.toModuleVm(moduleDepdnecies)){
                allModules.add(moduleDependency)
            }
        } catch(error){
            console.log(error)
            vscode.window.showErrorMessage("something went wrong when trying to find deps")
        }
        return [...allModules]
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
                modulesDependencies.push(...this.toModuleVm(new Map(modules.map((m) => [m.source,m]))))
            } catch(error){
                console.log(error)
                vscode.window.showErrorMessage("something went wrong when trying to find deps")
            }
        }
        return modulesDependencies
    }

    async getAllDependenciesInTerraformAsync(): Promise<HclModuleViewModel[]>{
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
                 if(modifiedSourceType.startsWith("file:///https://")){
                    return this.pullRemoteFilesAsync(modifiedSourceType.replace('file:///',''))
                 }
                 let moduleFilePath = path.join(modifiedSourceType)
                 try{
                    const modUrl = new URL(moduleFilePath)
                    const stat = await fs.lstat(modUrl.pathname)
                    if(stat.isDirectory()){
                        moduleFilePath = path.join(modUrl.pathname,'main.tf')
                        await fs.access(moduleFilePath)
                        return (await fs.readFile(moduleFilePath)).toString()
                    }
                    else if (stat.isFile()){
                        await fs.access(modUrl.pathname)
                        return (await fs.readFile(moduleFilePath)).toString()
                    }
                 } catch (error) {
                    vscode.window.showInformationMessage(`cannot access ${moduleFilePath}`)
                    return null
                 }
                 return null
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
        let parsedGithubUrl = gitUrlParse(url)
        const ref = semver.parse(parsedGithubUrl.ref)?.raw ?? ''
        try{
            const headers = new Headers({
                'Accept':'application/vnd.github+json',
                'Authorization': `Bearer ${token}`
            })
            let urlPath = parsedGithubUrl.filepath
            if(!parsedGithubUrl.filepath.endsWith('.tf') && parsedGithubUrl.filepath !== ''){
                urlPath = `${path.join(parsedGithubUrl.filepath,'main.tf')}`
                if(url.includes(`${parsedGithubUrl.name}/${GITHUB_ROUTES.TREE}`) && ref === ''){
                    urlPath = `${path.join(parsedGithubUrl.ref,parsedGithubUrl.filepath,'main.tf')}`
                }
            }
            else if (parsedGithubUrl.filepath === ''){
                urlPath = 'main.tf'
            }
            
            const contentUrl = `https://api.github.com/repos/${parsedGithubUrl.owner}/${parsedGithubUrl.name}/contents/${urlPath}${ref === '' ? '' : `?ref=${ref}`}`
            const response = await fetch(contentUrl, {
                method: 'GET',
                headers: headers
            });
            console.log(response.statusText)
            if(!response.ok){
                const err = `error fetching data from ${url}: ${response.statusText}`
                console.log(err)
                vscode.window.showErrorMessage(err)
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
            console.log(url)
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
            if(value.modifiedSourceType == null || value.sourceType == null){
                continue;
            }
            hclModuleViewModel.push(new HclModuleViewModel(value.name,key,value.source,value.modifiedSourceType,value.sourceType, vscode.TreeItemCollapsibleState.Expanded))
        }
        return hclModuleViewModel
    }

}