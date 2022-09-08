import { devLog } from "./utils";

export enum LogType {
  Info = "INFO",
  Ok = "OK",
  Err = "ERR",
}

export interface Log {
  type: LogType;
  msg: string;
}

export type Subscriber = (log: Log) => void;

class Logger {
  subscribers: Subscriber[] = [];

  /**
   * @returns 取消订阅的函数
   */
  subscribe(f: Subscriber): () => void {
    const id = this.subscribers.length;
    this.subscribers.push(f);
    return () => (this.subscribers[id] = () => undefined);
  }

  send(log: Log) {
    for (const sub of this.subscribers) {
      sub(log);
    }
  }

  info(msg: string) {
    this.send({ type: LogType.Info, msg });
  }

  ok(msg: string) {
    this.send({ type: LogType.Ok, msg });
  }

  err(msg: string) {
    this.send({ type: LogType.Err, msg });
  }
}

export const logger = new Logger();

logger.subscribe((log) => devLog(log.msg));
