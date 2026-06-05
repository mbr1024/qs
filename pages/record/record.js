var util = require('../../utils/api.js');
var SIZES = [35,36,37,38,39,40,41,42,43,44,45,46];

Page({
  data: {
    tab: 'in', date: '', sizes: SIZES, models: [],
    inType: 0, inSupplier: '', inModelIdx: -1, inQtys: {},
    prodModelIdx: -1, prodRows: [], prodQtys: {}, prodDefs: {},
    outModelIdx: -1, outRows: [], outQtys: {},
    recent: []
  },
  onShow: function() {
    this.setData({
      date: util.today(), inQtys: {}, prodQtys: {}, prodDefs: {}, outQtys: {},
      inModelIdx: -1, prodModelIdx: -1, outModelIdx: -1,
      prodRows: SIZES.map(function(s){return {size:s,mid:0,out:0}}),
      outRows: SIZES.map(function(s){return {size:s,qty:0}})
    });
    this.loadModels();
    this.loadRecent();
  },
  loadModels: function() {
    var that = this;
    util.api('/api/shoe-models', 'GET').then(function(list) { that.setData({ models: list || [] }); });
  },
  switchTab: function(e) { this.setData({ tab: e.currentTarget.dataset.tab }); },
  onDate: function(e) { this.setData({ date: e.detail.value }); },
  onInType: function(e) { this.setData({ inType: parseInt(e.currentTarget.dataset.idx) }); },
  onInSupplier: function(e) { this.setData({ inSupplier: e.detail.value }); },
  onInModel: function(e) { this.setData({ inModelIdx: parseInt(e.detail.value) }); },
  onInQty: function(e) {
    var sz = e.currentTarget.dataset.size, v = parseInt(e.detail.value), q = this.data.inQtys;
    if (v > 0) q[sz] = v; else delete q[sz];
    this.setData({ inQtys: q });
  },
  submitIn: function() {
    var d = this.data;
    if (!d.inSupplier.trim()) { wx.showToast({title:'请输入供应商',icon:'none'}); return; }
    if (d.inModelIdx < 0) { wx.showToast({title:'请选择鞋款',icon:'none'}); return; }
    var model = d.models[d.inModelIdx].name;
    var type = d.inType === 0 ? 'midsole' : 'outsole';
    var batch = [];
    SIZES.forEach(function(sz) {
      if (d.inQtys[sz]) batch.push({type:type,supplier:d.inSupplier.trim(),shoe_model:model,shoe_size:sz,quantity:d.inQtys[sz],date:d.date});
    });
    if (!batch.length) { wx.showToast({title:'至少填一个尺码',icon:'none'}); return; }
    var that = this;
    util.api('/api/stock-in-batch','POST',batch).then(function() {
      wx.showToast({title:'入库成功 '+batch.length+'条',icon:'success'});
      that.setData({inQtys:{}});
      that.loadRecent();
    });
  },
  onProdModel: function(e) {
    this.setData({ prodModelIdx: parseInt(e.detail.value) });
    this.loadProdStock();
  },
  onProdQty: function(e) {
    var sz = e.currentTarget.dataset.size, v = parseInt(e.detail.value), q = this.data.prodQtys;
    if (v > 0) q[sz] = v; else delete q[sz];
    this.setData({ prodQtys: q });
  },
  onProdDef: function(e) {
    var sz = e.currentTarget.dataset.size, v = parseInt(e.detail.value), q = this.data.prodDefs;
    if (v > 0) q[sz] = v; else delete q[sz];
    this.setData({ prodDefs: q });
  },
  loadProdStock: function() {
    var d = this.data;
    if (d.prodModelIdx < 0) return;
    var model = d.models[d.prodModelIdx].name;
    var that = this;
    Promise.all([
      util.api('/api/inventory-by-model?model='+encodeURIComponent(model)+'&type=midsole','GET'),
      util.api('/api/inventory-by-model?model='+encodeURIComponent(model)+'&type=outsole','GET')
    ]).then(function(res) {
      that.setData({ prodRows: SIZES.map(function(s){return {size:s,mid:res[0][s]||0,out:res[1][s]||0}}) });
    });
  },
  submitProd: function() {
    var d = this.data;
    if (d.prodModelIdx < 0) { wx.showToast({title:'请选择鞋款',icon:'none'}); return; }
    var model = d.models[d.prodModelIdx].name;
    var batch = [];
    SIZES.forEach(function(sz) {
      var qty = d.prodQtys[sz];
      if (qty && qty > 0) {
        var def = d.prodDefs[sz] || 0;
        batch.push({shoe_model:model,shoe_size:sz,date:d.date,completed:qty,midsole_used:qty+def,outsole_used:qty+def,defects:def});
      }
    });
    if (!batch.length) { wx.showToast({title:'至少填一个尺码',icon:'none'}); return; }
    var that = this;
    util.api('/api/production-batch','POST',batch).then(function(res) {
      if (res.error) { wx.showModal({title:'库存不足',content:res.error,showCancel:false}); return; }
      wx.showToast({title:'生产成功 '+batch.length+'条',icon:'success'});
      that.setData({prodQtys:{},prodDefs:{}});
      that.loadProdStock(); that.loadRecent();
    });
  },
  onOutModel: function(e) {
    this.setData({ outModelIdx: parseInt(e.detail.value) });
    this.loadOutStock();
  },
  onOutQty: function(e) {
    var sz = e.currentTarget.dataset.size, v = parseInt(e.detail.value), q = this.data.outQtys;
    if (v > 0) q[sz] = v; else delete q[sz];
    this.setData({ outQtys: q });
  },
  loadOutStock: function() {
    var d = this.data;
    if (d.outModelIdx < 0) return;
    var model = d.models[d.outModelIdx].name;
    var that = this;
    util.api('/api/inventory-by-model?model='+encodeURIComponent(model)+'&type=product','GET').then(function(stock) {
      that.setData({ outRows: SIZES.map(function(s){return {size:s,qty:stock[s]||0}}) });
    });
  },
  submitOut: function() {
    var d = this.data;
    if (d.outModelIdx < 0) { wx.showToast({title:'请选择鞋款',icon:'none'}); return; }
    var model = d.models[d.outModelIdx].name;
    var batch = [];
    SIZES.forEach(function(sz) {
      if (d.outQtys[sz]) batch.push({shoe_model:model,shoe_size:sz,quantity:d.outQtys[sz],date:d.date});
    });
    if (!batch.length) { wx.showToast({title:'至少填一个尺码',icon:'none'}); return; }
    var that = this;
    util.api('/api/stock-out-batch','POST',batch).then(function(res) {
      if (res.error) { wx.showModal({title:'库存不足',content:res.error,showCancel:false}); return; }
      wx.showToast({title:'出货成功 '+batch.length+'条',icon:'success'});
      that.setData({outQtys:{}});
      that.loadOutStock(); that.loadRecent();
    });
  },
  voidRecord: function(e) {
    var type = e.currentTarget.dataset.type;
    var id = e.currentTarget.dataset.id;
    var apiType = type === 'in' ? 'stock-in' : type === 'production' ? 'production' : 'stock-out';
    var that = this;
    wx.showModal({
      title: '确认撤销？',
      content: '撤销后库存会自动回退',
      success: function(res) {
        if (res.confirm) {
          util.api('/api/' + apiType + '/' + id + '/void', 'POST').then(function(r) {
            if (r.error) { wx.showToast({title: r.error, icon: 'none'}); return; }
            wx.showToast({title: '已撤销', icon: 'success'});
            that.loadRecent();
          });
        }
      }
    });
  },
  loadRecent: function() {
    var that = this;
    util.api('/api/recent?limit=15','GET').then(function(list) {
      that.setData({ recent: list.map(function(r) {
        if (r._type==='in'){r.typeText=r.type==='midsole'?'中底入库':'大底入库';r.typeClass='t-in';r.displayQty=util.fmtNum(r.quantity)}
        else if(r._type==='production'){r.typeText='生产';r.typeClass='t-mid';r.displayQty=util.fmtNum(r.completed)}
        else{r.typeText='出货';r.typeClass='t-out';r.displayQty=util.fmtNum(r.quantity)}
        return r;
      })});
    });
  }
});
