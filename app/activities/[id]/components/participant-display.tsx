const colors = [
  "bg-[#21526f]",
  "bg-[#397b84]",
  "bg-[#7a5c8f]",
  "bg-[#a45c61]",
  "bg-[#5f7654]",
  "bg-[#9a6b38]",
] as const;

function color(name: string) {
  const hash = Array.from(name).reduce((total, character) => total + character.codePointAt(0)!, 0);
  return colors[hash % colors.length];
}

export function ParticipantAvatar({
  name,
  size = "large",
}: {
  name: string;
  size?: "small" | "large";
}) {
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase("en-GB") ?? "?";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${size === "large" ? "h-14 w-14 text-xl shadow-sm" : "h-12 w-12 text-lg"} ${color(name)}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
