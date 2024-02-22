// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import { YamlFileReferenceDataProvider } from './yamlFileReference';
import { findMatchesInText } from './utils';


export function activate(context: vscode.ExtensionContext) {
	// console.log('Congratulations, your extension "yaml-navigator" is now active!');
	let openFileOnPath = vscode.commands.registerCommand('yaml-navigator.openFileOnPath', function () {
		// The code you place here will be executed every time your command is executed
		let editor = vscode.window.activeTextEditor;

		// TODO: allow user to configure the regex
		let regexTon = new RegExp(/\S+\.\w*/);
		if (!editor) return;
		//Get the selection starting from the cursor position and searching for a regular expression
		// console.log("position: ", editor.selection.active)
		let range = editor.document.getWordRangeAtPosition(editor.selection.active, regexTon);
		// let range = editor.document.getWordRangeAtPosition(editor.selection.active);
		if (!range) {
			vscode.window.showErrorMessage(`no valid file path found with ${regexTon}`)
			return;
		}

		var currentlyOpenTabfilePath = editor.document.fileName;
		//Get the pure match against the regualr expression
		let text = editor.document.getText(range);

		var resolvedPath;

		// possible cases
		// Template paths can be an absolute path within the repository or relative to the file that does the including.
		//To use an absolute path, the template path must start with a /. All other paths are considered relative.

		// if first letter starts with `/`, regard it as absolute path from project
		if (text[0] === '/') {
			resolvedPath = text;
			// get the project root
			let projectRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
			if (projectRoot) {
				resolvedPath = path.join(projectRoot, text);
			}
		} else {
			// relative path
			let segments = text.split("/");
			if (segments[0] == "..") {
				// loop segments and find how many upper directory we need to go
				let upperDirCount = 0;
				for (let i = 0; i < segments.length; i++) {
					if (segments[i] == "..") {
						upperDirCount++;
					} else {
						break;
					}
				}
				let parentDir = path.dirname(currentlyOpenTabfilePath);
				for (let i = 0; i < upperDirCount; i++) {
					parentDir = path.dirname(parentDir);
				}
				segments.splice(0, upperDirCount);
				resolvedPath = path.join(parentDir, ...segments);
			} else {
				// relative path
				// console.log("relative from current", segments)
				resolvedPath = path.join(path.dirname(currentlyOpenTabfilePath), ...segments);
			}
		}

		if (!resolvedPath || !fs.existsSync(resolvedPath)) {
			vscode.window.showErrorMessage(`File does not exist in ${resolvedPath}, matched file path: ${text}`)
			return;
		}

		let url = vscode.Uri.file(resolvedPath);
		vscode.commands.executeCommand('vscode.open', url);
	});

	let showLocation = vscode.commands.registerCommand('codeUsage.showLocation', (uri: vscode.Uri, range: vscode.Range) => {
		vscode.window.showTextDocument(uri).then(editor => {
			editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
			console.log(`rage: ${range}`)
			editor.selection = new vscode.Selection(range.start, range.end);
		});
	})

	context.subscriptions.push(openFileOnPath, showLocation);

	const yamlFileReferenceProvider = new YamlFileReferenceDataProvider(context);
	vscode.window.registerTreeDataProvider('yamlFileReference', yamlFileReferenceProvider);

}
// This method is called when your extension is deactivated
export function deactivate() { }
