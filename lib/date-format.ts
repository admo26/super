type HumanDateOptions = {
  includeYear?: boolean;
};

function getOrdinal(day: number) {
  const remainder = day % 10;
  const teen = day % 100;

  if (teen >= 11 && teen <= 13) return "th";
  if (remainder === 1) return "st";
  if (remainder === 2) return "nd";
  if (remainder === 3) return "rd";
  return "th";
}

export function formatHumanDate(dateString: string, options: HumanDateOptions = {}) {
  const [yearValue, monthValue, dayValue] = dateString.split("-").map(Number);

  if (!yearValue || !monthValue || !dayValue) {
    return dateString;
  }

  const date = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC"
  }).format(date);
  const day = `${dayValue}${getOrdinal(dayValue)}`;

  if (options.includeYear) {
    return `${month} ${day}, ${yearValue}`;
  }

  return `${month} ${day}`;
}

export function formatDatesInText(value: string) {
  return value.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (match) => formatHumanDate(match));
}
