import { onMounted, onUnmounted } from "vue";

export function useEscapeKey(callback: () => void) {
  function handleEscape(event: { key: string }) {
    if (event.key === "Escape") {
      callback();
    }
  }

  onMounted(() => {
    document.addEventListener("keydown", handleEscape);
  });

  onUnmounted(() => {
    document.removeEventListener("keydown", handleEscape);
  });
}
