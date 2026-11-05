import { markRaw } from 'vue';
import ConfiguredLink from '../fixtures/ConfiguredLinkStub.vue';
import RouteObjectLink from '../fixtures/RouteObjectStub.vue';
import RouterLink from '../fixtures/RouterStub.vue';

export const RouterStub = markRaw(RouterLink);

export const ConfiguredLinkStub = markRaw(ConfiguredLink);

export const RouteObjectStub = markRaw(RouteObjectLink);
