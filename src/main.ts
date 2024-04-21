import "../index.css";
import * as R from "remeda";
import { nanoid } from "nanoid";

const editor = document.querySelector("#editor") as HTMLElement;
let currentNode: Node | null = null;

function getInnerTextWithoutButton(element: HTMLElement): string {
  if (element.children.length > 0) {
    const result = Array.from(element.children)
      .filter((x): x is HTMLElement => x instanceof HTMLElement)
      .filter((x) => !(x instanceof HTMLButtonElement))
      .map((x) => getInnerTextWithoutButton(x));

    return result.reduce((acc, cur) => acc + cur, "");
  }
  return element.innerText;
}

function isEncoded(value: string) {
  try {
    return decodeURIComponent(value) !== value;
  } catch (e) {
    return false;
  }
}
function prettify() {
  if (!(editor instanceof HTMLDivElement)) throw new Error("Can't find editor");

  const parentGroup = editor.querySelector(".group");

  const value =
    parentGroup instanceof HTMLElement
      ? getInnerTextWithoutButton(parentGroup)
      : editor.innerText;

  const root = currentNode ? currentNode : constructNode(value);
  currentNode = root;

  editor.innerText = "";
  const element = render(root);

  editor.appendChild(element);
}

editor.addEventListener("input", prettify);

prettify();

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

  toggle.addEventListener("click", onClick);

  box.appendChild(toggle);

  return box;
}

function render(node: Node): HTMLElement {
  const group = $("span", "group");
  group.setAttribute("id", node.id);

  group.appendChild(
    $toggle(Boolean(node.encoded), (e) => {
      const target = e.target;
      if (!(target instanceof HTMLButtonElement)) return;
      if (node.id) {
        node.encoded = !Boolean(node.encoded);
        prettify();
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

            const node = render(param.value);
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
