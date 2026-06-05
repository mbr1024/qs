var util = require('../../utils/api.js');

Page({
  data: {
    tab: 'in',
    startDate: '',
    endDate: '',
    records: [], dateGroups: [], dateRange: 'today'
  },
  onLoad: function(options) {
    var tab = options.tab || 'in';
    var today = util.today();
    this.setData({ tab: tab, startDate: today, endDate: today });
    this.loadRecords();
  },
  switchTab: function(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
    this.loadRecords();
  },
  onStartDate: function(e) {
    this.setData({ startDate: e.detail.value, dateRange: '' });
    this.loadRecords();
  },
  onEndDate: function(e) {
    this.setData({ endDate: e.detail.value, dateRange: '' });
    this.loadRecords();
  },
  resetDate: function() {
    var today = util.today();
    this.setData({ startDate: today, endDate: today, dateRange: 'today' });
    this.loadRecords();
  },
  setToday: function() {
    var today = util.today();
    this.setData({ startDate: today, endDate: today, dateRange: 'today' });
    this.loadRecords();
  },
  setThisMonth: function() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var start = this._fmt(y, m, 1);
    var end = util.today();
    this.setData({ startDate: start, endDate: end, dateRange: 'month' });
    this.loadRecords();
  },
  setLastMonth: function() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    if (m === 0) { y--; m = 11; } else { m--; }
    var start = this._fmt(y, m, 1);
    var lastDay = new Date(y, m + 1, 0).getDate();
    var end = this._fmt(y, m, lastDay);
    this.setData({ startDate: start, endDate: end, dateRange: 'lastMonth' });
    this.loadRecords();
  },
  setThisYear: function() {
    var y = new Date().getFullYear();
    var start = y + '-01-01';
    var end = util.today();
    this.setData({ startDate: start, endDate: end, dateRange: 'year' });
    this.loadRecords();
  },
  _fmt: function(y, m, d) {
    return y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
  },
  loadRecords: function() {
    var that = this;
    var tab = this.data.tab;
    var api = tab === 'in' ? '/api/stock-in' : tab === 'prod' ? '/api/production' : '/api/stock-out';
    
    util.api(api + '?limit=500', 'GET').then(function(list) {
      var startDate = that.data.startDate;
      var endDate = that.data.endDate;
      
      // 日期筛选
      var filtered = (list || []).filter(function(r) {
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        return true;
      });
      
      // 按日期+鞋款分组聚合
      var dateGroups = {};
      var dateOrder = [];
      filtered.forEach(function(r) {
        var date = r.date;
        var model = r.shoe_model;
        var sz = r.shoe_size;
        
        if (!dateGroups[date]) { dateGroups[date] = {}; dateOrder.push(date); }
        if (!dateGroups[date][model]) dateGroups[date][model] = {};
        
        if (tab === 'in') {
          var key = r.type === 'midsole' ? 'mid' : 'out';
          if (!dateGroups[date][model][sz]) dateGroups[date][model][sz] = {mid:0, out:0};
          dateGroups[date][model][sz][key] += (r.quantity || 0);
        } else if (tab === 'prod') {
          if (!dateGroups[date][model][sz]) dateGroups[date][model][sz] = {qty:0, def:0};
          dateGroups[date][model][sz].qty += (r.completed || 0);
          dateGroups[date][model][sz].def += (r.defects || 0);
        } else {
          if (!dateGroups[date][model][sz]) dateGroups[date][model][sz] = {qty:0};
          dateGroups[date][model][sz].qty += (r.quantity || 0);
        }
      });
      
      dateOrder.sort().reverse();
      var cn = function(e){ return (e+10)*5; };
      
      var groups = dateOrder.map(function(date) {
        var modelMap = dateGroups[date];
        var models = [];
        var dayTotal = 0;
        Object.keys(modelMap).forEach(function(model) {
          var sizeMap = modelMap[model];
          var sizes = [];
          var midsole = [];
          var outsole = [];
          var modelTotal = 0;
          Object.keys(sizeMap).forEach(function(sz) {
            var d = sizeMap[sz];
            var eurSz = parseInt(sz);
            var cnSz = cn(eurSz);
            if (tab === 'in') {
              if (d.mid > 0) midsole.push({size: cnSz, qty: d.mid});
              if (d.out > 0) outsole.push({size: cnSz, qty: d.out});
              modelTotal += d.mid + d.out;
            } else if (tab === 'prod') {
              sizes.push({size: cnSz, qty: d.qty, def: d.def});
              modelTotal += d.qty;
            } else {
              sizes.push({size: cnSz, qty: d.qty});
              modelTotal += d.qty;
            }
          });
          sizes.sort(function(a,b){return a.size - b.size;});
          midsole.sort(function(a,b){return a.size - b.size;});
          outsole.sort(function(a,b){return a.size - b.size;});
          var midTotal = midsole.reduce(function(a,b){return a+b.qty}, 0);
          var outTotal = outsole.reduce(function(a,b){return a+b.qty}, 0);
          models.push({name: model, sizes: sizes, midsole: midsole, outsole: outsole, midTotal: midTotal, outTotal: outTotal, total: modelTotal});
          dayTotal += modelTotal;
        });
        return {date: date, models: models, dayTotal: dayTotal};
      });
      
      that.setData({ dateGroups: groups });
    });
  },
  voidRecord: function(e) {
    var id = e.currentTarget.dataset.id;
    var tab = this.data.tab;
    var apiType = tab === 'in' ? 'stock-in' : tab === 'prod' ? 'production' : 'stock-out';
    var that = this;
    wx.showModal({
      title: '确认撤销？',
      content: '撤销后库存会自动回退',
      success: function(res) {
        if (res.confirm) {
          util.api('/api/' + apiType + '/' + id + '/void', 'POST').then(function(r) {
            if (r.error) { wx.showToast({title: r.error, icon: 'none'}); return; }
            wx.showToast({title: '已撤销', icon: 'success'});
            that.loadRecords();
          });
        }
      }
    });
  }
});
