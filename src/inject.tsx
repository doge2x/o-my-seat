import { render } from "solid-js/web";
import { assertNonNullable, relURL } from "./utils";
import style from "./style.module.less";
import styleCss from "./style.module.less?inline";

/**
 * 注入样式表
 *
 * @param doc 目标页面
 */
export function injectStyle(doc: Document) {
  const css = doc.createElement("style");
  css.textContent = styleCss;
  doc.head.append(css);
}

/**
 * 注入占座按钮
 */
export function injectStartButton(cb: (roomId: string) => void) {
  document
    .querySelectorAll("li.cls_sec ul.sec_it_list li.it")
    .forEach((room) => {
      const a = assertNonNullable(room.firstElementChild);
      render(
        () => (
          <span
            onClick={(ev) => {
              ev.stopPropagation();
              const url = relURL(assertNonNullable(room.getAttribute("url")));
              cb(assertNonNullable(url.searchParams.get("roomId")));
            }}
            class={style.startButton}
          />
        ),
        a
      );
      a.prepend(assertNonNullable(a.lastElementChild));
    });
}
