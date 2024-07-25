import * as vscode from 'vscode'
import { moduleViewModel } from '../vm/moduleViewModel';

export class ModuleView implements  vscode.TreeDataProvider<moduleViewModel> {
    onDidChangeTreeData?: vscode.Event<void | moduleViewModel | moduleViewModel[] | null | undefined> | undefined;

    getTreeItem(element: moduleViewModel): vscode.TreeItem | Thenable<vscode.TreeItem> {
        throw new Error('Method not implemented.');
    }

    getChildren(element?: moduleViewModel | undefined): vscode.ProviderResult<moduleViewModel[]> {
        throw new Error('Method not implemented.');
    }

    getParent?(element: moduleViewModel): vscode.ProviderResult<moduleViewModel> {
        throw new Error('Method not implemented.');
    }
    
    resolveTreeItem?(item: vscode.TreeItem, element: moduleViewModel, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        throw new Error('Method not implemented.');
    }

}