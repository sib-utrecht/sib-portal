"use client";

import * as React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date & time",
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Keep a local time string ("HH:MM") in sync with the value prop
  const [timeStr, setTimeStr] = React.useState<string>(
    value ? format(value, "HH:mm") : "00:00",
  );

  // When the parent value changes externally, sync the time string
  React.useEffect(() => {
    if (value) setTimeStr(format(value, "HH:mm"));
  }, [value]);

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      onChange(undefined);
      return;
    }
    const [hours, minutes] = timeStr.split(":").map(Number);
    const combined = new Date(day);
    combined.setHours(hours, minutes, 0, 0);
    onChange(combined);
    setOpen(false);
  }


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value
            ? format(value, "dd/MM/yyyy HH:mm", { locale: nl })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDaySelect}
          locale={nl}
          initialFocus
        />
        <div className="border-t p-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground w-10 shrink-0">Time</span>
          <Select
            value={timeStr.split(":")[0]}
            onValueChange={(h) => {
              const newTime = `${h}:${timeStr.split(":")[1]}`;
              setTimeStr(newTime);
              if (value) {
                const combined = new Date(value);
                combined.setHours(Number(h), Number(timeStr.split(":")[1]), 0, 0);
                onChange(combined);
              }
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">:</span>
          <Select
            value={timeStr.split(":")[1]}
            onValueChange={(m) => {
              const newTime = `${timeStr.split(":")[0]}:${m}`;
              setTimeStr(newTime);
              if (value) {
                const combined = new Date(value);
                combined.setHours(Number(timeStr.split(":")[0]), Number(m), 0, 0);
                onChange(combined);
              }
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
