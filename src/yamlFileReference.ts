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
            return Promise.resolve(element.occurrences.map(occurrence => new CodeLocation(element.resourceUri, occurrence, [], vscode.TreeItemCollapsibleState.None)));
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
                        // TODO: need to filter out unrelated files e.g. file name is the same but it's not related

                        const referenceInfo = referenceInfoMap.get(filePath) || { filePath: filePath, occurrences: [] };

                        const line = document.lineAt(range!.start.line);
                        const startOffset = range!.start.character;
                        const endOffset = range!.end.character;
                        const linehighlightStart = Math.max(0, startOffset - 1);
                        const linehighlightEnd = Math.min(line.text.length, endOffset + 1);

                        referenceInfo.occurrences.push({ range: range, preview: { text: line.text, highlights: [[linehighlightStart, linehighlightEnd]] } });
                        referenceInfoMap.set(filePath, referenceInfo);
                    }
                });
            });
            return Promise.all(promises);
        });

        return Array.from(referenceInfoMap.values());
    }
}

interface Preview {
    text: string;
    highlights: Array<[number, number]>;
}

interface Occurrence {
    range: vscode.Range;
    preview: Preview
}

interface ReferenceInfo {
    filePath: string;
    occurrences: Occurrence[];
}

class CodeLocation extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly occurrence: Occurrence | undefined,
        public readonly occurrences: Occurrence[] = [],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded
    ) {
        super(resourceUri, collapsibleState);

        this.tooltip = `${resourceUri}`;

        // this.description = this.occurrences.length > 0 ? `${this.occurrences.length} occurrences` : '';
        if (occurrence !== undefined) {
            // child tree item
            this.command = {
                command: 'codeUsage.showLocation',
                title: '',
                arguments: [resourceUri, occurrence.range]
            };
            // this.label = occurrence.preview
            this.label = { label: occurrence.preview.text, highlights: occurrence.preview.highlights }
        } else {
            // parent tree item
            // file
            const parts = this.resourceUri.path.split(/[\\\/]/);
            this.description = parts[parts.length - 2];
            this.iconPath = new vscode.ThemeIcon('file',)
        }
    }
}
