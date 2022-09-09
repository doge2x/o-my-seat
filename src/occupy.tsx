import { render } from "solid-js/web";
import { injectStyle } from "./inject";
import { setSetting, settings, Settings } from "./settings";
import {
  date2hhmm,
  date2mmss,
  hhmm2date,
  KeyOfType,
  openWin,
  unsafeCast,
} from "./utils";
import style from "./style.module.less";
import {
  createMemo,
  createSignal,
  Index,
  JSX,
  Match,
  onCleanup,
  Show,
  Switch,
} from "solid-js";
import { RsvChecker, fetchRsvSta, fetchSetRsv, RsvStaData } from "./rsv-sta";
import { createStore } from "solid-js/store";
import { DataList } from "./datalist";
import { Log, logger } from "./logger";

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

interface Args {
  rsvDate: string;
  eagerly: boolean;
  rsvAm: boolean;
  rsvPm: boolean;
  _postReq: boolean; // DEV ONLY
}

interface InputTypeMap {
  date: string;
  time: string;
  text: string;
  checkbox: boolean;
  number: number;
  datalist: string[];
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
  const id = createMemo(() => `input-${Date.now()}`);
  const Input2 = (props2: JSX.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id()} type={props.type} {...props2} />
  );
  return (
    <div class={style.settingsEntry}>
      <label for={id()} textContent={props.label} />
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
            id={id()}
            value={unsafeCast(props.value)}
            onChange={(v) => setSetting("marked", v)}
          />
        </Match>
      </Switch>
    </div>
  );
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
 * 设置界面
 */
function Setting(props: { onSubmit: (args: Args) => void }) {
  const [args, setArgs] = createStore<Args>({
    rsvDate: tomorrow(),
    eagerly: false,
    rsvAm: true,
    rsvPm: true,
    _postReq: false,
  });

  /**
   * 临时使用的参数项
   */
  function ArgsEntry<
    K1 extends keyof Args,
    K2 extends KeyOfType<InputTypeMap, Args[K1]>
  >(props: { name: K1; label: string; type: K2 }) {
    return (
      <Entry<K2>
        value={unsafeCast(args[props.name])}
        onChange={(val: InputTypeMap[K2]) =>
          setArgs(props.name, unsafeCast(val))
        }
        {...props}
      />
    );
  }

  return (
    <form
      class={style.settings}
      onSubmit={(ev) => {
        ev.preventDefault();
        props.onSubmit(args);
      }}
    >
      <LocalEntry name="marked" label="优先座位" type="datalist" />
      <ArgsEntry name="rsvDate" label="预约日期" type="date" />
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
      <ArgsEntry name="rsvAm" label="预约上午" type="checkbox" />
      <ArgsEntry name="rsvPm" label="预约下午" type="checkbox" />
      <ArgsEntry name="eagerly" label="立即执行" type="checkbox" />
      <Show when={__DEV_MODE}>
        <ArgsEntry name="_postReq" label="[DEV]发起预约请求" type="checkbox" />
      </Show>
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
  const win = openWin({ title: "O My Seat", width: 300, height: 500 });
  injectStyle(win.document);
  render(() => {
    const [stage, setStage] = createSignal<OccupyStage>(OccupyStage.Prepare);

    // 日志
    const [logs, setLogs] = createSignal<Log[]>([]);
    const unsubscribe = logger.subscribe((log) => {
      setLogs((logs) => logs.concat(log));
    });

    // 计时器
    const [remain, setRemain] = createSignal<number>(-1);
    let timerCb: (() => void) | null = null;
    const setTimer = (durMs: number, cb: () => void) => {
      timerCb = cb;
      setRemain(durMs);
    };
    const timer = setInterval(() => {
      if (timerCb === null) return;
      setRemain(remain() - 10);
      if (remain() <= 0) {
        timerCb();
        timerCb = null;
      }
    }, 10);
    win.addEventListener("unload", () => clearInterval(timer));

    onCleanup(() => {
      unsubscribe();
      clearInterval(timer);
    });

    return (
      <div>
        <Switch>
          <Match when={stage() === OccupyStage.Prepare}>
            <Setting
              onSubmit={(args) => {
                const occupy = () => {
                  performOccupation(roomId, args, setTimer);
                };

                setStage(OccupyStage.Perform);
                if (args.eagerly) {
                  occupy();
                } else {
                  // 执行时间为今天某时
                  const startTime = hhmm2date(
                    new Date().toLocaleDateString(),
                    settings.tryStart
                  ).getTime();
                  setTimer(startTime - Date.now(), occupy);
                }
              }}
            />
          </Match>
          <Match when={stage() === OccupyStage.Perform}>
            <div class={style.logs}>
              <div class={style.logsEntry}>
                <i>*关闭窗口以取消</i>
              </div>
              <Index each={logs()}>
                {(item) => (
                  <div class={style.logsEntry} data-type={item().type}>
                    {item().msg}
                  </div>
                )}
              </Index>
              <Show when={remain() > 0}>
                <div class={style.logsTimer}>
                  <span>
                    等待中，于 {date2mmss(new Date(remain()))} 后开始执行
                  </span>
                </div>
              </Show>
            </div>
          </Match>
        </Switch>
      </div>
    );
  }, win.document.body);
  return;
}

/**
 * 执行占座程序
 */
async function performOccupation(
  roomId: string,
  { rsvDate, rsvAm, rsvPm, _postReq }: Args,
  setTimer: (durMs: number, cb: () => void) => void
) {
  async function fetchAndReorder(): Promise<RsvStaData[] | null> {
    let rsvSta = await fetchRsvSta(
      [settings.openStart, settings.openEnd],
      rsvDate,
      roomId
    );

    if (rsvSta === null) return null;

    if (settings.random) {
      // 将预约数据随意旋转一个偏移量
      const offset = Math.random() * rsvSta.length;
      rsvSta = rsvSta.slice(offset).concat(rsvSta.slice(0, offset));
    }

    const marked = settings.marked;
    if (marked.length > 0) {
      // 将优先预约的座位移动到最前面
      const newData = [];
      for (const data of rsvSta) {
        if (marked.includes(data.devName)) {
          newData.unshift(data);
        } else {
          newData.push(data);
        }
      }
      rsvSta = newData;
    }
    return rsvSta;
  }

  async function findAndRsv(
    rsvSta: RsvStaData[],
    start: string,
    end: string,
    minMinutes: number
  ): Promise<boolean> {
    const checker = new RsvChecker(rsvDate, [start, end], minMinutes);
    logger.info("寻找空座…");
    for (const data of rsvSta) {
      const spare = checker.check(data);
      if (spare != null) {
        logger.ok(
          `找到空座：${data.devName}，${date2hhmm(spare[0])}-${date2hhmm(
            spare[1]
          )}`
        );
        if (!__DEV_MODE || _postReq) {
          return await fetchSetRsv(data.devId, rsvDate, start, end);
        }
        return true;
      }
    }
    logger.err("未找到空座！");
    return false;
  }

  let rsvSta: RsvStaData[] | null = null;
  let tryCount = 0;
  const {
    tryMax,
    tryInterval,
    amStart,
    amEnd,
    amMinMinutes,
    pmStart,
    pmEnd,
    pmMinMinutes,
  } = settings;

  const cb = async () => {
    if (++tryCount > tryMax || (!rsvPm && !rsvAm)) return;
    logger.info(`第 ${tryCount}/${tryMax} 次尝试…`);
    rsvSta = await fetchAndReorder();
    if (rsvSta === null) return;

    if (rsvAm) {
      logger.info("预约上午…");
      rsvAm = !(await findAndRsv(rsvSta, amStart, amEnd, amMinMinutes));
    }
    if (rsvPm) {
      logger.info("预约下午…");
      rsvPm = !(await findAndRsv(rsvSta, pmStart, pmEnd, pmMinMinutes));
    }

    if (tryCount < tryMax && (rsvPm || rsvAm))
      setTimer(tryInterval * 1000, () => cb());
    else logger.info("执行结束！");
  };

  await cb();
}
