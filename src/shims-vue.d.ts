// Suppress TS warnings for importing .vue files in TypeScript
// https://vuejs.org/guide/typescript/overview.html#volar-recommended-configuration

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
