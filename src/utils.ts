import * as vscode from 'vscode';


export function findMatchesInText(document: vscode.TextDocument, searchString: string): void {
    // const regex = new RegExp(searchString, 'g');
    const escpaedSearchString = searchString.replace(/[.*+?^${}()|[\]\\]/, '\\$&');
    const regex = new RegExp(escpaedSearchString, 'g');
    const text = document.getText();
    let match;
    while ((match = regex.exec(text)) !== null) {
        const lineNumber = document.positionAt(match.index).line + 1;
        console.log(`${document.uri.fsPath}:${lineNumber}: Found occurrence of '${match[0]}'`);
    }
}