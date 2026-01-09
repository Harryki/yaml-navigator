import * as vscode from 'vscode';
import { IYamlProvider } from './base';

export class ProviderRegistry {
  private providers: Map<string, IYamlProvider> = new Map();
  private documentProviderCache: Map<string, IYamlProvider | null> = new Map();

  register(provider: IYamlProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  getProvider(id: string): IYamlProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): IYamlProvider[] {
    return Array.from(this.providers.values());
  }

  detectProvider(document: vscode.TextDocument): IYamlProvider | null {
    const cacheKey = document.uri.toString();
    if (this.documentProviderCache.has(cacheKey)) {
      return this.documentProviderCache.get(cacheKey) || null;
    }

    let bestProvider: IYamlProvider | null = null;
    let bestConfidence = 0;

    for (const provider of this.providers.values()) {
      const result = provider.detect(document);
      if (result.confidence > bestConfidence) {
        bestConfidence = result.confidence;
        bestProvider = provider;
      }
    }

    this.documentProviderCache.set(cacheKey, bestProvider);
    return bestProvider;
  }

  invalidateCache(documentUri: string): void {
    this.documentProviderCache.delete(documentUri);
  }

  clearCache(): void {
    this.documentProviderCache.clear();
  }
}

export const providerRegistry = new ProviderRegistry();
