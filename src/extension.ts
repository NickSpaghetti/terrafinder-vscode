// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import path from 'path';
import { ModuleDepedencyTreeProvider } from './providers/moduleDepedencyTreeProvider';
import { HclService } from './services/aggregations/hclService';
import { HclSourceService } from './services/orchestrations/hlcSourceService';
import { HclVersionService } from './services/foundations/hlcVersionService';
import { TerraformRegistryService } from './services/foundations/terraformRegistryService';
import { TerraformRegistryBroker } from './brokers/apis/terraformRegistryBroker';
import { SourceTypes } from './models/sourceTypes';
import { HclModuleViewModel } from './vm/hclModuleViewModel';
import { ModuleCodeLenseProvider } from './providers/moduleCodeLenseProvider';
import {Module} from './models/module';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "terrafinder" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('terrafinder.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Terrafinder!');
	});

	context.subscriptions.push(disposable);

	const disposableTerrafinderIdentifierActivityBarNope = vscode.commands.registerCommand('terrafinder.showActiveFileTerraformModulesNOPE',() => {
		const editor = vscode.window.activeTextEditor;
		if (editor){
			const panel = vscode.window.createWebviewPanel('terrafinderIdentifier',`${editor.document.fileName} modules`, vscode.ViewColumn.One);
			panel.webview.html = displayModules(editor.document.getText())
		} else {
			vscode.window.showErrorMessage("No active file open");
		}
	});
	context.subscriptions.push(disposableTerrafinderIdentifierActivityBarNope);

	const hlcService = new HclService(new HclSourceService(new HclVersionService(new TerraformRegistryService(new TerraformRegistryBroker()))));
	
	vscode.languages.registerCodeLensProvider({language: 'terraform',scheme:'file'}, new ModuleCodeLenseProvider(hlcService));
	context.subscriptions.push(vscode.commands.registerCommand('terrafinder.inspectTerraformModule',async (module: Module) => {
		vscode.window.showInformationMessage(`Inspecting module ${module.name}`);
		if(module == null || module.modifiedSourceType === null){
			vscode.window.showErrorMessage("Cannot find module");
			return
		}

		if(module.sourceType == SourceTypes.registry || module.sourceType == SourceTypes.privateRegistry){
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(module.modifiedSourceType));
			return
		}

		const terraformText = await terraformModuleProvider.getSourceText(module.modifiedSourceType,module.sourceType)
		if(terraformText == null || terraformText == ""){
			
			return
		}
		await openNewTerraformFile(terraformText)

	}));

	const terraformModuleProvider = new ModuleDepedencyTreeProvider(hlcService);
	vscode.window.registerTreeDataProvider("terraformModuleDependencies",terraformModuleProvider);
	const refresh = vscode.commands.registerCommand('terrafinder.refresh',() => {
		terraformModuleProvider.refresh()
	});
	const openModule = vscode.commands.registerCommand('terrafinder.openModule',async (module: HclModuleViewModel) => {
		if(module == null){
			vscode.window.showErrorMessage("Cannot find module");
			return
		}

		if(module.sourceType == SourceTypes.registry || module.sourceType == SourceTypes.privateRegistry){
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(module.modifiedSource));
			return
		}

		const terraformText = await terraformModuleProvider.getSourceText(module.modifiedSource,module.sourceType)
		if(terraformText == null || terraformText == ""){
			vscode.window.showInformationMessage("Nothing to display");
			return
		}
		await openNewTerraformFile(terraformText)
	});
	const showDepdendency = vscode.commands.registerCommand('terrafinder.showDependency', (modifiedSourceType: string, sourceType: SourceTypes) => {
		let destination = modifiedSourceType
		if(sourceType == SourceTypes.path && !modifiedSourceType.startsWith("https://")){
			destination = path.join(modifiedSourceType)
			if(!modifiedSourceType.endsWith('.tf')){
				destination = path.join(modifiedSourceType,'main.tf')
			}
		}
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(destination));
	});
	context.subscriptions.push(refresh);
	context.subscriptions.push(openModule);
	context.subscriptions.push(showDepdendency);

	
}

export async function openNewTerraformFile(text: string) {
	const document = await vscode.workspace.openTextDocument({
		content: text,
		language: 'terraform'
	})
	await vscode.window.showTextDocument(document);

	
}

export function displayModules(text: string): string{
return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="terrafinderIdentifier" content="width=device-width, inital-scale=1.0">
	<title> Active Modules </title>
</head>
<body>
	<h1> Modules </h1>
	<pre>${text}</pre>
</body>
</html>`
}

// This method is called when your extension is deactivated
export function deactivate() {}

