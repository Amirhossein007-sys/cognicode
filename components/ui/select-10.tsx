"use client";

import { useId, useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);
const PERIODS = ["AM", "PM"] as const;

// ۴ بخش شبانه‌روز طبق درخواست:
// شب: ۲۱:۰۰ تا ۰۵:۰۰ | صبح: ۰۵:۰۰ تا ۱۲:۰۰ | ظهر: ۱۲:۰۰ تا ۱۶:۳۰ | عصر: ۱۶:۳۰ تا ۲۱:۰۰
export const DAYPARTS = [
  { id: "morning", label: "صبح", hour: "08", minute: "00", period: "AM", startH: 5, startM: 0, endH: 12, endM: 0, greeting: "صبح زیباتون بخیر و پر از نشاط و یادگیری" },
  { id: "noon", label: "ظهر", hour: "12", minute: "30", period: "PM", startH: 12, startM: 0, endH: 16, endM: 30, greeting: "ظهرتون زیبا و دل‌نشین، سرشار از تمرکز و برکت" },
  { id: "afternoon", label: "عصر", hour: "05", minute: "30", period: "PM", startH: 16, startM: 30, endH: 21, endM: 0, greeting: "عصرتون قشنگ و رویایی، آرامش‌بخش و با انرژی" },
  { id: "night", label: "شب", hour: "10", minute: "00", period: "PM", startH: 21, startM: 0, endH: 5, endM: 0, greeting: "شبتون پر ستاره و رویایی، آرامش و استراحت عمیق" },
] as const;

export type DaypartId = typeof DAYPARTS[number]["id"];

function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-flex h-5 w-5 items-center justify-center overflow-hidden font-bold">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="absolute"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function SelectTimePicker() {
  const hourId = useId();
  const minuteId = useId();
  const periodId = useId();

  const [hour, setHour] = useState("04");
  const [minute, setMinute] = useState("15");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("PM");
  const [shamsiDate, setShamsiDate] = useState("");
  const [isLive, setIsLive] = useState(true);

  // محاسبهٔ زمان بر اساس وقت تهران (UTC + 3:30)
  const getTehranTime = () => {
    const now = new Date();
    const tehran = new Date(now.getTime() + (now.getTimezoneOffset() + 210) * 60000);
    const rawH = tehran.getHours();
    const rawM = tehran.getMinutes();
    const p: (typeof PERIODS)[number] = rawH >= 12 ? "PM" : "AM";
    const h12 = rawH % 12 === 0 ? 12 : rawH % 12;
    return {
      hour: String(h12).padStart(2, "0"),
      minute: String(rawM).padStart(2, "0"),
      period: p,
      rawH,
      rawM,
      tehranDate: tehran,
    };
  };

  // به‌روزرسانی زنده ساعت و تاریخ شمسی
  useEffect(() => {
    const update = () => {
      const t = getTehranTime();
      if (isLive) {
        setHour(t.hour);
        setMinute(t.minute);
        setPeriod(t.period);
      }
      try {
        const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
          timeZone: "Asia/Tehran",
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        setShamsiDate(formatter.format(new Date()));
      } catch {
        setShamsiDate("تهران");
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // تبدیل به ساعت ۲۴ ساعته تهران
  const current24 = useMemo(() => {
    const hNum = Number(hour) % 12;
    return period === "PM" ? hNum + 12 : hNum;
  }, [hour, period]);

  const currentMinutesTotal = useMemo(() => {
    return current24 * 60 + Number(minute);
  }, [current24, minute]);

  // بخش شبانه‌روز فعال طبق بازه‌های دقیق کاربر
  const activeDaypart = useMemo(() => {
    const total = currentMinutesTotal;
    // صبح: 05:00 (300) تا 12:00 (720)
    if (total >= 5 * 60 && total < 12 * 60) return "morning";
    // ظهر: 12:00 (720) تا 16:30 (990)
    if (total >= 12 * 60 && total < 16 * 60 + 30) return "noon";
    // عصر: 16:30 (990) تا 21:00 (1260)
    if (total >= 16 * 60 + 30 && total < 21 * 60) return "afternoon";
    // شب: 21:00 (1260) تا 05:00 (300)
    return "night";
  }, [currentMinutesTotal]);

  const activeSlotInfo = useMemo(() => {
    return DAYPARTS.find((d) => d.id === activeDaypart) || DAYPARTS[0];
  }, [activeDaypart]);

  const isDay = activeDaypart === "morning" || activeDaypart === "noon";

  const applyPreset = (preset: (typeof DAYPARTS)[number]) => {
    setIsLive(false);
    setHour(preset.hour);
    setMinute(preset.minute);
    setPeriod(preset.period);
  };

  return (
    <div className="w-full max-w-sm space-y-3 font-sans select-none" dir="rtl">
      <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl p-4 shadow-xl">
        {/* تاریخ شمسی مینیمال در گوشهٔ ساعت */}
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground px-1">
          <span className="font-medium tracking-tight text-primary/80">
            {shamsiDate || "وقت تهران"}
          </span>
          {!isLive && (
            <button
              onClick={() => setIsLive(true)}
              className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
            >
              بازگشت به ساعت زنده
            </button>
          )}
        </div>

        {/* پ قرص نمایش ساعت با هالهٔ درخشان */}
        <motion.div
          dir="ltr"
          animate={{
            boxShadow: isDay
              ? "0 0 0 1px rgba(251, 191, 36, 0.35), 0 0 24px -4px rgba(251, 191, 36, 0.45)"
              : "0 0 0 1px rgba(56, 189, 248, 0.35), 0 0 24px -4px rgba(56, 189, 248, 0.45)",
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3.5 py-1.5 backdrop-blur-md"
        >
          <Select value={hour} onValueChange={(val) => { setIsLive(false); val && setHour(val); }}>
            <SelectTrigger
              id={hourId}
              size="sm"
              className="w-auto gap-1 rounded-full border-none bg-transparent px-1.5 py-0 shadow-none focus-visible:ring-0 [&_svg]:size-3"
            >
              <SelectValue>
                <Digit value={hour} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-16 max-h-48" align="center">
              {HOURS.map((h) => (
                <SelectItem key={h} value={h} className="justify-center text-center">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <motion.span
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="text-base font-bold text-muted-foreground"
          >
            :
          </motion.span>

          <Select value={minute} onValueChange={(val) => { setIsLive(false); val && setMinute(val); }}>
            <SelectTrigger
              id={minuteId}
              size="sm"
              className="w-auto gap-1 rounded-full border-none bg-transparent px-1.5 py-0 shadow-none focus-visible:ring-0 [&_svg]:size-3"
            >
              <SelectValue>
                <Digit value={minute} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-16 max-h-48" align="center">
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m} className="justify-center text-center">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={period}
            onValueChange={(val) => {
              setIsLive(false);
              val && setPeriod(val as (typeof PERIODS)[number]);
            }}
          >
            <SelectTrigger
              id={periodId}
              size="sm"
              className="w-auto gap-1 rounded-full border-none bg-transparent px-1.5 py-0 shadow-none focus-visible:ring-0 [&_svg]:size-3"
            >
              <SelectValue>
                <span className="relative inline-flex h-5 w-7 items-center justify-center overflow-hidden font-medium">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={period}
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="absolute font-semibold text-xs"
                    >
                      {period}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-16" align="center">
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p} className="justify-center text-center">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* وضعیت و پیام بازهٔ زمانی جاری */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeSlotInfo.greeting}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-xs font-medium text-muted-foreground text-center line-clamp-1"
          >
            {activeSlotInfo.greeting}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ردیف ۴ گزینه‌ای: صبح، ظهر، عصر، شب به همراه چراغ LED نشانگر در زیر هر کدام */}
      <div className="grid grid-cols-4 gap-2">
        {DAYPARTS.map((item) => {
          const isActive = activeDaypart === item.id;
          return (
            <div key={item.id} className="flex flex-col items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset(item)}
                className={cn(
                  "w-full rounded-xl text-xs py-1 transition-all",
                  isActive
                    ? "border-primary/60 bg-primary/20 text-primary font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Button>

              {/* چراغ روشن/خاموش در زیر گزینه */}
              <div
                className={cn(
                  "h-1.5 w-6 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                    : "bg-slate-700/40 opacity-40"
                )}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SelectTimePicker;
