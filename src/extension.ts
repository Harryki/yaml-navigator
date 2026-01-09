import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import { YamlFileReferenceDataProvider } from './yamlFileReference';
import { initializeProviders, providerRegistry } from './providers';
import { ReferenceService } from './services/referenceService';

export function activate(context: vscode.ExtensionContext) {
	initializeProviders();

	const referenceService = new ReferenceService();

	let openFileOnPath = vscode.commands.registerCommand('yaml-navigator.openFileOnPath', function () {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const reference = referenceService.getReferenceAtCursor(
			editor.document,
			editor.selection.active
		);

		if (!reference) {
			vscode.window.showErrorMessage('No file reference found at cursor position');
			return;
		}

		if (reference.isExternal) {
			vscode.window.showInformationMessage(
				`External reference to ${reference.externalRepo}: ${reference.path}`
			);
			return;
		}

		if (!fs.existsSync(reference.resolvedPath)) {
			const config = vscode.workspace.getConfiguration('yaml-navigator');
			const createIfNotExists = config.get<boolean>('createFileIfNotExists', false);

			if (createIfNotExists) {
				const dir = path.dirname(reference.resolvedPath);
				if (!fs.existsSync(dir)) {
					fs.mkdirSync(dir, { recursive: true });
				}
				fs.writeFileSync(reference.resolvedPath, '');
				vscode.window.showInformationMessage(`Created new file: ${reference.resolvedPath}`);
			} else {
				vscode.window.showErrorMessage(`File does not exist: ${reference.resolvedPath}`);
				return;
			}
		}

		const url = vscode.Uri.file(reference.resolvedPath);
		vscode.commands.executeCommand('vscode.open', url);
	});

	let showLocation = vscode.commands.registerCommand('codeUsage.showLocation', (uri: vscode.Uri, range: vscode.Range) => {
		vscode.window.showTextDocument(uri).then(editor => {
			editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
			editor.selection = new vscode.Selection(range.start, range.end);
		});
	});

	vscode.workspace.onDidChangeTextDocument(e => {
		providerRegistry.invalidateCache(e.document.uri.toString());
	});

	context.subscriptions.push(openFileOnPath, showLocation);

	const yamlFileReferenceProvider = new YamlFileReferenceDataProvider(context, referenceService);
	vscode.window.registerTreeDataProvider('yamlFileReference', yamlFileReferenceProvider);
}

export function deactivate() { }
