import { devLog, hhmm2date, relURL } from "./utils";

// 图书馆预约状态
export interface RsvSta {
  ret: number;
  msg: string;
  data: RsvStaData[];
}

// 单座预约信息
export interface RsvStaData {
  devName: string;
  devId: string;
  state: string | null;
  ts: RsvStaDataTs[];
}

// 预约详情
export interface RsvStaDataTs {
  start: string;
  end: string;
}

/**
 * 从空闲时段中减去忙碌时段，返回余下的空闲时段
 *
 * ```ts
 *  getSpareTime(["08:00", "12:00"], ["09:00", "10:00"])
 *  // => [[08:00, 09:00], [10:00, 12:00]]
 * ```
 *
 * @param spare 空闲时段
 * @param busy 忙碌时段
 */
function getSpareTime(spare: [Date, Date], busy: [Date, Date]): [Date, Date][] {
  if (busy[0] <= spare[0]) {
    if (busy[1] <= spare[0]) {
      return [spare];
    } else if (busy[1] <= spare[1]) {
      return [[busy[1], spare[1]]];
    } else {
      return [];
    }
  } else if (busy[0] <= spare[1]) {
    if (busy[1] <= spare[1]) {
      return [
        [spare[0], busy[0]],
        [busy[1], spare[1]],
      ];
    } else {
      return [[spare[0], busy[0]]];
    }
  } else {
    return [spare];
  }
}

export class RsvChecker {
  date: string;
  start: Date;
  end: Date;
  minMs: number;

  /**
   * @param date 预约日期
   * @param rsvSpan 预约时段
   * @param openSpan 图书馆营业时段
   * @param minMinutes 至少持续时间
   */
  constructor(
    date: string,
    rsvSpan: [string, string],
    openSpan: [string, string],
    minMinutes: number
  ) {
    this.date = date;
    // 分钟转毫秒
    this.minMs = minMinutes * 60 * 1000;
    // 预约时段应该在营业时段之内
    const rsvStart = hhmm2date(date, rsvSpan[0]);
    const rsvEnd = hhmm2date(date, rsvSpan[1]);
    const openStart = hhmm2date(date, openSpan[0]);
    const openEnd = hhmm2date(date, openSpan[1]);
    this.start = rsvStart > openStart ? rsvStart : openStart;
    this.end = rsvEnd < openEnd ? rsvEnd : openEnd;
  }

  /**
   * 检查某座是否满足预约条件，如果可以则返回最早的时段
   *
   *  @param rsvSta 预约信息
   */
  check(rsvSta: RsvStaData): [Date, Date] | null {
    if (rsvSta.state === "close") {
      // 该座不开放
      return null;
    }
    // 全部空闲时段
    let allSpare: [Date, Date][] = [[this.start, this.end]];
    // 减去全部被占用时段
    for (const ts of rsvSta.ts) {
      // 从每个空闲时段中减去被占用时段，得到新的空闲时段
      allSpare = allSpare.reduce(
        (newSpare, spare) =>
          newSpare.concat(
            getSpareTime(spare, [new Date(ts.start), new Date(ts.end)])
          ),
        new Array<[Date, Date]>()
      );
    }
    // 在空闲时段中寻找满足最少持续时间的
    for (const spare of allSpare) {
      if (spare[1].getTime() - spare[0].getTime() >= this.minMs) {
        return spare;
      }
    }
    return null;
  }
}

/**
 * 获取图书馆预约信息
 *
 * ```ts
 *  fetchRsvSta(["07:00", "22:00"], "2022-09-01", "100000")
 * ```
 *
 * @param openSpan 图书馆开放时间
 * @param date 预约日期
 * @param roomId 房间 ID
 */
export async function fetchRsvSta(
  openSpan: [string, string],
  date: string,
  roomId: string
): Promise<RsvSta> {
  const url = relURL(
    "/ClientWeb/pro/ajax/device.aspx",
    // 设定参数
    {
      byType: "devcls",
      classkind: "8",
      display: "fp",
      md: "d",
      room_id: roomId,
      purpose: "",
      selectOpenAty: "",
      cld_name: "default",
      date: date,
      fr_start: openSpan[0],
      fr_end: openSpan[1],
      act: "get_rsv_sta",
      // _: "xxx",
    }
  );
  devLog(`请求预约信息：${url}`);
  return await fetch(url).then((t) => t.json());
}

interface SetRsv {
  ret: number;
  msg: string;
}

/**
 * 发起预约请求
 *
 * ```ts
 * postRsv("1000000", "09-01", "08:00", "12:00")
 * ```
 *
 * @param devId
 * @param date
 * @param start
 * @param end
 * @returns
 */
export async function fetchSetRsv(
  devId: string,
  date: string,
  start: string,
  end: string
): Promise<SetRsv> {
  const url = relURL("/ClientWeb/pro/ajax/reserve.aspx", {
    dialogid: "",
    dev_id: devId,
    lab_id: "",
    kind_id: "",
    room_id: "",
    type: "dev",
    prop: "",
    test_id: "",
    term: "",
    Vnumber: "",
    classkind: "",
    test_name: "",
    start: `${date} ${start}`,
    end: `${date} ${end}`,
    start_time: start.replace(":", ""),
    end_time: end.replace(":", ""),
    up_file: "",
    memo: "",
    act: "set_resv",
    // _:
  });
  devLog(`发起预约请求：${url}`);
  return await fetch(url).then((t) => t.json());
}
