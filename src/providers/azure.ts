import * as vscode from 'vscode';
import { visit, isMap, isPair, isScalar, isSeq } from 'yaml';
import { BaseYamlProvider } from './base';
import { FileReference, ParsedYamlDocument, ProviderDetectionResult, ReferenceType } from '../types';

export class AzurePipelinesProvider extends BaseYamlProvider {
  readonly id = 'azure-pipelines';
  readonly displayName = 'Azure Pipelines';
  readonly filePatterns = [
    '**/azure-pipelines.yml',
    '**/azure-pipelines.yaml',
    '**/.azure-pipelines/**/*.yml',
    '**/.azure-pipelines/**/*.yaml'
  ];

  private readonly contentMarkers = [
    'trigger',
    'pool',
    'stages',
    'jobs',
    'steps',
    'variables',
    'parameters',
    'resources',
    'extends'
  ];

  detect(document: vscode.TextDocument): ProviderDetectionResult {
    const text = document.getText();
    const fileName = document.fileName.toLowerCase();

    if (fileName.includes('azure-pipelines') || fileName.includes('.azure-pipelines')) {
      return {
        provider: this.id,
        confidence: 0.95,
        reason: 'File name matches Azure Pipelines convention'
      };
    }

    let markerCount = 0;
    for (const marker of this.contentMarkers) {
      const regex = new RegExp(`^${marker}:`, 'm');
      if (regex.test(text)) {
        markerCount++;
      }
    }

    if (markerCount >= 3) {
      return {
        provider: this.id,
        confidence: 0.85,
        reason: `Found ${markerCount} Azure Pipelines markers`
      };
    }

    if (markerCount >= 1) {
      return {
        provider: this.id,
        confidence: 0.5,
        reason: `Found ${markerCount} Azure Pipelines marker(s)`
      };
    }

    return {
      provider: this.id,
      confidence: 0,
      reason: 'No Azure Pipelines markers found'
    };
  }

  extractReferences(parsedDoc: ParsedYamlDocument, workspaceRoot: string): FileReference[] {
    const references: FileReference[] = [];
    const doc = parsedDoc.document;
    const text = parsedDoc.text;

    visit(doc, {
      Pair: (_, pair) => {
        if (!isPair(pair)) return;

        const key = pair.key;
        if (!isScalar(key)) return;

        const keyName = String(key.value);

        if (keyName === 'template') {
          const value = pair.value;

          if (isScalar(value) && typeof value.value === 'string') {
            const ref = this.createReference(
              value.value,
              value.range,
              parsedDoc,
              ReferenceType.Template,
              workspaceRoot
            );
            if (ref) references.push(ref);
          }
        }

        if (keyName === 'extends' && isMap(pair.value)) {
          visit(pair.value, {
            Pair: (_, extendsPair) => {
              if (!isPair(extendsPair)) return;
              const extendsKey = extendsPair.key;
              if (isScalar(extendsKey) && String(extendsKey.value) === 'template') {
                const value = extendsPair.value;
                if (isScalar(value) && typeof value.value === 'string') {
                  const ref = this.createReference(
                    value.value,
                    value.range,
                    parsedDoc,
                    ReferenceType.Extends,
                    workspaceRoot
                  );
                  if (ref) references.push(ref);
                }
              }
            }
          });
        }
      }
    });

    return references;
  }

  isExternalReference(rawPath: string): boolean {
    return rawPath.includes('@');
  }

  parseExternalReference(rawPath: string): { repo: string; path: string } | null {
    const atIndex = rawPath.indexOf('@');
    if (atIndex === -1) return null;

    return {
      path: rawPath.substring(0, atIndex),
      repo: rawPath.substring(atIndex + 1)
    };
  }

  private createReference(
    rawPath: string,
    range: [number, number, number?] | null | undefined,
    parsedDoc: ParsedYamlDocument,
    type: ReferenceType,
    workspaceRoot: string
  ): FileReference | null {
    if (!range) return null;

    const isExternal = this.isExternalReference(rawPath);
    const externalInfo = isExternal ? this.parseExternalReference(rawPath) : null;
    const pathToResolve = externalInfo ? externalInfo.path : rawPath;

    const currentFilePath = parsedDoc.uri.fsPath;

    return {
      path: rawPath,
      resolvedPath: isExternal ? '' : this.resolvePath(pathToResolve, currentFilePath, workspaceRoot),
      range: this.rangeFromOffsets(range[0], range[1], parsedDoc.text),
      type,
      isExternal,
      externalRepo: externalInfo?.repo
    };
  }
}
