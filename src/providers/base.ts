import * as vscode from 'vscode';
import * as path from 'path';
import { FileReference, ParsedYamlDocument, ProviderDetectionResult, Position, Range } from '../types';

export interface IYamlProvider {
  readonly id: string;
  readonly displayName: string;
  readonly filePatterns: string[];

  detect(document: vscode.TextDocument): ProviderDetectionResult;
  extractReferences(parsedDoc: ParsedYamlDocument, workspaceRoot: string): FileReference[];
  getReferenceAtPosition(parsedDoc: ParsedYamlDocument, position: Position, workspaceRoot: string): FileReference | null;
  resolvePath(rawPath: string, currentFilePath: string, workspaceRoot: string): string;
  isExternalReference(rawPath: string): boolean;
  parseExternalReference(rawPath: string): { repo: string; path: string } | null;
}

export abstract class BaseYamlProvider implements IYamlProvider {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly filePatterns: string[];

  abstract detect(document: vscode.TextDocument): ProviderDetectionResult;
  abstract extractReferences(parsedDoc: ParsedYamlDocument, workspaceRoot: string): FileReference[];

  getReferenceAtPosition(
    parsedDoc: ParsedYamlDocument,
    position: Position,
    workspaceRoot: string
  ): FileReference | null {
    const references = this.extractReferences(parsedDoc, workspaceRoot);
    return references.find(ref => this.isPositionInRange(position, ref.range)) || null;
  }

  resolvePath(rawPath: string, currentFilePath: string, workspaceRoot: string): string {
    const cleanPath = rawPath.replace(/['"]/g, '').trim();

    if (cleanPath.startsWith('/')) {
      return path.join(workspaceRoot, cleanPath);
    }

    const currentDir = path.dirname(currentFilePath);
    return path.resolve(currentDir, cleanPath);
  }

  isExternalReference(rawPath: string): boolean {
    return false;
  }

  parseExternalReference(rawPath: string): { repo: string; path: string } | null {
    return null;
  }

  protected isPositionInRange(position: Position, range: Range): boolean {
    if (position.line < range.start.line || position.line > range.end.line) {
      return false;
    }

    if (position.line === range.start.line && position.character < range.start.character) {
      return false;
    }

    if (position.line === range.end.line && position.character > range.end.character) {
      return false;
    }

    return true;
  }

  protected offsetToPosition(offset: number, text: string): Position {
    let line = 0;
    let character = 0;

    for (let i = 0; i < offset && i < text.length; i++) {
      if (text[i] === '\n') {
        line++;
        character = 0;
      } else {
        character++;
      }
    }

    return { line, character };
  }

  protected rangeFromOffsets(startOffset: number, endOffset: number, text: string): Range {
    return {
      start: this.offsetToPosition(startOffset, text),
      end: this.offsetToPosition(endOffset, text)
    };
  }
}
