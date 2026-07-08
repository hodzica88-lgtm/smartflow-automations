type BusinessHoursEntry = {
  days: number[];
  startMinutes: number;
  endMinutes: number;
};

const WEEKDAY_MAP: Record<string, number> = {
  su: 0,
  so: 0,
  mo: 1,
  di: 2,
  tu: 2,
  mi: 3,
  we: 3,
  do: 4,
  th: 4,
  fr: 5,
  sa: 6,
};

const parseDayToken = (token: string): number[] => {
  const normalized = token.trim().toLowerCase().replace(/\./g, "");
  if (!normalized) {
    return [];
  }

  const rangeMatch = normalized.match(/^([a-z]{2})\s*-\s*([a-z]{2})$/);

  if (rangeMatch) {
    const start = WEEKDAY_MAP[rangeMatch[1]];
    const end = WEEKDAY_MAP[rangeMatch[2]];

    if (start === undefined || end === undefined) {
      return [];
    }

    const days: number[] = [];
    let current = start;

    while (true) {
      days.push(current);

      if (current === end) {
        break;
      }

      current = (current + 1) % 7;
    }

    return days;
  }

  const day = WEEKDAY_MAP[normalized];
  return day === undefined ? [] : [day];
};

const parseBusinessHoursLine = (line: string): BusinessHoursEntry | null => {
  const normalized = line.trim();

  if (!normalized) {
    return null;
  }

  const parts = normalized.split(",");
  if (parts.length < 2) {
    return null;
  }

  const rawDays = parts[0].trim();
  const rawTime = parts.slice(1).join(",").trim();
  const dayTokens = rawDays.split(/[\s;&]+/).map((token) => token.trim()).filter(Boolean);
  const days = dayTokens.flatMap(parseDayToken);

  if (days.length === 0) {
    return null;
  }

  const timeMatch = rawTime.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);

  if (!timeMatch) {
    return null;
  }

  const startMinutes = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  const endMinutes = Number(timeMatch[3]) * 60 + Number(timeMatch[4]);

  if (
    Number.isNaN(startMinutes) ||
    Number.isNaN(endMinutes) ||
    startMinutes >= endMinutes ||
    startMinutes < 0 ||
    endMinutes > 24 * 60
  ) {
    return null;
  }

  return {
    days,
    startMinutes,
    endMinutes,
  };
};

const parseBusinessHours = (businessHours: string): BusinessHoursEntry[] =>
  businessHours
    .split(/[\n;]+/)
    .map(parseBusinessHoursLine)
    .filter((entry): entry is BusinessHoursEntry => entry !== null);

const getLocalParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const result = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    weekday: 0,
  };

  for (const part of parts) {
    switch (part.type) {
      case "year":
        result.year = Number(part.value);
        break;
      case "month":
        result.month = Number(part.value);
        break;
      case "day":
        result.day = Number(part.value);
        break;
      case "hour":
        result.hour = Number(part.value);
        break;
      case "minute":
        result.minute = Number(part.value);
        break;
      case "weekday": {
        const weekday = part.value.toLowerCase().slice(0, 2);
        result.weekday = WEEKDAY_MAP[weekday] ?? 0;
        break;
      }
    }
  }

  return result;
};

const getDateFromLocal = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date | null => {
  let tentative = new Date(Date.UTC(year, month - 1, day, hour, minute));

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const actual = getLocalParts(tentative, timeZone);
    if (
      actual.year === year &&
      actual.month === month &&
      actual.day === day &&
      actual.hour === hour &&
      actual.minute === minute
    ) {
      return tentative;
    }

    const targetUtcMidnight = Date.UTC(year, month - 1, day);
    const actualUtcMidnight = Date.UTC(actual.year, actual.month - 1, actual.day);
    const dayDelta = Math.round((targetUtcMidnight - actualUtcMidnight) / 86400000);
    const actualTotalMinutes = actual.hour * 60 + actual.minute + dayDelta * 1440;
    const desiredTotalMinutes = hour * 60 + minute;
    const diffMinutes = desiredTotalMinutes - actualTotalMinutes;

    tentative = new Date(tentative.getTime() + diffMinutes * 60000);
  }

  return null;
};

const addDaysToLocalDate = (
  year: number,
  month: number,
  day: number,
  offsetDays: number,
): { year: number; month: number; day: number } => {
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

export const getOwnerNotificationScheduledFor = (
  timeZone: string,
  businessHours?: string | null,
): string => {
  const nowUtc = new Date();

  if (!businessHours?.trim()) {
    return nowUtc.toISOString();
  }

  const schedule = parseBusinessHours(businessHours);

  if (schedule.length === 0) {
    return nowUtc.toISOString();
  }

  let localNow;
  try {
    localNow = getLocalParts(nowUtc, timeZone);
  } catch {
    return nowUtc.toISOString();
  }

  const currentMinutes = localNow.hour * 60 + localNow.minute;
  const todayEntries = schedule.filter((entry) => entry.days.includes(localNow.weekday));

  const isOpenNow = todayEntries.some(
    (entry) => currentMinutes >= entry.startMinutes && currentMinutes < entry.endMinutes,
  );

  if (isOpenNow) {
    return nowUtc.toISOString();
  }

  let candidate: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  } | null = null;

  const todayCandidates = todayEntries
    .filter((entry) => currentMinutes < entry.startMinutes)
    .map((entry) => ({
      year: localNow.year,
      month: localNow.month,
      day: localNow.day,
      hour: Math.floor(entry.startMinutes / 60),
      minute: entry.startMinutes % 60,
    }));

  if (todayCandidates.length > 0) {
    candidate = todayCandidates.reduce((first, next) => {
      if (next.hour < first.hour || (next.hour === first.hour && next.minute < first.minute)) {
        return next;
      }
      return first;
    });
  }

  if (!candidate) {
    for (let offset = 1; offset <= 7; offset += 1) {
      const nextDay = addDaysToLocalDate(localNow.year, localNow.month, localNow.day, offset);
      const nextWeekday = (localNow.weekday + offset) % 7;
      const nextEntries = schedule.filter((entry) => entry.days.includes(nextWeekday));

      if (nextEntries.length > 0) {
        const earliestEntry = nextEntries.reduce((first, next) =>
          next.startMinutes < first.startMinutes ? next : first,
        );

        candidate = {
          year: nextDay.year,
          month: nextDay.month,
          day: nextDay.day,
          hour: Math.floor(earliestEntry.startMinutes / 60),
          minute: earliestEntry.startMinutes % 60,
        };
        break;
      }
    }
  }

  if (!candidate) {
    return nowUtc.toISOString();
  }

  const zonedDate = getDateFromLocal(
    candidate.year,
    candidate.month,
    candidate.day,
    candidate.hour,
    candidate.minute,
    timeZone,
  );

  return zonedDate?.toISOString() ?? nowUtc.toISOString();
};
