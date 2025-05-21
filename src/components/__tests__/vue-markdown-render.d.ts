declare module "vue-markdown-render" {
  import { DefineComponent } from "vue";
  const VueMarkdown: DefineComponent<{
    source: string;
    [key: string]: any;
  }>;
  export default VueMarkdown;
}
