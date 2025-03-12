
import { nanoid } from "nanoid";
import * as R from "remeda";
import { produce } from 'immer'

type BaseNode = {
  id: string;
  encoded?: boolean;
};
export type Param = { key: string; value: Node };
export type Node =
  | ({
    type: "url";
    content: string;
    params?: Param[];
  } & BaseNode)
  | ({
    type: "string";
    content: string;
  } & BaseNode);

export type NodeChangeEvent = ToggleEncodeEvent | ContentChangedEvent | UpdateNodeEvent | UpdateParamsEvent;

type ToggleEncodeEvent = { name: 'encode-toggle', id: string, encoded: boolean };
type ContentChangedEvent = { name: 'content-changed', id: string, content: string };
type UpdateParamsEvent = { name: 'update-params', id: string, params?: Param[] };
type UpdateNodeEvent = { name: 'update-node', id: string, node: Node };

export function nodeEventReducer(node: Node, event: NodeChangeEvent): Node {
  if (!event) return node;

  // terminal condition
  if (node.id === event.id) {
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
      param.value = nodeEventReducer(param.value, event);
    });
  })
}


export function getInnerTextFromNode(node: Node): string {
  let value = "";

  value = value + node.content;

  if (node.type === "url" && node.params && node.params.length > 0) {
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

export function constructNode(value: string): Node {
  const [origin, ...rest] = value.split('?');

  const id = nanoid();
  try {
    const searchParams = new URLSearchParams(rest.join(''));

    return {
      type: "url",
      encoded: false,
      id,
      content: origin,
      params: Array.from(searchParams.entries()).map(([key, value]) => {
        return {
          key,
          value: constructNode(value),
        };
      }),
    };
  } catch (e) {
    console.error(e)
    return {
      type: "string",
      id,
      content: value,
    };
  }
}

export function getParamsFromNode(node: Node): { id: string, key: string, value: string }[] {
  return node.type === 'url' ? node.params?.map(param => {
    return {
      id: nanoid(),
      key: param.key,
      value: getInnerTextFromNode(param.value)
    }
  }) ?? [] : []
}
