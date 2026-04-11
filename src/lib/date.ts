import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const JST = "Asia/Tokyo";

/**
 * 現在のJST日時を返す
 */
export function nowJst() {
  return dayjs().tz(JST);
}

/**
 * 日付文字列 (YYYY-MM-DD) をJSTの日付開始時刻に変換
 */
export function dateToJstStart(dateStr: string) {
  return dayjs.tz(dateStr, "YYYY-MM-DD", JST).startOf("day");
}

/**
 * JST の今日の日付文字列 (YYYY-MM-DD) を返す
 */
export function todayJst(): string {
  return nowJst().format("YYYY-MM-DD");
}

/**
 * UTC DateTime → JST 表示文字列
 */
export function formatJst(date: Date | null | undefined, format = "YYYY-MM-DD HH:mm"): string {
  if (!date) return "";
  return dayjs(date).tz(JST).format(format);
}

/**
 * 期限チェック: 現在時刻が deadline を過ぎているか
 */
export function isAfterDeadline(deadline: Date | null | undefined): boolean {
  if (!deadline) return false;
  return nowJst().isAfter(dayjs(deadline).tz(JST));
}

export { dayjs, JST };
