// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

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

	const timeDis = vscode.commands.registerCommand('terrafinder.showTime',() => {
		let time = new Date().toDateString();
		vscode.window.showInformationMessage(`it is currently ${time}`);
	});

	const yup = vscode.commands.registerCommand('terrafinder.yup',() => {
		vscode.window.showInformationMessage(`yup`);
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(timeDis);

	context.subscriptions.push(yup);

	const disposableTerrafinderIdentifierActivityBar = vscode.commands.registerCommand('terrafinder.showActiveFileTerraformModules',() => {
		const editor = vscode.window.activeTextEditor;
		if (editor){
			const panel = vscode.window.createWebviewPanel('terrafinderIdentifier',`${editor.document.fileName} modules`, vscode.ViewColumn.One);
			panel.webview.html = displayModules(editor.document.getText())
		} else {
			vscode.window.showErrorMessage("No active file open");
		}
	});
	context.subscriptions.push(disposableTerrafinderIdentifierActivityBar);
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
