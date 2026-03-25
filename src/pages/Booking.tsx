import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import BottomNav from '@/components/BottomNav';

interface Booking {
  id: string;
  date: Date;
  service: string;
  time: string;
}

const Booking = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [bookings, setBookings] = useState<Booking[]>([]);

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

  const handleAddBooking = (date?: Date) => {
    const bookingDate = date || selectedDate;
    if (bookingDate) {
      const newBooking: Booking = {
        id: Date.now().toString(),
        date: bookingDate,
        service: 'Home Care Visit',
        time: '9:00 AM',
      };
      setBookings([...bookings, newBooking]);
      setSelectedDate(bookingDate);
    }
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => isSameDay(booking.date, date));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-center">
          <Logo size="sm" variant="light" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-primary mb-6">
          Book a Home Care Appointment
        </h1>

        <div className="border-t border-border pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar Section */}
            <div className="lg:col-span-2">
              {/* View Toggle */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={viewMode === 'week' ? 'outline' : 'default'}
                  onClick={() => setViewMode('week')}
                  className={cn(
                    "px-6",
                    viewMode === 'week' 
                      ? "bg-background border-primary text-primary" 
                      : "bg-[hsl(231,41%,48%)] text-white"
                  )}
                >
                  Week View
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  onClick={() => setViewMode('month')}
                  className={cn(
                    "px-6",
                    viewMode === 'month' 
                      ? "bg-[hsl(231,41%,48%)] text-white" 
                      : "bg-background border-primary text-primary"
                  )}
                >
                  Month View
                </Button>
              </div>

              {/* Calendar Navigation */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex border rounded-md">
                  <button
                    onClick={goToPrevYear}
                    className="p-2 hover:bg-muted border-r"
                    aria-label="Previous year"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={viewMode === 'month' ? goToPrevMonth : goToPrevWeek}
                    className="p-2 hover:bg-muted border-r"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-medium min-w-[120px] text-center">
                    {format(currentDate, 'MMMM yyyy')}
                  </span>
                  <button
                    onClick={viewMode === 'month' ? goToNextMonth : goToNextWeek}
                    className="p-2 hover:bg-muted border-l"
                    aria-label="Next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToNextYear}
                    className="p-2 hover:bg-muted border-l"
                    aria-label="Next year"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-lg font-semibold ml-4">
                  {format(currentDate, 'MMMM yyyy')}
                </span>
              </div>

              {/* Calendar Grid */}
              <div className="border rounded-lg overflow-hidden">
                {/* Week day headers */}
                <div className="grid grid-cols-7 bg-muted">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="p-3 text-center font-medium text-sm border-b"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className={cn(
                  "grid grid-cols-7",
                  viewMode === 'week' ? "" : ""
                )}>
                  {days.map((day, index) => {
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, today);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const dayBookings = getBookingsForDate(day);

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "min-h-[80px] p-2 text-left border-b border-r transition-colors",
                          viewMode === 'week' ? "min-h-[120px]" : "",
                          !isCurrentMonth && viewMode === 'month' && "text-muted-foreground bg-muted/30",
                          isToday && "bg-yellow-50",
                          isSelected && "ring-2 ring-primary ring-inset",
                          "hover:bg-muted/50"
                        )}
                      >
                        <span className={cn(
                          "text-sm font-medium",
                          isToday && "text-primary font-bold"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayBookings.length > 0 && (
                          <div className="mt-1">
                            {dayBookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="text-xs bg-primary/10 text-primary p-1 rounded mb-1 truncate"
                              >
                                {booking.service}
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bookings Sidebar */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold mb-4">Bookings</h2>
              <p className="text-muted-foreground mb-4">
                Please click a date to add a booking.
              </p>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="bg-primary hover:bg-primary/90 mb-6"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Add a Booking
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate ?? undefined}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        handleAddBooking(date);
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Selected date info */}
              {selectedDate && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </h3>
                  {getBookingsForDate(selectedDate).length > 0 ? (
                    <div className="space-y-2">
                      {getBookingsForDate(selectedDate).map((booking) => (
                        <div
                          key={booking.id}
                          className="p-3 bg-muted rounded-lg"
                        >
                          <p className="font-medium">{booking.service}</p>
                          <p className="text-sm text-muted-foreground">{booking.time}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No bookings for this date.
                    </p>
                  )}
                </div>
              )}

              {/* All upcoming bookings */}
              {bookings.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-2">Upcoming Bookings</h3>
                  <div className="space-y-2">
                    {bookings
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .map((booking) => (
                        <div
                          key={booking.id}
                          className="p-3 bg-muted rounded-lg"
                        >
                          <p className="font-medium">{booking.service}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(booking.date, 'MMM d, yyyy')} at {booking.time}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Booking;
