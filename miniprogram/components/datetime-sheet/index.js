// 从周日开始的 7 项；组件唯一的语言相关内容
const DEFAULT_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function normalizeWeekdays(value) {
  return Array.isArray(value) && value.length === 7 ? value : DEFAULT_WEEKDAYS;
}

function normalizeWeekStart(value) {
  const n = Number(value);
  return n >= 0 && n <= 6 ? Math.floor(n) : 1;
}

function buildWeekHeader(weekdays, weekStart) {
  const list = [];
  for (let i = 0; i < 7; i += 1) {
    const day = (weekStart + i) % 7;
    list.push({ day: day, label: weekdays[day], isSunday: day === 0 });
  }
  return list;
}

function pad(n) {
  const s = String(n);
  return s.length < 2 ? '0' + s : s;
}

function formatYmd(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function todayYmd() {
  return formatYmd(new Date());
}

function normalizeYmd(value) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(value || ''));
  if (!m) return '';
  return m[1] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[3]));
}

function clampYmd(ymd, minDate, maxDate) {
  if (minDate && ymd < minDate) return minDate;
  if (maxDate && ymd > maxDate) return maxDate;
  return ymd;
}

function parseYmd(value) {
  if (!value || typeof value !== 'string') return new Date();
  const parts = value.split('-').map(Number);
  if (parts.length < 3 || parts.some(function (n) { return Number.isNaN(n); })) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function parseHm(value) {
  const fallback = { hour: 19, minute: 0 };
  if (!value || typeof value !== 'string') return fallback;
  const parts = value.split(':').map(Number);
  if (parts.length < 2 || parts.some(function (n) { return Number.isNaN(n); })) return fallback;
  return {
    hour: Math.min(23, Math.max(0, parts[0])),
    minute: Math.min(59, Math.max(0, parts[1]))
  };
}

function formatHm(hour, minute) {
  return pad(hour) + ':' + pad(minute);
}

function markPosition(index, total, radius) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    left: 50 + radius * Math.cos(angle),
    top: 50 + radius * Math.sin(angle)
  };
}

function buildHourMarks() {
  const inner = [];
  const outer = [];
  for (let i = 0; i < 12; i += 1) {
    const innerPos = markPosition(i, 12, 28);
    const outerPos = markPosition(i, 12, 42);
    inner.push({
      hour: i,
      label: pad(i),
      left: innerPos.left,
      top: innerPos.top
    });
    outer.push({
      hour: i + 12,
      label: String(i + 12),
      left: outerPos.left,
      top: outerPos.top
    });
  }
  return { inner: inner, outer: outer };
}

function buildMinuteMarks(step) {
  const size = Number(step) > 0 ? Number(step) : 5;
  const marks = [];
  for (let m = 0; m < 60; m += size) {
    const pos = markPosition(m, 60, 42);
    marks.push({
      minute: m,
      label: pad(m),
      left: pos.left,
      top: pos.top
    });
  }
  return marks;
}

function isOutOfRange(ymd, minDate, maxDate) {
  if (minDate && ymd < minDate) return true;
  if (maxDate && ymd > maxDate) return true;
  return false;
}

function buildWeeks(year, month, minDate, maxDate, weekStart) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const cursor = new Date(year, month, 1 - offset);
  const weeks = [];
  for (let w = 0; w < 6; w += 1) {
    const days = [];
    for (let d = 0; d < 7; d += 1) {
      const ymd = formatYmd(cursor);
      days.push({
        ymd: ymd,
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
        isSunday: cursor.getDay() === 0,
        disabled: isOutOfRange(ymd, minDate, maxDate)
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({
      id: 'w' + year + '-' + month + '-' + w,
      days: days
    });
  }
  return weeks;
}

function minuteOptions(step) {
  const size = Number(step) > 0 ? Number(step) : 5;
  const list = [];
  for (let m = 0; m < 60; m += size) list.push(m);
  return list.length ? list : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
}

function snapMinute(minute, step) {
  const options = minuteOptions(step);
  let best = options[0];
  let dist = 99;
  options.forEach(function (m) {
    const d = Math.abs(m - minute);
    if (d < dist) {
      dist = d;
      best = m;
    }
  });
  return best;
}

const HOUR_MARKS = buildHourMarks();

function buildThemeStyle(primary, soft) {
  const parts = [];
  if (primary) parts.push('--dt-primary:' + primary);
  if (soft) parts.push('--dt-primary-soft:' + soft);
  return parts.join(';');
}

Component({
  properties: {
    show: { type: Boolean, value: false },
    mode: { type: String, value: 'datetime' },
    dateValue: { type: String, value: '' },
    timeValue: { type: String, value: '' },
    minDate: { type: String, value: '' },
    maxDate: { type: String, value: '' },
    stepMinutes: { type: Number, value: 5 },
    weekStart: { type: Number, value: 1 },
    weekdays: { type: Array, value: DEFAULT_WEEKDAYS },
    themeColor: { type: String, value: '' },
    themeColorSoft: { type: String, value: '' }
  },

  data: {
    tab: 'date',
    viewYear: 2026,
    viewMonth: 0,
    monthTitle: '',
    weeks: [],
    selectedDate: '',
    selectedHour: 19,
    selectedMinute: 0,
    timeText: '19:00',
    hoursInner: HOUR_MARKS.inner,
    hoursOuter: HOUR_MARKS.outer,
    minuteMarks: buildMinuteMarks(5),
    clockFace: 'hour',
    hourText: '19',
    minuteText: '00',
    handDeg: 210,
    handLen: '42%',
    todayDisabled: false,
    weekHeader: buildWeekHeader(DEFAULT_WEEKDAYS, 1),
    themeStyle: ''
  },

  observers: {
    show: function (show) {
      if (show) this.openSheet();
    },
    'themeColor, themeColorSoft': function (primary, soft) {
      this.setData({ themeStyle: buildThemeStyle(primary, soft) });
    }
  },

  methods: {
    noop: function () {},

    openSheet: function () {
      const mode = this.properties.mode || 'datetime';
      const minDate = this.properties.minDate;
      const maxDate = this.properties.maxDate;
      const today = todayYmd();
      const selectedDate = clampYmd(normalizeYmd(this.properties.dateValue) || today, minDate, maxDate);
      const hm = parseHm(this.properties.timeValue);
      const step = this.properties.stepMinutes || 5;
      const selectedMinute = snapMinute(hm.minute, step);
      const cursor = parseYmd(selectedDate);
      this.setData({
        tab: mode === 'time' ? 'time' : 'date',
        clockFace: 'hour',
        selectedDate: selectedDate,
        selectedHour: hm.hour,
        selectedMinute: selectedMinute,
        minuteMarks: buildMinuteMarks(step),
        todayDisabled: isOutOfRange(today, minDate, maxDate),
        weekHeader: buildWeekHeader(
          normalizeWeekdays(this.properties.weekdays),
          normalizeWeekStart(this.properties.weekStart)
        )
      });
      this.setCalendar(cursor.getFullYear(), cursor.getMonth(), selectedDate);
      this.syncClock(hm.hour, selectedMinute, 'hour');
    },

    setCalendar: function (year, month, selectedDate) {
      const ymd = selectedDate || this.data.selectedDate;
      this.setData({
        viewYear: year,
        viewMonth: month,
        monthTitle: year + '-' + pad(month + 1),
        weeks: buildWeeks(
          year,
          month,
          this.properties.minDate,
          this.properties.maxDate,
          normalizeWeekStart(this.properties.weekStart)
        ),
        selectedDate: ymd
      });
    },

    syncClock: function (hour, minute, face) {
      const clockFace = face || this.data.clockFace || 'hour';
      const handDeg = clockFace === 'minute' ? minute * 6 : (hour % 12) * 30;
      const handLen = clockFace === 'minute' || hour >= 12 ? '42%' : '28%';
      this.setData({
        clockFace: clockFace,
        selectedHour: hour,
        selectedMinute: minute,
        hourText: pad(hour),
        minuteText: pad(minute),
        timeText: formatHm(hour, minute),
        handDeg: handDeg,
        handLen: handLen
      });
    },

    isDisabledDate: function (ymd) {
      return isOutOfRange(ymd, this.properties.minDate, this.properties.maxDate);
    },

    onMask: function () {
      this.close();
    },

    close: function () {
      this.triggerEvent('cancel');
      this.triggerEvent('close');
    },

    switchTab: function (e) {
      const tab = e.currentTarget.dataset.tab;
      if (this.properties.mode === 'date' && tab === 'time') return;
      if (this.properties.mode === 'time' && tab === 'date') return;
      this.setData({ tab: tab });
      if (tab === 'time') {
        this.syncClock(this.data.selectedHour, this.data.selectedMinute, this.data.clockFace || 'hour');
      }
    },

    switchClockFace: function (e) {
      const face = e.currentTarget.dataset.face;
      if (face !== 'hour' && face !== 'minute') return;
      this.syncClock(this.data.selectedHour, this.data.selectedMinute, face);
    },

    prevMonth: function () {
      let viewYear = this.data.viewYear;
      let viewMonth = this.data.viewMonth - 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      this.setCalendar(viewYear, viewMonth, this.data.selectedDate);
    },

    nextMonth: function () {
      let viewYear = this.data.viewYear;
      let viewMonth = this.data.viewMonth + 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      this.setCalendar(viewYear, viewMonth, this.data.selectedDate);
    },

    goToday: function () {
      const ymd = todayYmd();
      if (this.isDisabledDate(ymd)) return;
      const d = parseYmd(ymd);
      this.setCalendar(d.getFullYear(), d.getMonth(), ymd);
    },

    selectDay: function (e) {
      const ymd = e.currentTarget.dataset.ymd;
      if (!ymd || this.isDisabledDate(ymd)) return;
      const d = parseYmd(ymd);
      this.setCalendar(d.getFullYear(), d.getMonth(), ymd);
      if (this.properties.mode === 'datetime') {
        this.setData({ tab: 'time', clockFace: 'hour' });
        this.syncClock(this.data.selectedHour, this.data.selectedMinute, 'hour');
      }
    },

    selectHour: function (e) {
      const hour = Number(e.currentTarget.dataset.hour);
      this.syncClock(hour, this.data.selectedMinute, 'minute');
    },

    selectMinute: function (e) {
      const minute = Number(e.currentTarget.dataset.minute);
      this.syncClock(this.data.selectedHour, minute, 'minute');
    },

    onConfirm: function () {
      const date = this.data.selectedDate || todayYmd();
      const time = formatHm(this.data.selectedHour, this.data.selectedMinute);
      this.triggerEvent('confirm', {
        date: date,
        time: time,
        datetime: date + ' ' + time
      });
      this.triggerEvent('close');
    }
  }
});
