"use client";

import * as React from "react";
import { format, isValid } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  /** When true, focusing this field puts the cursor in the time input instead of the date input */
  focusTime?: boolean;
}

// digit positions in "dd/MM/yyyy": 0,1=day  3,4=month  6,7,8,9=year  (2,5 are '/')
const DATE_SLOTS = [0, 1, 3, 4, 6, 7, 8, 9];

function snapDate(pos: number) {
  if (pos <= 1) return pos;
  if (pos === 2) return 3;
  if (pos <= 4) return pos;
  if (pos === 5) return 6;
  return Math.min(pos, 9);
}

function nextDateSlot(pos: number) {
  const i = DATE_SLOTS.indexOf(pos);
  return i === -1 || i === DATE_SLOTS.length - 1
    ? DATE_SLOTS[DATE_SLOTS.length - 1]
    : DATE_SLOTS[i + 1];
}

function prevDateSlot(pos: number) {
  const i = DATE_SLOTS.indexOf(pos);
  return i <= 0 ? DATE_SLOTS[0] : DATE_SLOTS[i - 1];
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
  required,
  id,
  focusTime = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [dateStr, setDateStr] = React.useState(value ? format(value, "dd/MM/yyyy") : "00/00/0000");
  const [timeStr, setTimeStr] = React.useState(value ? format(value, "HH:mm") : "00:00");
  const dateFocused = React.useRef(false);
  const timeFocused = React.useRef(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const timeInputRef = React.useRef<HTMLInputElement>(null);
  const calendarButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!dateFocused.current) setDateStr(value ? format(value, "dd/MM/yyyy") : "00/00/0000");
  }, [value]);

  const displayDate = React.useMemo(() => {
    const dm = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dm) return value;
    const day = Number(dm[1]),
      month = Number(dm[2]),
      year = Number(dm[3]);
    if (day < 1 || month < 1 || year < 1000) return value;
    const d = new Date(year, month - 1, day);
    if (isValid(d) && d.getDate() === day && d.getMonth() === month - 1) return d;
    return value;
  }, [dateStr, value]);

  React.useEffect(() => {
    if (!timeFocused.current) setTimeStr(value ? format(value, "HH:mm") : "00:00");
  }, [value]);

  function tryCommit(dStr: string, tStr: string) {
    const dm = dStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const tm = tStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!dm || !tm) return;
    const day = Number(dm[1]),
      month = Number(dm[2]),
      year = Number(dm[3]);
    if (day < 1 || month < 1 || year < 1000) return;
    const date = new Date(year, month - 1, day, Number(tm[1]), Number(tm[2]), 0, 0);
    if (isValid(date) && date.getDate() === day && date.getMonth() === month - 1) onChange(date);
  }

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      onChange(undefined);
      return;
    }
    const tm = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    const combined = new Date(day);
    combined.setHours(tm ? Number(tm[1]) : 0, tm ? Number(tm[2]) : 0, 0, 0);
    onChange(combined);
    setOpen(false);
  }

  // ── date input ──────────────────────────────────────────────────────────────

  function handleDateKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const pos = snapDate(input.selectionStart ?? 0);

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const d = e.key;
      if (pos === 0 && d > "3") return;
      if (pos === 1 && dateStr[0] === "3" && d > "1") return;
      if (pos === 3 && d > "1") return;
      if (pos === 4 && dateStr[3] === "1" && d > "2") return;
      const chars = dateStr.split("");
      chars[pos] = d;
      const newStr = chars.join("");
      setDateStr(newStr);
      // after month (pos 4) or year (pos 9), jump to the time input
      if (pos === 4 || pos === 9) {
        requestAnimationFrame(() => {
          timeInputRef.current?.focus();
          timeInputRef.current?.setSelectionRange(0, 0);
        });
      } else {
        const next = nextDateSlot(pos);
        requestAnimationFrame(() => input.setSelectionRange(next, next));
      }
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      const clearAt = prevDateSlot(pos);
      const chars = dateStr.split("");
      chars[clearAt] = "0";
      setDateStr(chars.join(""));
      requestAnimationFrame(() => input.setSelectionRange(clearAt, clearAt));
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (pos === 0) {
        calendarButtonRef.current?.focus();
      } else {
        const p = prevDateSlot(pos);
        requestAnimationFrame(() => input.setSelectionRange(p, p));
      }
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const p = nextDateSlot(pos);
      if (p === pos) {
        // already at last slot — cross to time
        requestAnimationFrame(() => {
          timeInputRef.current?.focus();
          timeInputRef.current?.setSelectionRange(0, 0);
        });
      } else {
        requestAnimationFrame(() => input.setSelectionRange(p, p));
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      dateFocused.current = false;
      tryCommit(dateStr, timeStr);
      return;
    }

    if (e.key.length === 1) e.preventDefault();
  }

  function handleDateBlur() {
    dateFocused.current = false;
    let effectiveDateStr = dateStr;
    // If year is still unset but day/month were typed, fill in a sensible year
    const partial = dateStr.match(/^(\d{2})\/(\d{2})\/0000$/);
    if (partial) {
      const day = Number(partial[1]);
      const month = Number(partial[2]);
      if (day >= 1 && month >= 1) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const candidate = new Date(currentYear, month - 1, day);
        const useCurrentYear =
          isValid(candidate) &&
          candidate.getDate() === day &&
          candidate.getMonth() === month - 1 &&
          candidate >= now;
        const year = useCurrentYear ? currentYear : currentYear + 1;
        effectiveDateStr = `${partial[1]}/${partial[2]}/${year}`;
      }
    }
    tryCommit(effectiveDateStr, timeStr);
    setDateStr(value ? format(value, "dd/MM/yyyy") : effectiveDateStr);
  }

  function handleDateClick(e: React.MouseEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    requestAnimationFrame(() => {
      const p = snapDate(input.selectionStart ?? 0);
      input.setSelectionRange(p, p);
    });
  }

  // ── time input ──────────────────────────────────────────────────────────────

  function handleTimeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const pos = input.selectionStart ?? 0;

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const p = pos === 2 ? 3 : Math.min(pos, 4);
      const d = e.key;
      if (p === 0 && d > "2") return;
      if (p === 1 && timeStr[0] === "2" && d > "3") return;
      if (p === 3 && d > "5") return;
      const chars = timeStr.split("");
      chars[p] = d;
      setTimeStr(chars.join(""));
      if (p === 4) {
        // last digit — advance to next focusable element like Tab
        requestAnimationFrame(() => {
          const selector =
            'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';
          const all = Array.from(document.querySelectorAll<HTMLElement>(selector));
          const idx = all.indexOf(input);
          if (idx !== -1 && all[idx + 1]) all[idx + 1].focus();
        });
      } else {
        const next = p === 1 ? 3 : p + 1;
        requestAnimationFrame(() => input.setSelectionRange(next, next));
      }
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      let clearAt = pos - 1;
      if (clearAt === 2) clearAt = 1;
      if (clearAt < 0) return;
      const chars = timeStr.split("");
      chars[clearAt] = "0";
      setTimeStr(chars.join(""));
      requestAnimationFrame(() => input.setSelectionRange(clearAt, clearAt));
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dir = e.key === "ArrowLeft" ? -1 : 1;
      if (dir === -1 && pos === 0) {
        // cross to date, last slot
        requestAnimationFrame(() => {
          dateInputRef.current?.focus();
          dateInputRef.current?.setSelectionRange(9, 9);
        });
        return;
      }
      let next = pos + dir;
      if (next === 2) next += dir;
      next = Math.max(0, Math.min(4, next));
      requestAnimationFrame(() => input.setSelectionRange(next, next));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      timeFocused.current = false;
      tryCommit(dateStr, timeStr);
      return;
    }

    if (e.key.length === 1) e.preventDefault();
  }

  function handleTimeBlur() {
    timeFocused.current = false;
    tryCommit(dateStr, timeStr);
    setTimeStr(value ? format(value, "HH:mm") : "00:00");
  }

  function handleTimeClick(e: React.MouseEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    requestAnimationFrame(() => {
      const p = input.selectionStart ?? 0;
      const snapped = p <= 1 ? p : p === 2 ? 3 : Math.min(p, 4);
      input.setSelectionRange(snapped, snapped);
    });
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex items-center w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <PopoverTrigger asChild>
          <button
            ref={calendarButtonRef}
            type="button"
            disabled={disabled}
            tabIndex={-1}
            aria-label="Open calendar"
            className="mr-2 shrink-0 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>

        <span className="mr-2 text-muted-foreground shrink-0 select-none inline-block w-[2ch] text-center">
          {displayDate && isValid(displayDate) ? format(displayDate, "EEEEEE", { locale: nl }) : ""}
        </span>

        <Input
          id={id}
          type="text"
          inputMode="numeric"
          ref={dateInputRef}
          tabIndex={focusTime ? -1 : undefined}
          required={required}
          value={dateStr}
          onChange={() => {}}
          onKeyDown={handleDateKeyDown}
          onClick={handleDateClick}
          onFocus={() => {
            dateFocused.current = true;
          }}
          onBlur={handleDateBlur}
          disabled={disabled}
          className={cn(
            "border-0 p-0 h-auto shadow-none focus-visible:ring-0 tabular-nums w-[88px] shrink-0",
            !value && "text-muted-foreground",
          )}
        />

        <span className="mx-2 text-muted-foreground shrink-0">·</span>

        <Input
          type="text"
          inputMode="numeric"
          aria-label="Tijd"
          value={timeStr}
          onChange={() => {}}
          onKeyDown={handleTimeKeyDown}
          onClick={handleTimeClick}
          onFocus={(e) => {
            timeFocused.current = true;
            if (focusTime) {
              const input = e.currentTarget;
              requestAnimationFrame(() => input.setSelectionRange(0, 0));
            }
          }}
          onBlur={handleTimeBlur}
          disabled={disabled}
          ref={timeInputRef}
          className={cn(
            "border-0 p-0 h-auto shadow-none focus-visible:ring-0 tabular-nums w-[48px] shrink-0",
            !value && "text-muted-foreground",
          )}
        />
      </div>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={handleDaySelect} locale={nl} autoFocus />
      </PopoverContent>
    </Popover>
  );
}
