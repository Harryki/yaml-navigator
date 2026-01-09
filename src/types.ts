import * as vscode from 'vscode';
import { Document } from 'yaml';

export enum ReferenceType {
  Template = 'template',
  Extends = 'extends',
  Uses = 'uses',
  Include = 'include',
  Local = 'local',
  Unknown = 'unknown'
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface FileReference {
  path: string;
  resolvedPath: string;
  range: Range;
  type: ReferenceType;
  isExternal: boolean;
  externalRepo?: string;
}

export interface ParsedYamlDocument {
  document: Document;
  text: string;
  uri: vscode.Uri;
}

export interface ProviderDetectionResult {
  provider: string;
  confidence: number;
  reason: string;
}
