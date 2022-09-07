import { injectStartButton, injectStyle } from "./inject";
import { prepareOccupation } from "./occupy";

function main() {
  injectStyle(document);
  injectStartButton(prepareOccupation);
}

if (__DEV_MODE) {
  console.warn("WARN: IN DEV MODE");
}
main();
