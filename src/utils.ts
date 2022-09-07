export function tuple<T extends ReadonlyArray<unknown>>(...t: T): T {
  return t;
}

export function relURL(path: string): URL {
  return new URL(path, window.location.href);
}

export function assertNonNullable<T>(v: T, msg?: string): NonNullable<T> {
  if (v === null || v === undefined) {
    throw Error(msg ?? "unexpected null value");
  }
  return v;
}

export function openWin(opts: {
  title: string;
  width: number;
  height: number;
  left?: number;
  top?: number;
}) {
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
