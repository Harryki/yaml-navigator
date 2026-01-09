import { parseDocument, Document, Node, Scalar, Pair, YAMLMap, isScalar, isPair, isMap, isSeq } from 'yaml';
import { Position, Range } from './types';

export class YamlParser {
  parse(text: string): Document | null {
    try {
      return parseDocument(text, { keepSourceTokens: true });
    } catch {
      return null;
    }
  }

  offsetToPosition(offset: number, text: string): Position {
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

  rangeFromOffsets(startOffset: number, endOffset: number, text: string): Range {
    return {
      start: this.offsetToPosition(startOffset, text),
      end: this.offsetToPosition(endOffset, text)
    };
  }

  getNodeRange(node: Node, text: string): Range | null {
    const range = node.range;
    if (!range) return null;

    return this.rangeFromOffsets(range[0], range[1], text);
  }

  positionToOffset(position: Position, text: string): number {
    const lines = text.split('\n');
    let offset = 0;

    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }

    offset += position.character;
    return offset;
  }

  isPositionInRange(position: Position, range: Range): boolean {
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

  findScalarAtPosition(doc: Document, position: Position, text: string): Scalar | null {
    const offset = this.positionToOffset(position, text);
    return this.findScalarAtOffset(doc, offset);
  }

  private findScalarAtOffset(doc: Document, offset: number): Scalar | null {
    let result: Scalar | null = null;

    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;

      if (isScalar(node)) {
        const range = node.range;
        if (range && offset >= range[0] && offset <= range[1]) {
          result = node;
        }
      } else if (isMap(node)) {
        for (const item of node.items) {
          visit(item);
        }
      } else if (isSeq(node)) {
        for (const item of node.items) {
          visit(item);
        }
      } else if (isPair(node)) {
        visit(node.key);
        visit(node.value);
      }
    };

    visit(doc.contents);
    return result;
  }

  findPairForScalar(doc: Document, scalar: Scalar): Pair | null {
    let result: Pair | null = null;

    const visit = (node: unknown, parent: Pair | null): void => {
      if (!node || typeof node !== 'object') return;

      if (isScalar(node)) {
        if (node === scalar && parent) {
          result = parent;
        }
      } else if (isMap(node)) {
        for (const item of node.items) {
          visit(item, null);
        }
      } else if (isSeq(node)) {
        for (const item of node.items) {
          visit(item, null);
        }
      } else if (isPair(node)) {
        visit(node.key, node);
        visit(node.value, node);
      }
    };

    visit(doc.contents, null);
    return result;
  }

  getKeyForValue(doc: Document, valueScalar: Scalar): string | null {
    const pair = this.findPairForScalar(doc, valueScalar);
    if (!pair) return null;

    if (isScalar(pair.key)) {
      return String(pair.key.value);
    }

    return null;
  }
}

export { isScalar, isPair, isMap, isSeq, Scalar, Pair, YAMLMap, Document, Node };
