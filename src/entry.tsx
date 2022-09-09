import { Match, Switch, createSignal, For, JSX, Show } from "solid-js";
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
  const [current, setCurrent] = createSignal("");
  const [, setData] = createSignal(props.value);
  const [showDropdown, setShowDropdown] = createSignal(false);
  window.addEventListener("click", () => setShowDropdown(false));
  return (
    <span class={style.datalist}>
      <span>
        <input
          id={props.id}
          type="text"
          list={id}
          value={current()}
          onInput={(ev) => setCurrent(ev.currentTarget.value.trim())}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setShowDropdown(false)}
        />
        <Show when={showDropdown()}>
          <div class={style.dropdown}>
            <For
              each={(() => {
                const curr = current().toLowerCase();
                return props.value.filter((s) =>
                  s.toLowerCase().startsWith(curr)
                );
              })()}
            >
              {(item) => (
                <div
                  class={style.dropdownEntry}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => setCurrent(item)}
                >
                  {item}
                </div>
              )}
            </For>
          </div>
        </Show>
      </span>
      <button
        type="button"
        onClick={() => {
          const curr = current();
          props.onChange(setData((data) => data.filter((v) => v !== curr)));
        }}
      >
        ➖
      </button>
      <button
        type="button"
        onClick={() => {
          const curr = current();
          if (curr === "") return;
          return props.onChange(
            setData((data) =>
              data.includes(curr) ? Array.from(data) : data.concat(curr)
            )
          );
        }}
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
            onChange={(v) => props.onChange(unsafeCast(v))}
          />
        </Match>
      </Switch>
    </div>
  );
}
