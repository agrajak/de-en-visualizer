import "../index.css";
import * as R from "remeda";
import { nanoid } from "nanoid";
import { produce } from 'immer'
import React from 'react';
import ReactDOM from 'react-dom/client'

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

    const innerText = this.getInnerText();
    const url = new URL(window.location.href);
    url.searchParams.set("query", innerText);

    history.replaceState(null, "", url.toString());
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

type NodeChangeEvent = { id: string, encoded: boolean };

function EditorComponent({ initText }: { initText: string }) {
  const [node, setNode] = React.useState(constructNode(initText));

  return <Render node={node} onNodeChanged={(event) => {
    setNode(produce(node, draftState => {
      function searchNode(node: Node) {
        if (node.id === event.id) {
          node.encoded = event.encoded
        }

        if (node.type === 'string') return;
        node.params?.forEach(param => {
          if (param.value.type === 'url') {
            searchNode(param.value);
          }
        })

      }
      searchNode(draftState);
    }))
  }}></Render>
}

const editor = document.querySelector('#editor') as HTMLElement
const root = ReactDOM.createRoot(editor)

root.render(<EditorComponent initText={editor.innerText}></EditorComponent>)

/* const editor = new Editor(document.querySelector("#editor") as HTMLElement);
 editor.setRoot(constructNode(editor.getInnerText()));

document.addEventListener("paste", (e: ClipboardEvent) => {
  if (e.clipboardData) {
    const node = constructNode(e.clipboardData.getData("text/plain"));
    editor.setRoot(node);
  }
});

const params = new URLSearchParams(window.location.search);
const query = params.get("query");

if (query) {
  const node = constructNode(query);
  editor.setRoot(node);
}

*/
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

function Render({ node, onNodeChanged }: { node: Node, onNodeChanged?: (event: NodeChangeEvent) => void }) {
  return <span className="group" id={node.id}>
    <div contentEditable={false}><button className="toggle" onClick={() => {
      if (!onNodeChanged) return;
      onNodeChanged({
        id: node.id,
        encoded: !node.encoded
      })
    }}>{node.encoded ? 'decode' : 'encode'}</button></div>
    {node.encoded ? <span className="encoded">{getInnerTextFromNode(node)}</span> : <>
      <span className="content">{node.content}</span>
      {node.type === 'url' ? node.params?.map((param, index) => <React.Fragment key={param.key}>
        <span className="symbol">{index === 0 ? '?' : '&'}</span>

        <span>
          <span className="key">{param.key}</span>
          <span className="symbol">=</span>
          {param.value.type === 'string' ? <span className="value">{param.value.content}</span> : <span className="value-box"><Render node={param.value} onNodeChanged={onNodeChanged}></Render></span>}
        </span></React.Fragment>) : null}
    </>
    }
  </span>
}

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
