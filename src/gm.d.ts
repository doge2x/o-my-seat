// === Greasemonkey 相关 API === //

declare function GM_getValue<T>(key: string): T | undefined;
declare function GM_setValue<T>(key: string, val: T | undefined): void;
