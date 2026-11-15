(() => {
  const button = document.getElementById("copy-ai-prompt");
  const prompt = document.getElementById("ai-plugin-prompt");
  const status = document.getElementById("copy-ai-status");
  if (!button || !prompt || !status) return;

  button.disabled = false;
  button.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(prompt.textContent);
      status.textContent = "已复制，请替换方括号中的需求。";
    } catch {
      status.textContent = "复制失败，请手动选中上方提示词复制。";
    }
  });
})();
