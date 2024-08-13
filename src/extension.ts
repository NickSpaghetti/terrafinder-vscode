// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ModuleDepedencyTreeProvider } from './providers/moduleDepedencyTreeProvider';
import { HclService } from './services/aggregations/hclService';
import { HclSourceService } from './services/orchestrations/hlcSourceService';
import { HclVersionService } from './services/foundations/hlcVersionService';
import { TerraformRegistryService } from './services/foundations/terraformRegistryService';
import { TerraformRegistryBroker } from './brokers/apis/terraformRegistryBroker';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "terrafinder" is now active!');

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

	const terraformModuleProvider = new ModuleDepedencyTreeProvider(new HclService(new HclSourceService(new HclVersionService(new TerraformRegistryService(new TerraformRegistryBroker())))));
	vscode.window.registerTreeDataProvider("terraformModuleDependencies",terraformModuleProvider);
	const refreshDepdnecies = vscode.commands.registerCommand('terrafinder.refresh',() => {
		terraformModuleProvider.refresh()
	});
	context.subscriptions.push(refreshDepdnecies);

	
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

