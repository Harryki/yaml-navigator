import * as vscode from 'vscode';
import * as path from 'path';
import { YamlParser } from '../yamlParser';
import { providerRegistry } from '../providers/registry';
import { FileReference, ParsedYamlDocument, Position } from '../types';

export class ReferenceService {
  private parser: YamlParser;

  constructor() {
    this.parser = new YamlParser();
  }

  getReferenceAtCursor(
    document: vscode.TextDocument,
    position: vscode.Position
  ): FileReference | null {
    const provider = providerRegistry.detectProvider(document);
    if (!provider) return null;

    const parsedDoc = this.parser.parse(document.getText());
    if (!parsedDoc) return null;

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    const yamlDoc: ParsedYamlDocument = {
      document: parsedDoc,
      text: document.getText(),
      uri: document.uri
    };

    return provider.getReferenceAtPosition(
      yamlDoc,
      { line: position.line, character: position.character },
      workspaceRoot
    );
  }

  getAllReferences(document: vscode.TextDocument): FileReference[] {
    const provider = providerRegistry.detectProvider(document);
    if (!provider) return [];

    const parsedDoc = this.parser.parse(document.getText());
    if (!parsedDoc) return [];

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    const yamlDoc: ParsedYamlDocument = {
      document: parsedDoc,
      text: document.getText(),
      uri: document.uri
    };

    return provider.extractReferences(yamlDoc, workspaceRoot);
  }

  async findReferencesToFile(targetUri: vscode.Uri): Promise<Map<string, FileReference[]>> {
    const results = new Map<string, FileReference[]>();
    const targetFileName = path.basename(targetUri.fsPath);

    const yamlFiles = await vscode.workspace.findFiles('**/*.{yml,yaml}', '**/node_modules/**');

    for (const uri of yamlFiles) {
      if (uri.fsPath === targetUri.fsPath) continue;

      try {
        const document = await vscode.workspace.openTextDocument(uri);
        const references = this.getAllReferences(document);

        const matchingRefs = references.filter(ref => {
          if (ref.isExternal) return false;
          const refFileName = path.basename(ref.resolvedPath);
          return refFileName === targetFileName || ref.resolvedPath === targetUri.fsPath;
        });

        if (matchingRefs.length > 0) {
          results.set(uri.fsPath, matchingRefs);
        }
      } catch {
        // Skip files that can't be opened
      }
    }

    return results;
  }
}
