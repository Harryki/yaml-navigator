export { IYamlProvider, BaseYamlProvider } from './base';
export { ProviderRegistry, providerRegistry } from './registry';
export { AzurePipelinesProvider } from './azure';
export { GenericYamlProvider } from './generic';

import { providerRegistry } from './registry';
import { AzurePipelinesProvider } from './azure';
import { GenericYamlProvider } from './generic';

export function initializeProviders(): void {
  providerRegistry.register(new AzurePipelinesProvider());
  providerRegistry.register(new GenericYamlProvider());
}
