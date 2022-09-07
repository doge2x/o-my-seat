import { createStore } from "solid-js/store";

function getOrDefault<T>(key: string, defVal: T): T {
  const val = GM_getValue<T>(key);
  if (val === undefined) {
    GM_setValue(key, defVal);
    return defVal;
  }
  return val;
}

export interface Settings {
  // === 预约相关设置 === //

  // 预约时段
  amStart: string;
  amEnd: string;
  pmStart: string;
  pmEnd: string;
  // 预约至少持续时间（分钟）
  amMinMinutes: number;
  pmMinMinutes: number;
  // 图书馆营业时段
  openStart: string;
  openEnd: string;
  // 随机座位
  random: boolean;

  // === 执行相关设置 === //

  // 开始尝试时间
  tryStart: string;
  // 尝试间隔（秒）
  tryInterval: number;
  // 最多尝试次数
  tryMax: number;
}

const [state, setState] = createStore<Settings>({
  amStart: getOrDefault("amStart", "08:00"),
  amEnd: getOrDefault("amEnd", "12:00"),
  pmStart: getOrDefault("pmStart", "14:00"),
  pmEnd: getOrDefault("pmEnd", "20:00"),
  amMinMinutes: getOrDefault("amMinMinutes", 3 * 60),
  pmMinMinutes: getOrDefault("pmMinMinutes", 5 * 60),
  openStart: getOrDefault("openStart", "07:00"),
  openEnd: getOrDefault("openEnd", "22:00"),
  random: getOrDefault("random", false),
  tryStart: getOrDefault("tryStart", "07:00"),
  tryInterval: getOrDefault("tryInterval", 5),
  tryMax: getOrDefault("tryMax", 3),
});

export const settings = state;

export function setSetting<K extends keyof Settings>(key: K, val: Settings[K]) {
  GM_setValue(key, val);
  setState(key, val);
}
