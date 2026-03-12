import React, { useState, useEffect } from "react";
import { ChevronLeft, X, Calendar as CalendarIcon } from "lucide-react";
import { format, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from "@/lib/utils";

interface ClickUpDatePickerProps {
  dueDate?: Date;
  onDueDateChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  hideSidebar?: boolean;
  hideStartDate?: boolean;
  dueDatePlaceholder?: string;
}

const ClickUpDatePicker = ({
  dueDate,
  onDueDateChange,
  disabled,
  hideSidebar,
  hideStartDate,
  dueDatePlaceholder,
}: ClickUpDatePickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(dueDate || new Date());
  const [dueDateState, setDueDate] = useState<Date | undefined>(dueDate);

  useEffect(() => {
    setDueDate(dueDate);
    if (dueDate) setCurrentMonth(dueDate);
  }, [dueDate]);

  const months = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];
  const weekDays = ["do","2ª","3ª","4ª","5ª","6ª","sá"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const days = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }
    return days;
  };

  const isToday = (d: Date) => isSameDay(d, new Date());
  const isSelected = (d: Date) => dueDateState ? isSameDay(d, dueDateState) : false;

  const navigateMonth = (dir: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1));
  };

  const handleSelect = (d: Date) => {
    setDueDate(d);
    if (onDueDateChange) onDueDateChange(d);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDueDate(undefined);
    if (onDueDateChange) onDueDateChange(undefined);
  };

  const quickOptions = [
    { key: "today", label: "Hoje" },
    { key: "tomorrow", label: "Amanhã" },
    { key: "weekend", label: "Este fim de semana" },
    { key: "nextWeek", label: "Semana que vem" },
    { key: "2weeks", label: "2 semanas" },
    { key: "4weeks", label: "4 semanas" },
  ];

  const selectQuick = (key: string) => {
    const today = new Date();
    let d = new Date();
    if (key === "today") d = today;
    else if (key === "tomorrow") d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    else if (key === "weekend") {
      const diff = today.getDay() === 0 ? 6 : 6 - today.getDay();
      d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    } else if (key === "nextWeek") {
      const diff = (8 - today.getDay()) % 7 || 7;
      d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    } else if (key === "2weeks") d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
    else if (key === "4weeks") d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 28);
    handleSelect(d);
    setCurrentMonth(d);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className={cn("flex flex-col items-center", disabled && "opacity-60 pointer-events-none")}>
      <div className={cn(
        "bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 flex flex-col",
        hideSidebar ? "w-[300px]" : "w-[540px]"
      )}>
        {/* Header */}
        <div className="flex w-full border-b border-gray-200 p-2 gap-2 bg-[#F9FAFB]">
          <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-md border bg-white border-[#A4D233] shadow-sm ring-1 ring-[#A4D233]/20 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#7CB800]" />
              <span className={dueDateState ? "text-gray-900 font-medium" : "text-gray-400"}>
                {dueDateState ? format(dueDateState, "P", { locale: ptBR }) : dueDatePlaceholder || "Selecionar data"}
              </span>
            </div>
            {dueDateState && (
              <div onClick={clearDate} className="hover:bg-gray-200 rounded-full p-0.5 cursor-pointer text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>

        <div className="flex">
          {/* Quick options sidebar */}
          {!hideSidebar && (
            <div className="w-52 bg-white border-r border-gray-200 flex flex-col py-2">
              {quickOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => selectQuick(opt.key)}
                  className="w-full px-4 py-2 flex items-center text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Calendar */}
          <div className="flex-1 p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-900 font-medium text-sm capitalize">
                {months[currentMonth.getMonth()]}
                <span className="text-gray-400 font-normal ml-1">{currentMonth.getFullYear()}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                >
                  Hoje
                </button>
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                >
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-xs text-gray-400 py-1.5 font-medium uppercase tracking-wide">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0">
              {days.map((dayObj, i) => {
                const selected = isSelected(dayObj.date);
                const today = isToday(dayObj.date);
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(dayObj.date)}
                    className="w-full h-8 flex items-center justify-center text-sm"
                  >
                    <div className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
                      selected && "bg-[#A4D233] text-white font-medium shadow-md shadow-[#E8F5D0]",
                      !selected && today && "bg-gray-100 text-[#7CB800] font-medium",
                      !selected && !today && dayObj.currentMonth && "text-gray-700 hover:bg-gray-100",
                      !selected && !today && !dayObj.currentMonth && "text-gray-300"
                    )}>
                      {dayObj.day}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClickUpDatePicker;
