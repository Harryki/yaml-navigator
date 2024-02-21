import * as vscode from 'vscode';
import * as path from 'path';

export class YamlFileReferenceDataProvider implements vscode.TreeDataProvider<CodeLocation> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeLocation | undefined> = new vscode.EventEmitter<CodeLocation | undefined>();
    readonly onDidChangeTreeData: vscode.Event<CodeLocation | undefined> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        // vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));

        vscode.workspace.onDidChangeConfiguration(() => {
            this.refresh();
        });

        this.onActiveEditorChanged();
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
            return Promise.resolve(element.occurrences.map(range => new CodeLocation(element.resourceUri, range, [], vscode.TreeItemCollapsibleState.None)));
        } else {
            return this.searchFilesForReferences().then(references => {
                return Promise.resolve(references.map(reference => new CodeLocation(vscode.Uri.file(reference.filePath), undefined, reference.occurrences)));
            });
        }
    }

    private async searchFilesForReferences(): Promise<ReferenceInfo[]> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return [];
        }

        const fileName = path.basename(activeEditor.document.fileName);
        const escapedSearchString = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSearchString, 'g');

        const referenceInfoMap = new Map<string, ReferenceInfo>();

        await vscode.workspace.findFiles('**/*', '**/node_modules/**').then(uris => {
            const promises = uris.map(uri => {
                return vscode.workspace.openTextDocument(uri).then(document => {
                    const text = document.getText();
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        const filePath = uri.fsPath;
                        const start = document.positionAt(match.index);
                        const end = document.positionAt(match.index + match[0].length);
                        const range = new vscode.Range(start, end);
                        const referenceInfo = referenceInfoMap.get(filePath) || { filePath: filePath, occurrences: [] };
                        referenceInfo.occurrences.push(range);
                        referenceInfoMap.set(filePath, referenceInfo);
                    }
                });
            });
            return Promise.all(promises);
        });

        return Array.from(referenceInfoMap.values());
    }
}

interface ReferenceInfo {
    filePath: string;
    occurrences: vscode.Range[];
}

class CodeLocation extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly range: vscode.Range | undefined,
        public readonly occurrences: vscode.Range[] = [],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded
    ) {
        super(resourceUri, collapsibleState);

        this.tooltip = `${resourceUri}`;

        // this.description = this.occurrences.length > 0 ? `${this.occurrences.length} occurrences` : '';
        if (range) {
            // child tree item
            this.command = {
                command: 'codeUsage.showLocation',
                title: '',
                arguments: [resourceUri, range]
            };

            // TODO: update ReferenceInfo.occurences and CodeLocation.occurrences to be Occurrence[] and interface Occurrence { range: vscode.Range, preview: string }
            // and replace range with occurrence 
        } else {
            // parent tree item
            // file
            const parts = this.resourceUri.path.split(/[\\\/]/);
            this.description = parts[parts.length - 2];
            this.iconPath = new vscode.ThemeIcon('file',)
        }
    }
}
