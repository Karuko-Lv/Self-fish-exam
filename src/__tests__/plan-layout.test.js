import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const planView = readFileSync(new URL("../views/PlanView.vue", import.meta.url), "utf8");
const stateComposable = readFileSync(new URL("../composables/useSelfFishState.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("plan page todo list", () => {
  it("renders a daily checkable todo block inside plan pages", () => {
    expect(planView).toContain('class="plan-todo-block"');
    expect(planView).toContain('v-model="newTodoText"');
    expect(planView).toContain("@submit.prevent=\"addCurrentTodo\"");
    expect(planView).toContain("fish.togglePagedPlanTodo(currentPlanPage.id, todo.id)");
    expect(planView).toContain("fish.updatePagedPlanTodo(currentPlanPage.id, todo.id, $event.target.value)");
    expect(planView).toContain("fish.deletePagedPlanTodo(currentPlanPage.id, todo.id)");
  });

  it("exposes todo mutations from the state composable", () => {
    expect(stateComposable).toContain("function addPagedPlanTodo");
    expect(stateComposable).toContain("function togglePagedPlanTodo");
    expect(stateComposable).toContain("function updatePagedPlanTodo");
    expect(stateComposable).toContain("function deletePagedPlanTodo");
  });

  it("defines compact todo styling for plan cards", () => {
    expect(styles).toContain(".plan-todo-block");
    expect(styles).toContain(".plan-todo-item");
    expect(styles).toContain(".plan-todo-item.is-done .plan-todo-text");
  });
});
