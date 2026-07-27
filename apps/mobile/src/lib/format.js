export function formatDate(value) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function humanize(value) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) =>
    letter.toUpperCase(),
  );
}
