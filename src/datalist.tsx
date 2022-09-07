import { createSignal, For } from "solid-js";
import style from "./style.module.less";

export function DataList(props: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const id = `datalist-${Date.now()}`;
  const [current, setCurrent] = createSignal<string>("");
  const [_, setData] = createSignal<string[]>(props.value);
  return (
    <span class={style.datalist}>
      <input
        id={props.id}
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
