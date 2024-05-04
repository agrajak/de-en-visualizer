import "../index.css";
import * as R from "remeda";
import { nanoid } from "nanoid";
import { produce } from 'immer'
import React from 'react';
import ReactDOM from 'react-dom/client'

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

type NodeChangeEvent = ToggleEncodeEvent | ContentChangedEvent | UpdateNodeEvent;

type ToggleEncodeEvent = { name: 'encode-toggle', id: string, encoded: boolean };
type ContentChangedEvent = { name: 'content-changed', id: string, content: string };
type UpdateNodeEvent = { name: 'update-node', id: string, node: Node };


function EditorComponent({ initText }: { initText: string }) {
  const [node, setNode] = React.useState(constructNode(initText));
  console.log({ node })

  React.useEffect(() => {
    document.addEventListener("paste", (e: ClipboardEvent) => {
      if (e.clipboardData) {
        const text = e.clipboardData.getData("text/plain")
        setNode(constructNode(text));
      }
    });
  }, []);

  return <Group node={node} onNodeChanged={(event) => {
    setNode((node) => {
      function mapNode(node: Node): Node {
        // terminal condition for recursive function
        if (node.id === event.id) {
          console.log({ event, node });
          if (event.name === 'encode-toggle') {
            return produce(node, draft => { draft.encoded = event.encoded });
          }
          if (event.name === 'content-changed') {
            return constructNode(event.content);
          }
        }
        // do the search
        if (node.type === 'string') return node;

        return produce(node, draft => {
          draft.params?.forEach(param => {
            param.value = mapNode(param.value);
          });
        })
      }
      return mapNode(node);
    });
  }}></Group>
}

const params = new URLSearchParams(window.location.search);
const query = params.get("query");

const editor = document.querySelector('#editor') as HTMLElement
const root = ReactDOM.createRoot(editor)

root.render(<EditorComponent initText={query ?? editor.innerText}></EditorComponent>)


function Group({ node, onNodeChanged }: { node: Node, onNodeChanged?: (event: NodeChangeEvent) => void }) {

  const [editable, setEditable] = React.useState(false);
  console.log('group', node.id, node.content, node)

  if (editable) {
    return (<span className="group" onBlur={(event) => {
      if (!onNodeChanged) return;
      const element = event.target;
      if (!(element instanceof HTMLElement)) return;

      const innerText = element.innerText;
      onNodeChanged({
        name: 'content-changed',
        id: node.id,
        content: innerText
      })
      setEditable(false);
    }} id={node.id}><div contentEditable ref={(element) => {
      if (!element) return;
      element.focus();
    }}>{getInnerTextFromNode((node))}</div></span>)

  }
  return <span className="group" id={node.id} onClick={event => {
    event.stopPropagation();
    if (event.target instanceof HTMLSpanElement) {
      setEditable(true);
    }
  }}>
    <div className="button-group"><button className={node.encoded ? '' : 'invert'} onClick={() => {
      if (!onNodeChanged) return;
      onNodeChanged({
        name: 'encode-toggle',
        id: node.id,
        encoded: !node.encoded
      })
    }}>{node.encoded ? 'decode' : 'encode'}</button>

    </div>
    {node.encoded ? <span className="encoded">{getInnerTextFromNode(node)}</span> : <>
      <span className="content">{node.content}</span>
      {node.type === 'url' ? node.params?.map((param, index) => <React.Fragment key={param.key}>
        <span className="symbol">{index === 0 ? '?' : '&'}</span>
        <span>
          <span className="key">{param.key}</span>
          <span className="symbol">=</span>
          {param.value.type === 'string' ? <span className="value">{param.value.content}</span> : <span className="value-box"><Group node={param.value} onNodeChanged={onNodeChanged}></Group></span>}
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
      encoded: false,
      id,
      content: url.origin,
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
