import { Match, Switch, createSignal, For, JSX } from "solid-js";
import { setSetting } from "./settings";
import style from "./style.module.less";
import { uniqueId, unsafeCast } from "./utils";

export interface InputTypeMap {
  date: string;
  time: string;
  text: string;
  checkbox: boolean;
  number: number;
  datalist: string[];
}

function DataList(props: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const id = uniqueId("datalist-");
  const [current, setCurrent] = createSignal<string>("");
  const [_, setData] = createSignal<string[]>(props.value);
  return (
    <span class={style.datalist}>
      <input
        id={props.id}
        type="text"
        list={id}
        value={current()}
        onChange={(ev) => setCurrent(ev.currentTarget.value.trim())}
      />
      <datalist id={id}>
        <For each={props.value}>{(item) => <option value={item} />}</For>
      </datalist>
      <button
        type="button"
        onClick={() =>
          props.onChange(setData((data) => data.filter((v) => v !== current())))
        }
      >
        ➖
      </button>
      <button
        type="button"
        onClick={() =>
          current() === ""
            ? undefined
            : props.onChange(
                setData((data) =>
                  data.includes(current())
                    ? Array.from(data)
                    : data.concat(current())
                )
              )
        }
      >
        ➕
      </button>
    </span>
  );
}

/**
 * 一般参数项
 */
export function Entry<K extends keyof InputTypeMap>(props: {
  name: string;
  label: string;
  type: K;
  value: InputTypeMap[K];
  onChange: (val: InputTypeMap[K]) => void;
}) {
  const id = uniqueId("input-");
  const Input2 = (props2: JSX.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} type={props.type} {...props2} />
  );
  return (
    <div class={style.settingsEntry}>
      <label for={id} textContent={props.label} />
      <Switch>
        <Match
          when={
            props.type === "date" ||
            props.type === "time" ||
            props.type === "text"
          }
        >
          <Input2
            required
            value={unsafeCast(props.value)}
            onChange={(ev) =>
              props.onChange(unsafeCast(ev.currentTarget.value))
            }
          />
        </Match>
        <Match when={props.type === "number"}>
          <Input2
            required
            value={unsafeCast(props.value)}
            onChange={(ev) =>
              props.onChange(unsafeCast(parseInt(ev.currentTarget.value)))
            }
          />
        </Match>
        <Match when={props.type === "checkbox"}>
          <Input2
            checked={unsafeCast(props.value)}
            onChange={(ev) =>
              props.onChange(unsafeCast(ev.currentTarget.checked))
            }
          />
        </Match>
        <Match when={props.type === "datalist"}>
          <DataList
            id={id}
            value={unsafeCast(props.value)}
            onChange={(v) => setSetting("marked", v)}
          />
        </Match>
      </Switch>
    </div>
  );
}
