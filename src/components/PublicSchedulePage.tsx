import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from 'lucide-react';
import ScheduleView from './ScheduleView';
import WeekNavigator from './WeekNavigator';
import { publicAPI, PublicScheduleResponse } from '../api/public.api';
import { getWeekStart, formatDate, parseLocalDate } from '../utils/dateUtils';

const MAX_WEEKS_BACK = 4;

const PublicSchedulePage: React.FC = () => {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [data, setData] = useState<PublicScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  // Max forward navigation limit = latest published schedule week (or current week)
  const [maxWeek, setMaxWeek] = useState<Date>(() => getWeekStart(new Date()));
  const scheduleRef = useRef<HTMLDivElement>(null);

  const earliestAllowedWeekStart = useCallback((): Date => {
    const earliest = new Date(getWeekStart(new Date()));
    earliest.setDate(earliest.getDate() - MAX_WEEKS_BACK * 7);
    return earliest;
  }, []);

  const handleWeekChange = (newWeekStart: Date) => {
    const earliest = earliestAllowedWeekStart();

    if (newWeekStart > maxWeek) return;
    if (newWeekStart < earliest) return;

    setWeekStart(newWeekStart);
  };

  // On mount: fetch latest schedule to know the max forward week
  useEffect(() => {
    const fetchLatestWeek = async () => {
      try {
        const result = await publicAPI.getLatestSchedule();
        if (result.schedule) {
          const latestWeek = parseLocalDate(result.schedule.weekStart);
          const currentWeek = getWeekStart(new Date());
          setMaxWeek(latestWeek > currentWeek ? latestWeek : currentWeek);
        }
      } catch {
        // Ignore - maxWeek stays as current week
      }
    };
    fetchLatestWeek();
  }, []);

  // Fetch schedule for the displayed week
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await publicAPI.getScheduleForWeek(formatDate(weekStart));
        setData(result);
      } catch {
        setError('שגיאה בטעינת הסידור. אנא נסה שוב.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [weekStart]);

  const handleExport = async () => {
    if (!scheduleRef.current) return;
    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');

      // Temporarily expand overflow-hidden/auto containers so nothing is cut off
      const overflowEls = scheduleRef.current.querySelectorAll<HTMLElement>('[class*="overflow"]');
      const origStyles: { el: HTMLElement; overflow: string; maxWidth: string; minWidth: string }[] = [];
      overflowEls.forEach(el => {
        origStyles.push({
          el,
          overflow: el.style.overflow,
          maxWidth: el.style.maxWidth,
          minWidth: el.style.minWidth,
        });
        el.style.overflow = 'visible';
        el.style.maxWidth = 'none';
        el.style.minWidth = 'fit-content';
      });

      const dataUrl = await toPng(scheduleRef.current, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });

      // Restore original styles
      origStyles.forEach(({ el, overflow, maxWidth, minWidth }) => {
        el.style.overflow = overflow;
        el.style.maxWidth = maxWidth;
        el.style.minWidth = minWidth;
      });

      const link = document.createElement('a');
      link.download = `schedule-${formatDate(displayWeekStart)}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('שגיאה בייצוא. אנא נסה שוב.');
    } finally {
      setIsExporting(false);
    }
  };

  const displayWeekStart = weekStart;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Minimal header */}
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">סידור עבודה</h1>
        <button
          onClick={handleExport}
          disabled={isExporting || isLoading || !data?.schedule}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Camera className="w-4 h-4" />
          {isExporting ? 'מייצא...' : 'שמור כתמונה'}
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        <WeekNavigator
          currentWeekStart={displayWeekStart}
          onWeekChange={handleWeekChange}
          showNavigator={true}
        />

        <div ref={scheduleRef}>
          {isLoading && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">טוען סידור...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                נסה שוב
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <ScheduleView
              schedule={data?.schedule ?? null}
              employees={data?.employees ?? []}
              holidays={data?.holidays ?? []}
              weekStart={displayWeekStart}
              readonly={true}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default PublicSchedulePage;
