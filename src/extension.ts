// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "yaml-navigator" is now active!');
	let openFileOnPath = vscode.commands.registerCommand('yaml-navigator.openFileOnPath', function () {
		// The code you place here will be executed every time your command is executed
		let editor = vscode.window.activeTextEditor;

		// TODO: allow user to configure the regex
		let regexTon = new RegExp(/(?:\.\.|\.)*\/\S+\.\w*/);
		if (!editor) return;
		//Get the selection starting from the cursor position and searching for a regular expression
		let range = editor.document.getWordRangeAtPosition(editor.selection.active, regexTon);
		if (range) {
			var currentlyOpenTabfilePath = editor.document.fileName;
			//Get the pure match against the regualr expression
			let text = editor.document.getText(range);

			var resolvedPath;

			// possible cases
			// 1. /cicd/common/setup.yml -> this should be navigated to $project_root/cicd/common/setup.yml
			// 2. ../common/setup.yml -> this should be navigated to parentdirectory/common/setup.yml
			// 3. ./variables.yaml -> this should be navigated to currentdirectory/variables.yaml
			let segments = text.split("/");
			if (segments[0] == "..") {
				// relative path
				// resolvedPath = path.join(path.dirname(currentlyOpenTabfilePath), ...segments);
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
			} else if (segments[0] == "." ){
				// relative path
				console.log("relative from current", segments)
				resolvedPath = path.join(path.dirname(currentlyOpenTabfilePath), ...segments);
			} else {
				resolvedPath = text;
				// get the project root
				let projectRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
				if (projectRoot) {
					resolvedPath = path.join(projectRoot, text);
				}
			}

			if (!resolvedPath || !fs.existsSync(resolvedPath)) {
				vscode.window.showErrorMessage(`File does not exist in ${resolvedPath}, matched file path: ${text}`)
				return;
			}

			let url = vscode.Uri.file(resolvedPath);
			vscode.commands.executeCommand('vscode.open', url);
		}

		
	});

	context.subscriptions.push(openFileOnPath);
}
// This method is called when your extension is deactivated
export function deactivate() {}
