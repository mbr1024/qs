var util = require('../../utils/api.js');
var SIZES = [35,36,37,38,39,40,41,42,43,44,45,46];

Page({
  data: {
    types: [{label: '中底', value: 'midsole'}, {label: '大底', value: 'outsole'}],
    typeIdx: 0, supplier: '', model: '', date: '',
    sizes: SIZES, sizeQtys: {}, list: []
  },
  onShow: function() {
    this.setData({ date: util.today(), sizeQtys: {} });
    this.loadList();
  },
  onTypeTap: function(e) { this.setData({ typeIdx: parseInt(e.currentTarget.dataset.idx) }); },
  onSupplierInput: function(e) { this.setData({ supplier: e.detail.value }); },
  onModelInput: function(e) { this.setData({ model: e.detail.value }); },
  onDateChange: function(e) { this.setData({ date: e.detail.value }); },
  onSizeQtyInput: function(e) {
    var sz = e.currentTarget.dataset.size;
    var qty = parseInt(e.detail.value);
    var qtys = this.data.sizeQtys;
    if (qty && qty > 0) qtys[sz] = qty; else delete qtys[sz];
    this.setData({ sizeQtys: qtys });
  },
  loadList: function() {
    var that = this;
    util.api('/api/stock-in?limit=20', 'GET').then(function(list) {
      list = list.map(function(r) { r.qtyText = util.fmtNum(r.quantity); return r; });
      that.setData({ list: list });
    });
  },
  submitBatch: function() {
    var d = this.data;
    if (!d.supplier.trim()) { wx.showToast({title: '请输入供应商', icon: 'none'}); return; }
    if (!d.model.trim()) { wx.showToast({title: '请输入鞋款', icon: 'none'}); return; }
    var batch = [];
    SIZES.forEach(function(sz) {
      if (d.sizeQtys[sz]) {
        batch.push({type: d.types[d.typeIdx].value, supplier: d.supplier.trim(), shoe_model: d.model.trim(), shoe_size: sz, quantity: d.sizeQtys[sz], date: d.date});
      }
    });
    if (!batch.length) { wx.showToast({title: '至少填一个尺码', icon: 'none'}); return; }
    var that = this;
    util.api('/api/stock-in-batch', 'POST', batch).then(function() {
      wx.showToast({title: '录入成功 ' + batch.length + '条', icon: 'success'});
      that.setData({ sizeQtys: {} });
      that.loadList();
    });
  },
  onDelete: function(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({title: '确认删除？', success: function(res) {
      if (res.confirm) { util.api('/api/stock-in/' + id, 'DELETE').then(function() { that.loadList(); }); }
    }});
  }
});
