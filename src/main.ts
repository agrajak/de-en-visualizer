import "../index.css";
import * as R from "remeda";
import { nanoid } from "nanoid";

class Editor {
  element: HTMLElement;
  root: Node | null = null;
  resetNode() {
    if (!this.root) return;

    const value = getInnerTextFromNode(this.root);
    this.element.innerHTML = "";
    this.element.innerText = value;

    this.element.setAttribute("contenteditable", "true");
    if (document.activeElement !== this.element) this.element.focus();
    this.root = null;
  }

  setRoot(root: Node) {
    this.element.setAttribute("contenteditable", "false");

    this.element.innerText = "";
    const element = renderNode(root, () => {
      this.setRoot(root);
    });
    this.root = root;

    this.element.appendChild(element);
  }

  getInnerText() {
    return this.root ? getInnerTextFromNode(this.root) : this.element.innerText;
  }

  constructor(element: HTMLElement) {
    this.element = element;
    this.element.addEventListener("click", () => {
      this.resetNode();
    });
    this.element.addEventListener("blur", () => {
      const innerText = this.getInnerText();
      if (innerText) {
        const node = constructNode(innerText);
        editor.setRoot(node);
      }
    });
  }
}

const editor = new Editor(document.querySelector("#editor") as HTMLElement);
editor.setRoot(constructNode(editor.getInnerText()));

function isEncoded(value: string) {
  try {
    return decodeURIComponent(value) !== value;
  } catch (e) {
    return false;
  }
}

type BaseNode = {
  id: string;
  encoded?: boolean;
};
type Node =
  | ({
      type: "url";
      content: string;
      params?: { key: string; value: Node }[];
    } & BaseNode)
  | ({
      type: "string";
      content: string;
    } & BaseNode);

function getInnerTextFromNode(node: Node): string {
  let value = "";

  value = value + node.content;

  if (node.type === "url" && node.params) {
    value = value + "?";
    const params = new URLSearchParams(
      R.mapToObj(node.params, (item) => {
        return [
          item.key,
          item.value.type === "url"
            ? getInnerTextFromNode(item.value)
            : item.value.content,
        ];
      })
    ).toString();
    value = value + params;
  }
  return value;
}

function constructNode(value: string): Node {
  const id = nanoid();
  try {
    const url = new URL(value);

    return {
      type: "url",
      encoded: isEncoded(value),
      id,
      content: url.search ? value.split("?")[0] : value,
      params: Array.from(url.searchParams.entries()).map(([key, value]) => {
        return {
          key,
          value: constructNode(value),
        };
      }),
    };
  } catch (e) {
    return {
      type: "string",
      id,
      content: value,
    };
  }
}

function $(tag: string, name: string | string[], text?: string) {
  const el = document.createElement(tag);
  if (typeof name === "string") {
    el.classList.add(name);
  } else {
    name.filter((x) => x).forEach((x) => el.classList.add(x));
  }
  if (text) el.innerText = text;
  return el;
}

function $toggle(encoded: boolean, onClick: (e: MouseEvent) => void) {
  const box = $("div", "toggle-box");
  box.setAttribute("contenteditable", "false");
  const text = encoded ? "decode" : "encode";
  const toggle = $("button", ["toggle", text], text);

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick(e);
  });

  box.appendChild(toggle);

  return box;
}

function renderNode(node: Node, onNodeChanged?: () => void): HTMLElement {
  const group = $("span", "group");
  group.setAttribute("id", node.id);

  group.appendChild(
    $toggle(Boolean(node.encoded), (e) => {
      const target = e.target;
      if (!(target instanceof HTMLButtonElement)) return;
      if (node.id) {
        node.encoded = !Boolean(node.encoded);
        if (onNodeChanged) onNodeChanged();
      }
    })
  );

  if (node.encoded) {
    const encoded = $("span", "encoded", getInnerTextFromNode(node));
    group.appendChild(encoded);
    return group;
  }

  const content = $("span", "content", node.content);
  group.appendChild(content);

  const params =
    node.type === "url"
      ? node.params?.map((param) => {
          const paramEl = $("span", []);

          const key = document.createElement("span");
          key.classList.add("key");
          key.innerText = param.key;
          paramEl.appendChild(key);

          const equation = $("span", "symbol", "=");

          paramEl.appendChild(equation);
          if (param.value.type === "string") {
            const value = $("span", "value", param.value.content);
            paramEl.appendChild(value);
          } else {
            const valueBox = $("span", "value-box");

            const node = renderNode(param.value, onNodeChanged);
            valueBox.appendChild(node);
            paramEl.appendChild(valueBox);
          }

          return paramEl;
        })
      : [];

  params?.forEach((param, index) => {
    const symbol = $("span", "symbol", index === 0 ? "?" : "&");
    group.appendChild(symbol);
    group.appendChild(param);
  });
  return group;
}
