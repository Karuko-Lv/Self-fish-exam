import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import { describe, expect, it } from "vitest";
import ExportActions from "../components/ExportActions.vue";

describe("ExportActions", () => {
  it("offers CSV and PDF exports without JSON export", async () => {
    const app = createSSRApp({
      render: () =>
        h(ExportActions, {
          title: "导出测试",
          payload: [{ label: "value" }],
          rows: [{ label: "value" }],
        }),
    });

    const html = await renderToString(app);

    expect(html).toContain(">CSV<");
    expect(html).toContain(">PDF<");
    expect(html).not.toContain(">JSON<");
  });
});
