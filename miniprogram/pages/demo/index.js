function pad(n) {
  const s = String(n);
  return s.length < 2 ? '0' + s : s;
}

function todayYmd() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

Page({
  data: {
    dtShow: false,
    dtMode: 'datetime',
    date: '',
    time: '19:00',
    datetimeText: '',
    minDate: todayYmd(),
    themes: ['#6B37E5', '#1677FF', '#07C160', '#FA5151', '#FF8F1F'],
    themeColor: '#6B37E5'
  },

  pickTheme(e) {
    this.setData({ themeColor: e.currentTarget.dataset.color });
  },

  openDateTime() {
    this.setData({ dtShow: true, dtMode: 'datetime' });
  },

  openDate() {
    this.setData({ dtShow: true, dtMode: 'date' });
  },

  openTime() {
    this.setData({ dtShow: true, dtMode: 'time' });
  },

  onDtConfirm(e) {
    const detail = (e && e.detail) || {};
    const date = detail.date || this.data.date;
    const time = detail.time || this.data.time;
    this.setData({
      date,
      time,
      datetimeText: detail.datetime || (date + ' ' + time),
      dtShow: false
    });
  },

  onDtClose() {
    this.setData({ dtShow: false });
  }
});
