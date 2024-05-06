import "../index.css";
import * as R from "remeda";
import { nanoid } from "nanoid";
import { produce } from 'immer'
import React from 'react';
import copyIcon from '../public/copy-icon.svg';
import ReactDOM from 'react-dom/client'

type BaseNode = {
  id: string;
  encoded?: boolean;
};
type Param = { key: string; value: Node };
type Node =
  | ({
    type: "url";
    content: string;
    params?: Param[];
  } & BaseNode)
  | ({
    type: "string";
    content: string;
  } & BaseNode);

type NodeChangeEvent = ToggleEncodeEvent | ContentChangedEvent | UpdateNodeEvent | UpdateParamsEvent;

type ToggleEncodeEvent = { name: 'encode-toggle', id: string, encoded: boolean };
type ContentChangedEvent = { name: 'content-changed', id: string, content: string };
type UpdateParamsEvent = { name: 'update-params', id: string, params?: Param[] };
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
        if (!event) return node;

        if (node.id === event.id) {
          console.log({ event, node });
          if (event.name === 'encode-toggle') {
            return produce(node, draft => { draft.encoded = event.encoded });
          }
          if (event.name === 'content-changed') {
            return constructNode(event.content);
          }

          if (event.name === 'update-node') {
            return event.node;
          }
          if (event.name === 'update-params') {
            return produce(node, draft => {
              if (draft.type !== 'url') return;
              draft.params = event.params;
            });
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

function openToast(orangeText: string, text: string) {
  const body = document.querySelector('body');
  if (!body) return;
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    body.removeChild(toast)
  });

  const toast = document.createElement('div');

  toast.classList.add('toast')
  toast.classList.add('shadow')

  const orangeSpan = document.createElement('span');
  orangeSpan.classList.add('orange');
  orangeSpan.innerText = orangeText;

  const span = document.createElement('span');
  span.innerText = text;

  toast.appendChild(orangeSpan);
  toast.appendChild(span);


  body.appendChild(toast);
  toast.addEventListener("animationend", () => {
    body.removeChild(toast);
  })
}


function GroupEditor({ initNode, onNodeChanged, onCancel }: { initNode: Node, onNodeChanged?: (event: NodeChangeEvent) => void, onCancel?: () => void }) {

  const [element, setElement] = React.useState<HTMLDivElement | null>(null)
  const [params, setParams] = React.useState<{ id: string; key: string; value: string; }[]>(initNode.type === 'url' ? initNode.params?.map(param => {
    return {
      id: nanoid(),
      key: param.key,
      value: getInnerTextFromNode(param.value)
    }
  }) ?? [] : []);


  function getStringFromElement(): string {

    if (!onNodeChanged) return '';
    if (!element) return '';

    // todo construct node from queryString
    function getInnerTextFromSelector(baseElement: HTMLElement, selector: string) {
      if (!baseElement) return ''
      const el = baseElement.querySelector(selector)
      if (!(el instanceof HTMLElement)) return ''
      return el.innerText
    }

    const content = getInnerTextFromSelector(element, '.content')
    const params = Array.from(element.querySelectorAll('.param')).map(paramElement => {
      if (!(paramElement instanceof HTMLElement)) return null;
      const key = getInnerTextFromSelector(paramElement, '.key')
      const value = getInnerTextFromSelector(paramElement, '.value')

      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`

    }).filter(x => x).join('&');

    return params ? `${content}?${params}` : content;
  }

  return <span className="group editing"><div ref={(node) => {
    if (!node) return;
    setElement(node);
  }}>
    {initNode.type === 'string' ? <span className="content" contentEditable>{initNode.content}</span> : <div>
      <span className="content" contentEditable>{initNode.content}</span><span className="symbol">?</span><br></br>
      {params?.map((param) => {
        return <div className="param" key={param.id}>
          <span className="key" contentEditable>{param.key}</span>
          <span className="symbol">=</span>
          <span className="value" contentEditable>{param.value}</span>

          <button className="shadow" style={{ marginLeft: 5 }} onClick={() => {
            setParams(arr => arr.filter(item => item.id !== param.id))

          }}>✕</button>
        </div>
      })}
      <div>
        <button className="shadow" style={{ marginLeft: 5 }} onClick={() => {
          setParams(arr => [...arr, { id: nanoid(), key: 'abc', value: 'def' }])
        }}>add parameter</button>
      </div>

      <div className="right">
        <button className="shadow" onClick={() => {
          if (onCancel) onCancel();
        }}>cancel</button>
        <button className="shadow" style={{ marginLeft: 5 }} onClick={() => {
          if (!onNodeChanged) return;

          const text = getStringFromElement();

          const node = constructNode(text)

          onNodeChanged({
            name: 'update-node',
            id: initNode.id,
            node
          })
        }}>done</button>
      </div>
    </div>}

  </div></span>
}

function Group({ node, onNodeChanged }: { node: Node, onNodeChanged?: (event: NodeChangeEvent) => void }) {

  const [editable, setEditable] = React.useState(false);
  console.log('group', node.id, node.content, node)

  if (editable) {
    return <GroupEditor initNode={node} onNodeChanged={event => {
      if (onNodeChanged) {
        onNodeChanged(event);
        setEditable(false);
      }
    }} onCancel={() => {
      setEditable(false);
    }}></GroupEditor>

  }
  return <span className="group" id={node.id} onClick={event => {
    event.stopPropagation();
    if (event.target instanceof HTMLSpanElement) {
      if (
        event.target.closest('.editing')) return;
      setEditable(true);
    }
  }}>
    <div className="button-group">
      <button className={!node.encoded ? 'shadow' : 'invert-shadow'} onClick={() => {
        if (!onNodeChanged) return;
        onNodeChanged({
          name: 'encode-toggle',
          id: node.id,
          encoded: !node.encoded
        })
      }}>{node.encoded ? 'decode' : 'encode'}</button>
      <button><img width="16px" height="16px" src={copyIcon} onClick={() => {

        const buffer = getInnerTextFromNode(node)
        openToast(buffer, ` copied to clipboard successfully!`);
        window.navigator.clipboard.writeText(buffer);
      }}></img></button>

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
