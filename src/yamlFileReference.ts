import path from 'path';
import * as vscode from 'vscode';
// import * as json from 'jsonc-parser';

class CodeLocation extends vscode.TreeItem {
    constructor(public readonly uri: vscode.Uri, public readonly range: vscode.Range) {
        super(path.basename(uri.fsPath), vscode.TreeItemCollapsibleState.None);
        this.description = uri.fsPath;
        this.command = {
            command: 'codeUsage.showLocation',
            title: '',
            arguments: [uri, range]
        };
    }
}

export class YamlFileReferenceDataProvider implements vscode.TreeDataProvider<CodeLocation> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeLocation | undefined> = new vscode.EventEmitter<CodeLocation | undefined>();
    readonly onDidChangeTreeData: vscode.Event<CodeLocation | undefined> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        // vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));

        vscode.workspace.onDidChangeConfiguration(() => {
            this.refresh();
        });
    }

    private onActiveEditorChanged(): void {
        if (vscode.window.activeTextEditor) {
            if (vscode.window.activeTextEditor.document.uri.scheme === 'file') {
                const enabled = vscode.window.activeTextEditor.document.languageId === 'yaml' || vscode.window.activeTextEditor.document.languageId === 'yml';
                vscode.commands.executeCommand('setContext', 'yamlFileReferenceEnabled', enabled);
                if (enabled) {
                    this.refresh();
                }
            }
        } else {
            vscode.commands.executeCommand('setContext', 'yamlFileReferenceEnabled', false);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: CodeLocation): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CodeLocation): Thenable<CodeLocation[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (rootPath) {
                return vscode.workspace.findFiles('**/*', '**/node_modules/**').then(uris => {
                    const promises = uris.map(uri => this.searchInFile(uri));
                    return Promise.all(promises).then(locationsArray => {
                        return locationsArray.reduce((acc, locations) => acc.concat(locations), []);
                    });
                });
            } else {
                return Promise.resolve([]);
            }
        }
    }
    searchInFile(uri: vscode.Uri): Thenable<CodeLocation[]> {

        return vscode.workspace.openTextDocument(uri).then(document => {
            const locations: CodeLocation[] = [];
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) return locations;

            for (let line = 0; line < document.lineCount; line++) {
                const text = document.lineAt(line).text;
                // Perform your search here, for example:
                // const regex = /your_search_word_or_pattern/g;
                const fileName = activeEditor ? path.basename(activeEditor.document.fileName) : '';
                const searchString = path.basename(fileName)
                const escpaedSearchString = searchString.replace(/[.*+?^${}()|[\]\\]/, '\\$&');
                const regex = new RegExp(escpaedSearchString, 'g');

                let match;
                while ((match = regex.exec(text)) !== null) {
                    const startPos = document.positionAt(match.index);
                    const endPos = document.positionAt(match.index + match[0].length);
                    const range = new vscode.Range(startPos, endPos);
                    locations.push(new CodeLocation(uri, range));
                }
            }
            return locations;
        });
    }
}