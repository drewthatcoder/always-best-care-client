import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BookingCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onAddBooking?: () => void;
  className?: string;
}

const BookingCalendar = ({ selectedDate, onSelectDate, onAddBooking, className }: BookingCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');

  const today = new Date();

  // Navigation handlers
  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToPrevYear = () => setCurrentDate(subMonths(currentDate, 12));
  const goToNextYear = () => setCurrentDate(addMonths(currentDate, 12));
  const goToPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  // Generate calendar days for month view
  const generateMonthDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  // Generate calendar days for week view
  const generateWeekDays = () => {
    const weekStart = startOfWeek(currentDate);
    const days: Date[] = [];

    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }

    return days;
  };

  const days = viewMode === 'month' ? generateMonthDays() : generateWeekDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-xl font-semibold text-primary">Book a Home Care Appointment</h3>
      <p className="text-base text-foreground">Please click a date to add a booking.</p>
      <div className="border-t border-border pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            {/* View Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={viewMode === 'week' ? 'outline' : 'default'}
                onClick={() => setViewMode('week')}
                size="sm"
                className={cn(
                  viewMode === 'week' ?
                  "bg-background border-primary text-primary" :
                  "bg-[hsl(231,41%,48%)] text-white"
                )}>
                
                Week View
              </Button>
              <Button
                type="button"
                variant={viewMode === 'month' ? 'default' : 'outline'}
                onClick={() => setViewMode('month')}
                size="sm"
                className={cn(
                  viewMode === 'month' ?
                  "bg-[hsl(231,41%,48%)] text-white" :
                  "bg-background border-primary text-primary"
                )}>
                
                Month View
              </Button>
            </div>

            {/* Calendar Navigation */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex border rounded-md">
                <button
                  type="button"
                  onClick={goToPrevYear}
                  className="p-1.5 hover:bg-muted border-r"
                  aria-label="Previous year">
                  
                  <ChevronsLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={viewMode === 'month' ? goToPrevMonth : goToPrevWeek}
                  className="p-1.5 hover:bg-muted border-r"
                  aria-label="Previous">
                  
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="px-2 py-1 text-sm font-medium min-w-[100px] text-center">
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                <button
                  type="button"
                  onClick={viewMode === 'month' ? goToNextMonth : goToNextWeek}
                  className="p-1.5 hover:bg-muted border-l"
                  aria-label="Next">
                  
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={goToNextYear}
                  className="p-1.5 hover:bg-muted border-l"
                  aria-label="Next year">
                  
                  <ChevronsRight className="w-3 h-3" />
                </button>
              </div>
              <span className="text-sm font-semibold ml-2">
                {format(currentDate, 'MMMM yyyy')}
              </span>
            </div>

            {/* Calendar Grid */}
            <div className="border rounded-lg overflow-hidden">
              {/* Week day headers */}
              <div className="grid grid-cols-7 bg-muted">
                {weekDays.map((day) =>
                <div
                  key={day}
                  className="p-2 text-center font-medium text-xs border-b">
                  
                    {day}
                  </div>
                )}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, today);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      type="button"
                      key={index}
                      onClick={() => onSelectDate(day)}
                      className={cn(
                        "min-h-[50px] p-1 text-left border-b border-r transition-colors text-xs",
                        viewMode === 'week' ? "min-h-[70px]" : "",
                        !isCurrentMonth && viewMode === 'month' && "text-muted-foreground bg-muted/30",
                        isToday && "bg-yellow-50",
                        isSelected && "ring-2 ring-primary ring-inset bg-primary/5",
                        "hover:bg-muted/50"
                      )}>
                      
                      <span className={cn(
                        "text-xs font-medium",
                        isToday && "text-primary font-bold"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </button>);

                })}
              </div>
            </div>
          </div>

          {/* Bookings Sidebar */}
          





















          
        </div>
      </div>
    </div>);

};

export default BookingCalendar;
