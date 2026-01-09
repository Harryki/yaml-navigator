import * as vscode from 'vscode';
import { BaseYamlProvider } from './base';
import { FileReference, ParsedYamlDocument, ProviderDetectionResult, ReferenceType } from '../types';

export class GenericYamlProvider extends BaseYamlProvider {
  readonly id = 'generic';
  readonly displayName = 'Generic YAML';
  readonly filePatterns = ['**/*.yml', '**/*.yaml'];

  detect(document: vscode.TextDocument): ProviderDetectionResult {
    return {
      provider: this.id,
      confidence: 0.1,
      reason: 'Fallback generic YAML provider'
    };
  }

  extractReferences(parsedDoc: ParsedYamlDocument, workspaceRoot: string): FileReference[] {
    const references: FileReference[] = [];
    const text = parsedDoc.text;
    const filePathRegex = /['"]?([^\s'"]+\.ya?ml)['"]?/g;

    let match;
    while ((match = filePathRegex.exec(text)) !== null) {
      const rawPath = match[1];
      const startOffset = match.index + (match[0].indexOf(rawPath));
      const endOffset = startOffset + rawPath.length;

      references.push({
        path: rawPath,
        resolvedPath: this.resolvePath(rawPath, parsedDoc.uri.fsPath, workspaceRoot),
        range: this.rangeFromOffsets(startOffset, endOffset, text),
        type: ReferenceType.Unknown,
        isExternal: false
      });
    }

    return references;
  }
}
