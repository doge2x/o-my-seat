import { render } from "solid-js/web";
import { injectStyle } from "./inject";
import { setSetting, settings, Settings } from "./settings";
import { openWin } from "./utils";
import style from "./style.module.less";
import { JSX } from "solid-js/jsx-runtime";
import { createSignal } from "solid-js";
import { RsvChecker, fetchRsvSta } from "./rsv-sta";

function LocalSetting<K extends keyof Settings>(props: {
  name: K;
  label: string;
  type: string;
  parse: (s: string) => Settings[K];
}) {
  return (
    <Setting
      value={String(settings[props.name])}
      onChange={(ev) =>
        setSetting(props.name, props.parse(ev.currentTarget.value))
      }
      {...props}
    />
  );
}

function Setting(props: {
  name: string;
  label: string;
  type: string;
  value: string;
  onChange?: JSX.EventHandlerUnion<HTMLInputElement, Event>;
}) {
  return (
    <div class={style.settingsEntry}>
      <label for={props.name} textContent={props.label} />
      <input id={props.name} required {...props} />
    </div>
  );
}

function identity<T>(t: T) {
  return t;
}

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function padZero2(num: number): string {
  return String(num).padStart(2, "0");
}

function date2hhmm(date: Date): string {
  return `${padZero2(date.getHours())}:${padZero2(date.getMinutes())}`;
}

/**
 * 执行占座程序
 */
async function performOccupation(
  roomId: string,
  date: string,
  onSuccess: (msg: string) => void,
  onFail: (msg: string) => void
) {
  const rsvSta = await fetchRsvSta(
    [settings.openStart, settings.openEnd],
    date,
    roomId
  );

  function occupy(
    prefix: string,
    start: string,
    end: string,
    minMinutes: number
  ) {
    const checker = new RsvChecker(
      date,
      [start, end],
      [settings.openStart, settings.openEnd],
      minMinutes
    );
    for (const data of rsvSta.data) {
      const spare = checker.check(data);
      if (spare != null) {
        onSuccess(
          `${prefix}预约成功：${date2hhmm(spare[0])}-${date2hhmm(spare[1])}于${
            data.devName
          }座`
        );
        return;
      }
    }
    onFail(`${prefix}预约失败！`);
  }

  occupy("上午", settings.amStart, settings.amEnd, settings.amMinMinutes);
  occupy("下午", settings.pmStart, settings.pmEnd, settings.pmMinMinutes);
}

/**
 * 准备占座程序，设定相关参数
 *
 * @param roomId 房间 ID
 */
export function prepareOccupation(roomId: string) {
  const win = openWin({ title: "设置", width: 300, height: 400 });
  injectStyle(win.document);
  render(() => {
    const [date, setDate] = createSignal(tomorrow());
    return (
      <div>
        <form
          class={style.settings}
          onSubmit={(ev) => {
            ev.preventDefault();
            performOccupation(roomId, date(), win.alert, win.alert);
          }}
        >
          <Setting
            name="rsvDate"
            label="预约日期"
            type="date"
            value={tomorrow()}
            onChange={(ev) => setDate(ev.currentTarget.value)}
          />
          <LocalSetting
            name="amStart"
            label="上午预约开始"
            type="time"
            parse={identity}
          />
          <LocalSetting
            name="amEnd"
            label="上午预约结束"
            type="time"
            parse={identity}
          />
          <LocalSetting
            name="amMinMinutes"
            label="上午持续时间（分钟）"
            type="number"
            parse={parseInt}
          />
          <LocalSetting
            name="pmStart"
            label="下午预约开始"
            type="time"
            parse={identity}
          />
          <LocalSetting
            name="pmEnd"
            label="下午预约结束"
            type="time"
            parse={identity}
          />
          <LocalSetting
            name="pmMinMinutes"
            label="下午持续时间（分钟）"
            type="number"
            parse={parseInt}
          />
          <LocalSetting
            name="openStart"
            label="图书馆营业开始"
            type="time"
            parse={identity}
          />
          <LocalSetting
            name="openEnd"
            label="图书馆营业结束"
            type="time"
            parse={identity}
          />
          <LocalSetting
            name="tryStart"
            label="开始尝试时间"
            type="time"
            parse={identity}
          />
          <LocalSetting
            name="tryInterval"
            label="尝试间隔（秒）"
            type="number"
            parse={parseInt}
          />
          <LocalSetting
            name="tryMax"
            label="尝试次数"
            type="number"
            parse={parseInt}
          />
          <div class={style.settingsSubmit}>
            <button type="submit" textContent={"执行"} />
          </div>
        </form>
      </div>
    );
  }, win.document.body);
  return;
}
