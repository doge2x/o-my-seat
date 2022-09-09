export type KeyOfType<T, V> = keyof {
  [K in keyof T as T[K] extends V ? K : never]: never;
};

export function tuple<T extends ReadonlyArray<unknown>>(...t: T): T {
  return t;
}

export function unsafeCast<T, U>(t: T): U {
  return t as unknown as U;
}

export function relURL(path: string, params?: { [k: string]: string }): URL {
  const url = new URL(path, window.location.href);
  for (const [key, val] of Object.entries(params ?? {})) {
    url.searchParams.set(key, val);
  }
  return url;
}

export function hhmm2date(date: string, hhmm: string): Date {
  return new Date(`${date} ${hhmm}`);
}

function padZero2(num: number): string {
  return String(num).padStart(2, "0");
}

export function date2hhmm(date: Date): string {
  return `${padZero2(date.getHours())}:${padZero2(date.getMinutes())}`;
}

export function date2mmss(date: Date): string {
  return `${padZero2(date.getMinutes())}:${padZero2(date.getSeconds())}`;
}

export function assertNonNullable<T>(v: T, msg?: string): NonNullable<T> {
  if (v === null || v === undefined) {
    throw Error(msg ?? "unexpected null value");
  }
  return v;
}

export function uniqueId(prefix: string, length = 8) {
  return (
    prefix +
    parseInt(
      Math.ceil(Math.random() * Date.now())
        .toPrecision(length)
        .toString()
        .replace(".", "")
    )
  );
}

export function devLog(msg: string) {
  if (__DEV_MODE) {
    console.log(msg);
  }
}

export function classList(...list: (string | undefined)[]): {
  [k: string]: boolean;
} {
  const obj: { [k: string]: boolean } = {};
  for (const cls of list) {
    if (cls !== undefined) {
      obj[cls] = true;
    }
  }
  return obj;
}

export function openWin(opts: {
  title: string;
  width: number;
  height: number;
  left?: number;
  top?: number;
}): Window {
  const win = assertNonNullable(
    window.open(
      "",
      "",
      Object.entries(opts)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")
    ),
    "cannot open windows"
  );
  window.addEventListener("unload", () => win.close());
  const title = win.document.createElement("title");
  title.textContent = opts.title;
  win.document.head.append(title);
  return win;
}
