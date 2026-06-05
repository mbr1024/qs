var util = require('../../utils/api.js');
var SIZES = [35,36,37,38,39,40,41,42,43,44,45,46];

Page({
  data: {
    model: '', date: '', rows: [], qtys: {}, defs: {}, list: []
  },
  onShow: function() {
    this.setData({ date: util.today(), qtys: {}, defs: {}, rows: SIZES.map(function(s){return {size:s,mid:0,out:0}}) });
    this.loadList();
  },
  onModelInput: function(e) { this.setData({ model: e.detail.value }); },
  onDateChange: function(e) { this.setData({ date: e.detail.value }); },
  onQtyInput: function(e) {
    var sz = e.currentTarget.dataset.size;
    var v = parseInt(e.detail.value);
    var q = this.data.qtys;
    if (v && v > 0) q[sz] = v; else delete q[sz];
    this.setData({ qtys: q });
  },
  onDefInput: function(e) {
    var sz = e.currentTarget.dataset.size;
    var v = parseInt(e.detail.value);
    var q = this.data.defs;
    if (v && v > 0) q[sz] = v; else delete q[sz];
    this.setData({ defs: q });
  },
  loadModelStock: function() {
    var model = this.data.model.trim();
    if (!model) return;
    var that = this;
    Promise.all([
      util.api('/api/inventory-by-model?model=' + encodeURIComponent(model) + '&type=midsole', 'GET'),
      util.api('/api/inventory-by-model?model=' + encodeURIComponent(model) + '&type=outsole', 'GET')
    ]).then(function(res) {
      var mid = res[0], out = res[1];
      that.setData({ rows: SIZES.map(function(s){return {size:s, mid:mid[s]||0, out:out[s]||0}}) });
    });
  },
  loadList: function() {
    var that = this;
    util.api('/api/production?limit=20', 'GET').then(function(list) {
      list = list.map(function(r) { r.completedText = util.fmtNum(r.completed); return r; });
      that.setData({ list: list });
    });
  },
  submitBatch: function() {
    var d = this.data;
    if (!d.model.trim()) { wx.showToast({title: '请输入鞋款', icon: 'none'}); return; }
    var batch = [];
    SIZES.forEach(function(sz) {
      var qty = d.qtys[sz];
      if (qty && qty > 0) {
        var defects = d.defs[sz] || 0;
        batch.push({shoe_model: d.model.trim(), shoe_size: sz, date: d.date, completed: qty, midsole_used: qty + defects, outsole_used: qty + defects, defects: defects});
      }
    });
    if (!batch.length) { wx.showToast({title: '至少填一个尺码', icon: 'none'}); return; }
    var that = this;
    util.api('/api/production-batch', 'POST', batch).then(function() {
      wx.showToast({title: '记录成功 ' + batch.length + '条', icon: 'success'});
      that.setData({ qtys: {}, defs: {} });
      that.loadList(); that.loadModelStock();
    });
  },
  onDelete: function(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({title: '确认删除？', success: function(res) {
      if (res.confirm) { util.api('/api/production/' + id, 'DELETE').then(function() { that.loadList(); }); }
    }});
  }
});
