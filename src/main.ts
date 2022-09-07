// import { checkRsvSta, fetchRsvSta } from "./rsv-sta";
// import { OPEN_SPAN } from "./settings";
import { injectStartButton, injectStyle } from "./inject";
import { prepareOccupation } from "./occupy";

function main() {
  injectStyle(document);
  injectStartButton(prepareOccupation);
  // const date = "2022-09-03";
  // fetchRsvSta(OPEN_SPAN, date, "100455539").then((t) =>
  //   t.data.forEach((data) => {
  //     const spare = checkRsvSta(data, date, ["08:00", "12:00"], 3 * 60);
  //     if (spare != null) {
  //       console.log(
  //         `${
  //           data.title
  //         }: ${spare[0].toLocaleTimeString()} -- ${spare[1].toLocaleTimeString()}`
  //       );
  //     }
  //   })
  // );
}

if (__DEV_MODE) {
  console.warn("WARN: IN DEV MODE");
}
main();
