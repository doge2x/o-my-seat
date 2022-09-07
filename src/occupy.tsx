import { render } from "solid-js/web";
import { injectStyle } from "./inject";
import { setSetting, settings, Settings } from "./settings";
import {
  date2hhmm,
  date2mmss,
  devLog,
  hhmm2date,
  KeyOfType,
  openWin,
  unsafeCast,
} from "./utils";
import style from "./style.module.less";
import { createSignal, Index, JSX, Match, Show, Switch } from "solid-js";
import { RsvChecker, fetchRsvSta } from "./rsv-sta";

enum LogType {
  Success = "SUCCESS",
  Fail = "FAIL",
}

interface Log {
  type: LogType;
  msg: string;
}

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

/**
 * 执行占座程序
 */
async function performOccupation(
  roomId: string,
  date: string,
  onLog: (msg: Log) => void
) {
  const rsvSta = await fetchRsvSta(
    [settings.openStart, settings.openEnd],
    date,
    roomId
  );

  if (settings.random) {
    // 将预约数据随意旋转一个偏移量
    const offset = Math.random() * rsvSta.data.length;
    rsvSta.data = rsvSta.data
      .slice(offset)
      .concat(rsvSta.data.slice(0, offset));
  }

  const occupy = (
    prefix: string,
    start: string,
    end: string,
    minMinutes: number
  ) => {
    const checker = new RsvChecker(
      date,
      [start, end],
      [settings.openStart, settings.openEnd],
      minMinutes
    );
    for (const data of rsvSta.data) {
      const spare = checker.check(data);
      if (spare != null) {
        onLog({
          type: LogType.Success,
          msg: `${prefix}预约成功：${date2hhmm(spare[0])}-${date2hhmm(
            spare[1]
          )} 于 ${data.devName} 座`,
        });
        return;
      }
    }
    onLog({ type: LogType.Fail, msg: `${prefix}预约失败！` });
  };

  occupy("上午", settings.amStart, settings.amEnd, settings.amMinMinutes);
  occupy("下午", settings.pmStart, settings.pmEnd, settings.pmMinMinutes);
}

interface InputTypeMap {
  date: string;
  time: string;
  text: string;
  checkbox: boolean;
  number: number;
}

/**
 * 持久化储存的参数项
 */
function LocalEntry<
  K1 extends keyof Settings,
  K2 extends KeyOfType<InputTypeMap, Settings[K1]>
>(props: { name: K1; label: string; type: K2 }) {
  return (
    <Entry<K2>
      value={unsafeCast(settings[props.name])}
      onChange={(val: InputTypeMap[K2]) =>
        setSetting(props.name, unsafeCast(val))
      }
      {...props}
    />
  );
}

/**
 * 一般参数项
 */
function Entry<K extends keyof InputTypeMap>(props: {
  name: string;
  label: string;
  type: K;
  value: InputTypeMap[K];
  onChange: (val: InputTypeMap[K]) => void;
}) {
  const Input2 = (props2: JSX.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={props.name} type={props.type} {...props2} />
  );
  return (
    <div class={style.settingsEntry}>
      <label for={props.name} textContent={props.label} />
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
      </Switch>
    </div>
  );
}

function Setting(props: {
  onSubmit: (date: string, eagerly: boolean) => void;
}) {
  const [date, setDate] = createSignal(tomorrow());
  const [eagerly, setEagerlyRun] = createSignal(false);
  return (
    <form
      class={style.settings}
      onSubmit={(ev) => {
        ev.preventDefault();
        props.onSubmit(date(), eagerly());
      }}
    >
      <Entry
        name="rsvDate"
        label="预约日期"
        type="date"
        value={date()}
        onChange={(t) => setDate(t)}
      />
      <LocalEntry name="amStart" label="上午预约开始" type="time" />
      <LocalEntry name="amEnd" label="上午预约结束" type="time" />
      <LocalEntry
        name="amMinMinutes"
        label="上午持续时间（分钟）"
        type="number"
      />
      <LocalEntry name="pmStart" label="下午预约开始" type="time" />
      <LocalEntry name="pmEnd" label="下午预约结束" type="time" />
      <LocalEntry
        name="pmMinMinutes"
        label="下午持续时间（分钟）"
        type="number"
      />
      <LocalEntry name="openStart" label="图书馆营业开始" type="time" />
      <LocalEntry name="openEnd" label="图书馆营业结束" type="time" />
      <LocalEntry name="tryStart" label="开始尝试时间" type="time" />
      <LocalEntry name="tryInterval" label="尝试间隔（秒）" type="number" />
      <LocalEntry name="tryMax" label="尝试次数" type="number" />
      <LocalEntry name="random" label="随机选座" type="checkbox" />
      <Entry
        name="eagerly"
        label="立即执行"
        type="checkbox"
        value={eagerly()}
        onChange={(t) => setEagerlyRun(t)}
      />
      <div class={style.settingsSubmit}>
        <button type="submit" textContent={"执行"} />
      </div>
    </form>
  );
}

enum OccupyStage {
  Prepare = "PREPARE",
  Perform = "PERFORM",
}

/**
 * 准备占座程序，设定相关参数
 *
 * @param roomId 房间 ID
 */
export function prepareOccupation(roomId: string) {
  const win = openWin({ title: "O My Seat", width: 300, height: 450 });
  injectStyle(win.document);
  render(() => {
    const [stage, setStage] = createSignal<OccupyStage>(OccupyStage.Prepare);
    const [logs, setLogs] = createSignal<Log[]>([], { equals: false });
    const [remain, setRemain] = createSignal<number>(-1);

    return (
      <div>
        <Switch>
          <Match when={stage() === OccupyStage.Prepare}>
            <Setting
              onSubmit={(date, eagerly) => {
                const occupy = () => {
                  performOccupation(roomId, date, (log) => {
                    devLog(log.msg);
                    setLogs((logs) => {
                      logs.push(log);
                      return logs;
                    });
                  });
                };

                setStage(OccupyStage.Perform);
                if (eagerly) {
                  occupy();
                } else {
                  // 执行时间为今天某时
                  const startTime = hhmm2date(
                    new Date().toLocaleDateString(),
                    settings.tryStart
                  );
                  const timer = setInterval(() => {
                    setRemain(startTime.getTime() - new Date().getTime());
                    if (remain() <= 0) {
                      clearInterval(timer);
                      occupy();
                    }
                  }, 100);
                  // 关闭窗口时取消执行
                  win.addEventListener("unload", () => {
                    devLog("取消预约");
                    clearInterval(timer);
                  });
                }
              }}
            />
          </Match>
          <Match when={stage() === OccupyStage.Perform}>
            <div class={style.logs}>
              <Show when={remain() > 0}>
                <div class={style.logsTimer}>
                  <span>
                    等待中，于 {date2mmss(new Date(remain()))} 后开始执行
                  </span>
                </div>
                <div class={style.logsEntry}>
                  <i>*关闭窗口以取消预约</i>
                </div>
              </Show>
              <Index each={logs()}>
                {(item) => (
                  <div class={style.logsEntry} data-type={item().type}>
                    {item().msg}
                  </div>
                )}
              </Index>
            </div>
          </Match>
        </Switch>
      </div>
    );
  }, win.document.body);
  return;
}
