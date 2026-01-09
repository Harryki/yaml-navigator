import * as vscode from 'vscode';
import * as path from 'path';
import { ReferenceService } from './services/referenceService';
import { FileReference, Range } from './types';

export class YamlFileReferenceDataProvider implements vscode.TreeDataProvider<CodeLocation> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeLocation | undefined> = new vscode.EventEmitter<CodeLocation | undefined>();
    readonly onDidChangeTreeData: vscode.Event<CodeLocation | undefined> = this._onDidChangeTreeData.event;

    constructor(
        private context: vscode.ExtensionContext,
        private referenceService: ReferenceService
    ) {
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());

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

        const referencesMap = await this.referenceService.findReferencesToFile(activeEditor.document.uri);
        const referenceInfos: ReferenceInfo[] = [];

        for (const [filePath, references] of referencesMap) {
            try {
                const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));

                referenceInfos.push({
                    filePath,
                    occurrences: references.map(ref => ({
                        range: new vscode.Range(
                            ref.range.start.line,
                            ref.range.start.character,
                            ref.range.end.line,
                            ref.range.end.character
                        ),
                        preview: this.createPreview(document, ref.range)
                    }))
                });
            } catch {
                // Skip files that can't be opened
            }
        }

        return referenceInfos;
    }

    private createPreview(document: vscode.TextDocument, range: Range): Preview {
        const line = document.lineAt(range.start.line);
        return {
            text: line.text,
            highlights: [[range.start.character, range.end.character]]
        };
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

        if (occurrence !== undefined) {
            this.command = {
                command: 'codeUsage.showLocation',
                title: '',
                arguments: [resourceUri, occurrence.range]
            };
            this.label = { label: occurrence.preview.text, highlights: occurrence.preview.highlights }
        } else {
            const parts = this.resourceUri.path.split(/[\\\/]/);
            this.description = parts[parts.length - 2];
            this.iconPath = new vscode.ThemeIcon('file',)
        }
    }
}
