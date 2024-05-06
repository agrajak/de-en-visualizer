import "../index.css";
import React from 'react';
import copyIcon from '../public/copy-icon.svg';
import ReactDOM from 'react-dom/client'
import openToast from './toast';
import { nanoid } from "nanoid";
import { getURLQuery, setURLQuery } from './query-string';
import { Node, nodeEventReducer, constructNode, getInnerTextFromNode, NodeChangeEvent, getParamsFromNode } from './node';

const editor = document.querySelector('#editor') as HTMLElement
const root = ReactDOM.createRoot(editor)

root.render(<Editor initText={getURLQuery() ?? editor.innerText}></Editor>)

function Editor({ initText }: { initText: string }) {
  const [node, setNode] = React.useState(constructNode(initText));

  React.useEffect(() => {
    document.addEventListener("paste", (e: ClipboardEvent) => {
      if (e.clipboardData) {
        const text = e.clipboardData.getData("text/plain")
        setNode(constructNode(text));
      }
    });

    window.addEventListener("popstate", (e: PopStateEvent) => {
      const data = e.state
      if (typeof data !== 'string') return;
      setNode(constructNode(data));
    })
  }, []);

  return <Group node={node} onNodeChanged={(event) => {
    setNode((node) => {
      const result = nodeEventReducer(node, event)
      const totalQuery = getInnerTextFromNode(result);

      setURLQuery(totalQuery)
      return result;

    });
  }}></Group>
}

function getInnerTextFromSelector(baseElement: HTMLElement, selector: string) {
  if (!baseElement) return ''
  const el = baseElement.querySelector(selector)
  if (!(el instanceof HTMLElement)) return ''
  return el.innerText
}

function GroupEditor({ initNode, onNodeChanged, onCancel }: { initNode: Node, onNodeChanged?: (event: NodeChangeEvent) => void, onCancel?: () => void }) {

  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const [params, setParams] = React.useState<{ id: string; key: string; value: string; }[]>(getParamsFromNode(initNode));

  function getStringFromElement(): string {

    if (!onNodeChanged) return '';
    if (!element) return '';

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
      <div style={{ opacity: 0.2 }} onClick={() => {
        setParams(arr => [...arr, { id: nanoid(), key: 'abc', value: 'def' }])
      }}>
        <span className="key">click to</span>
        <span className="symbol">=</span>
        <span className="value">add parameter</span>
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
