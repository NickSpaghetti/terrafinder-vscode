import { publicDecrypt } from 'crypto';
import path from 'path';
import * as vscode from 'vscode'
import { SourceTypes } from '../models/sourceTypes';

export class HclModuleViewModel extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		private readonly version: string,
		public readonly source: string,
		public readonly modifiedSource: string,
		public readonly sourceType: SourceTypes,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command,
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.label}-${this.version}`;
		this.description = this.version;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	};

	contextValue = 'module';
}