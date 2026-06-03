import { describe, expect, it } from "vitest";

describe("practice export rows", () => {
  it("uses the newest practice text records and includes photos for pdf rendering", async () => {
    const { buildPracticeExportRows } = await import("../utils/practiceExport.js");
    const fish = {
      subjectName: (subject) => ({ ds: "数据结构", math1: "数学一" }[subject] || subject),
      tx: (value) => (typeof value === "object" ? value.zh : value),
    };
    const rows = buildPracticeExportRows(
      [
        {
          date: "2026-05-29",
          createdAt: "2026-05-29T10:00:00.000Z",
          subject: "math1",
          source: { zh: "旧卷" },
          total: 20,
          correct: 13,
          minutes: 40,
          note: { zh: "较早记录" },
          photos: ["data:image/png;base64,not-exported"],
        },
        {
          date: "2026-05-31",
          createdAt: "2026-05-31T10:00:00.000Z",
          subject: "ds",
          source: { zh: "王道二叉树" },
          total: 10,
          correct: 8,
          minutes: 25,
          note: { zh: "遍历顺序和递归出口要再复盘" },
          photos: ["data:image/png;base64,newest"],
        },
        {
          date: "2026-05-30",
          createdAt: "2026-05-30T10:00:00.000Z",
          subject: "math1",
          source: { zh: "660 极限" },
          total: 12,
          correct: 10,
          minutes: 30,
          note: { zh: "洛必达条件别漏" },
        },
      ],
      fish,
      { limit: 2 },
    );

    expect(rows).toEqual([
      {
        日期: "2026-05-31",
        科目: "数据结构",
        题源: "王道二叉树",
        总题数: 10,
        正确数: 8,
        分钟: 25,
        刷题记录: "遍历顺序和递归出口要再复盘",
        题目照片: ["data:image/png;base64,newest"],
      },
      {
        日期: "2026-05-30",
        科目: "数学一",
        题源: "660 极限",
        总题数: 12,
        正确数: 10,
        分钟: 30,
        刷题记录: "洛必达条件别漏",
        题目照片: [],
      },
    ]);
    expect(rows[0]["题目照片"]).toEqual(["data:image/png;base64,newest"]);
  });
});
