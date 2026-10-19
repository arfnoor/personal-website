// Sample demo: a tiny task list, just to show the phone frame working.
// Replace this file with your own app (or point data-demo at a new folder).

export function mount(root) {
  root.innerHTML = `
    <style>
      .todo { height: 100%; display: flex; flex-direction: column; padding: 56px 20px 20px; box-sizing: border-box;
        background: #f7f7f5; color: #161616; font: 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
      .todo h3 { font-size: 30px; margin: 0 0 4px; font-weight: 700; }
      .todo .count { color: #777; margin: 0 0 20px; font-size: 14px; }
      .todo form { display: flex; gap: 8px; margin-bottom: 16px; }
      .todo input[type="text"] { flex: 1; min-width: 0; padding: 10px 12px; font: inherit; border: 1px solid #cfcfc9; border-radius: 8px; background: #fff; }
      .todo button { font: inherit; padding: 10px 14px; border: 1px solid #161616; border-radius: 8px; background: #161616; color: #fff; cursor: pointer; }
      .todo ul { list-style: none; margin: 0; padding: 0; overflow: auto; flex: 1; }
      .todo li { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #e3e3de; }
      .todo li span { flex: 1; }
      .todo li.done span { color: #999; text-decoration: line-through; }
      .todo input[type="checkbox"] { width: 20px; height: 20px; }
    </style>
    <div class="todo">
      <h3>Tasks</h3>
      <p class="count"></p>
      <form>
        <input type="text" placeholder="Add a task" aria-label="New task">
        <button type="submit">Add</button>
      </form>
      <ul></ul>
    </div>
  `;

  const list = root.querySelector("ul");
  const count = root.querySelector(".count");
  const form = root.querySelector("form");
  const input = root.querySelector('input[type="text"]');

  const tasks = [
    { text: "Review pull request", done: true },
    { text: "Write unit tests", done: false },
    { text: "Ship build to TestFlight", done: false },
  ];

  function render() {
    list.replaceChildren();
    tasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = task.done ? "done" : "";

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = task.done;
      box.setAttribute("aria-label", task.text);
      box.addEventListener("change", () => {
        task.done = box.checked;
        render();
      });

      const label = document.createElement("span");
      label.textContent = task.text;

      item.append(box, label);
      list.append(item);
    });
    count.textContent = `${tasks.filter((t) => !t.done).length} remaining`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    tasks.push({ text, done: false });
    input.value = "";
    render();
  });

  render();

  return () => root.replaceChildren();
}
