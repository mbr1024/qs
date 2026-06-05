var util = require('../../utils/api.js');
var SIZES = [35,36,37,38,39,40,41,42,43,44,45,46];

Page({
  data: {
    model: '', date: '', rows: [], qtys: {}, list: []
  },
  onShow: function() {
    this.setData({ date: util.today(), qtys: {}, rows: SIZES.map(function(s){return {size:s,qty:0}}) });
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
  loadModelStock: function() {
    var model = this.data.model.trim();
    if (!model) return;
    var that = this;
    util.api('/api/inventory-by-model?model=' + encodeURIComponent(model) + '&type=product', 'GET').then(function(stock) {
      that.setData({ rows: SIZES.map(function(s){return {size:s, qty:stock[s]||0}}) });
    });
  },
  loadList: function() {
    var that = this;
    util.api('/api/stock-out?limit=20', 'GET').then(function(list) {
      list = list.map(function(r) { r.qtyText = util.fmtNum(r.quantity); return r; });
      that.setData({ list: list });
    });
  },
  submitBatch: function() {
    var d = this.data;
    if (!d.model.trim()) { wx.showToast({title: '请输入鞋款', icon: 'none'}); return; }
    var batch = [];
    SIZES.forEach(function(sz) {
      if (d.qtys[sz]) {
        batch.push({shoe_model: d.model.trim(), shoe_size: sz, quantity: d.qtys[sz], date: d.date});
      }
    });
    if (!batch.length) { wx.showToast({title: '至少填一个尺码', icon: 'none'}); return; }
    var that = this;
    util.api('/api/stock-out-batch', 'POST', batch).then(function() {
      wx.showToast({title: '出货成功 ' + batch.length + '条', icon: 'success'});
      that.setData({ qtys: {} });
      that.loadList(); that.loadModelStock();
    });
  },
  onDelete: function(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({title: '确认删除？', success: function(res) {
      if (res.confirm) { util.api('/api/stock-out/' + id, 'DELETE').then(function() { that.loadList(); }); }
    }});
  }
});
