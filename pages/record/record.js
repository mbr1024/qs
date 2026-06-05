var util = require('../../utils/api.js');
var EUR_SIZES = [35,36,37,38,39,40,41,42,43,44,45,46];

Page({
  data: {
    recordTab: 'in',
    dateStart: '', dateEnd: '', isToday: true,
    groups: [], dateGroups: [],
    showForm: false, formType: '',
    models: [], modelIdx: 0, formRows: [],
    summary: { count: 0, total: 0 }
  },

  onShow: function() {
    var today = util.today();
    this.setData({ dateStart: today, dateEnd: today, isToday: true });
    var that = this;
    this.loadModels(function() {
      that.loadRecords();
      if (wx.getStorageSync('_openAddForm')) {
        wx.removeStorageSync('_openAddForm');
        that.setData({ showForm: true, formType: '' });
      }
    });
  },

  loadModels: function(cb) {
    var that = this;
    util.api('/api/shoe-models-active', 'GET').then(function(list) {
      that.setData({ models: list || [] });
      if (cb) cb();
    });
  },

  // ========== Tab ==========
  switchRecordTab: function(e) {
    this.setData({ recordTab: e.currentTarget.dataset.tab });
    this.loadRecords();
  },

  // ========== 日期筛选 ==========
  setToday: function() {
    var today = util.today();
    this.setData({ dateStart: today, dateEnd: today, isToday: true });
    this.loadRecords();
  },

  setThisMonth: function() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var first = y + '-' + String(m+1).padStart(2,'0') + '-01';
    var today = util.today();
    this.setData({ dateStart: first, dateEnd: today, isToday: false });
    this.loadRecords();
  },

  setLastMonth: function() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    if (m === 0) { y--; m = 11; } else { m--; }
    var first = y + '-' + String(m+1).padStart(2,'0') + '-01';
    var lastDay = new Date(y, m+1, 0).getDate();
    var last = y + '-' + String(m+1).padStart(2,'0') + '-' + String(lastDay).padStart(2,'0');
    this.setData({ dateStart: first, dateEnd: last, isToday: false });
    this.loadRecords();
  },

  onStartDate: function(e) {
    this.setData({ dateStart: e.detail.value, isToday: false });
    this.loadRecords();
  },

  onEndDate: function(e) {
    this.setData({ dateEnd: e.detail.value, isToday: false });
    this.loadRecords();
  },

  // ========== 加载记录 ==========
  loadRecords: function() {
    var that = this;
    var start = this.data.dateStart, end = this.data.dateEnd;
    var tab = this.data.recordTab;
    var isSingle = (start === end);
    var api = tab === 'in' ? '/api/stock-in' : tab === 'prod' ? '/api/production' : '/api/stock-out';
    util.api(api + '?limit=500', 'GET').then(function(list) {
      var filtered = (list || []).filter(function(r) {
        if (r.status !== 'active') return false;
        return r.date >= start && r.date <= end;
      });
      if (isSingle) {
        that.setData({ groups: that._buildGroups(filtered, tab), dateGroups: [] });
      } else {
        // 按日期分组
        var dateMap = {}, dateOrder = [];
        filtered.forEach(function(r) {
          if (!dateMap[r.date]) { dateMap[r.date] = []; dateOrder.push(r.date); }
          dateMap[r.date].push(r);
        });
        dateOrder.sort().reverse();
        var dateGroups = dateOrder.map(function(dt) {
          return { date: dt, groups: that._buildGroups(dateMap[dt], tab) };
        });
        that.setData({ groups: [], dateGroups: dateGroups });
      }
    });
  },

  _buildGroups: function(list, tab) {
    var groupMap = {}, order = [];
    list.forEach(function(r) {
      var m = r.shoe_model;
      if (!groupMap[m]) { groupMap[m] = {}; order.push(m); }
      var sz = r.shoe_size;
      if (tab === 'in') {
        var k = r.type === 'midsole' ? 'md' : 'rb';
        if (!groupMap[m][sz]) groupMap[m][sz] = {md:0, rb:0};
        groupMap[m][sz][k] += (r.quantity || 0);
      } else if (tab === 'prod') {
        if (!groupMap[m][sz]) groupMap[m][sz] = {qty:0, def:0};
        groupMap[m][sz].qty += (r.completed || 0);
        groupMap[m][sz].def += (r.defects || 0);
      } else {
        if (!groupMap[m][sz]) groupMap[m][sz] = {qty:0};
        groupMap[m][sz].qty += (r.quantity || 0);
      }
    });
    return order.map(function(model) {
      var sm = groupMap[model];
      var midsole = [], outsole = [], sizes = [];
      var total = 0, mdTotal = 0, rbTotal = 0, defTotal = 0;
      EUR_SIZES.forEach(function(sz) {
        var d = sm[sz]; if (!d) return;
        var cnSz = util.cnSize(sz);
        if (tab === 'in') {
          if (d.md > 0) { midsole.push({size:cnSz, qty:d.md}); mdTotal += d.md; }
          if (d.rb > 0) { outsole.push({size:cnSz, qty:d.rb}); rbTotal += d.rb; }
          total += d.md + d.rb;
        } else if (tab === 'prod') {
          sizes.push({size:cnSz, qty:d.qty, def:d.def});
          total += d.qty; defTotal += d.def;
        } else {
          sizes.push({size:cnSz, qty:d.qty});
          total += d.qty;
        }
      });
      return { name:model, midsole:midsole, outsole:outsole, sizes:sizes, total:total, mdTotal:mdTotal, rbTotal:rbTotal, defTotal:defTotal };
    });
  },

  // ========== FAB & 表单 ==========
  openForm: function() { this.setData({ showForm: true, formType: '' }); },
  closeForm: function() { this.setData({ showForm: false, formType: '', summary:{count:0,total:0} }); },
  preventBubble: function() {},

  selectType: function(e) {
    var type = e.currentTarget.dataset.type || '';
    if (!type) { this.setData({ formType:'', summary:{count:0,total:0} }); return; }
    this.setData({ formType: type, modelIdx: 0 });
    this._buildFormRows(type, 0);
  },

  onModelChange: function(e) {
    var idx = parseInt(e.detail.value);
    this.setData({ modelIdx: idx });
    this._buildFormRows(this.data.formType, idx);
  },

  _buildFormRows: function(type, idx) {
    var that = this;
    var rows = EUR_SIZES.map(function(s) { return {eurSize:s, cnSize:util.cnSize(s), md:0, rb:0, qty:0, def:0, stock:0}; });
    if (type === 'prod' && idx >= 0 && this.data.models[idx]) {
      var m = this.data.models[idx].name;
      Promise.all([
        util.api('/api/inventory-by-model?model='+encodeURIComponent(m)+'&type=midsole','GET'),
        util.api('/api/inventory-by-model?model='+encodeURIComponent(m)+'&type=outsole','GET')
      ]).then(function(res) { rows.forEach(function(r){r.mid=res[0][r.eurSize]||0;r.out=res[1][r.eurSize]||0;}); that.setData({formRows:rows}); });
    } else if (type === 'out' && idx >= 0 && this.data.models[idx]) {
      var m = this.data.models[idx].name;
      util.api('/api/inventory-by-model?model='+encodeURIComponent(m)+'&type=product','GET').then(function(s) {
        rows.forEach(function(r){r.stock=s[r.eurSize]||0;}); that.setData({formRows:rows});
      });
    } else { this.setData({formRows:rows}); }
  },

  onFormMd: function(e){var i=e.currentTarget.dataset.idx,v=parseInt(e.detail.value)||0,r=this.data.formRows;r[i].md=v;this.setData({formRows:r});this._calc();},
  onFormRb: function(e){var i=e.currentTarget.dataset.idx,v=parseInt(e.detail.value)||0,r=this.data.formRows;r[i].rb=v;this.setData({formRows:r});this._calc();},
  onFormQty: function(e){var i=e.currentTarget.dataset.idx,v=parseInt(e.detail.value)||0,r=this.data.formRows;r[i].qty=v;this.setData({formRows:r});this._calc();},
  onFormDef: function(e){var i=e.currentTarget.dataset.idx,v=parseInt(e.detail.value)||0,r=this.data.formRows;r[i].def=v;this.setData({formRows:r});this._calc();},
  onFormOut: function(e){var i=e.currentTarget.dataset.idx,v=parseInt(e.detail.value)||0,r=this.data.formRows;r[i].outQty=v;this.setData({formRows:r});this._calc();},

  _calc: function() {
    var d=this.data,c=0,t=0;
    if(d.formType==='in') d.formRows.forEach(function(r){if(r.md>0){c++;t+=r.md;}if(r.rb>0){c++;t+=r.rb;}});
    else if(d.formType==='prod') d.formRows.forEach(function(r){if(r.qty>0){c++;t+=r.qty;}});
    else d.formRows.forEach(function(r){if(r.outQty>0){c++;t+=r.outQty;}});
    this.setData({summary:{count:c,total:t}});
  },

  submitForm: function() {
    var d=this.data;
    if(d.modelIdx<0||!d.models[d.modelIdx]){wx.showToast({title:'请选择鞋款',icon:'none'});return;}
    var model=d.models[d.modelIdx].name,date=this.data.dateStart;
    if(d.formType==='in') this._submitIn(model,date);
    else if(d.formType==='prod') this._submitProd(model,date);
    else this._submitOut(model,date);
  },

  _submitIn: function(model,date) {
    var batch=[],md=0,rb=0;
    this.data.formRows.forEach(function(r){
      if(r.md>0){batch.push({type:'midsole',shoe_model:model,shoe_size:r.eurSize,quantity:r.md,date:date});md+=r.md;}
      if(r.rb>0){batch.push({type:'outsole',shoe_model:model,shoe_size:r.eurSize,quantity:r.rb,date:date});rb+=r.rb;}
    });
    if(!batch.length){wx.showToast({title:'至少填一个尺码',icon:'none'});return;}
    var that=this;
    wx.showModal({title:'确认入库',content:'MD '+md+'双，RB '+rb+'双',
      success:function(r){if(!r.confirm)return;
        util.api('/api/stock-in-batch','POST',batch).then(function(){wx.showToast({title:'入库成功',icon:'success'});that.closeForm();that.loadRecords();});
      }});
  },

  _submitProd: function(model,date) {
    var batch=[],q=0,d=0;
    this.data.formRows.forEach(function(r){
      if(r.qty>0){batch.push({shoe_model:model,shoe_size:r.eurSize,date:date,completed:r.qty,midsole_used:r.qty+r.def,outsole_used:r.qty+r.def,defects:r.def});q+=r.qty;d+=r.def;}
    });
    if(!batch.length){wx.showToast({title:'至少填一个尺码',icon:'none'});return;}
    var that=this;var msg='完成 '+q+'双';if(d>0) msg+='，不良 '+d+'双';
    wx.showModal({title:'确认生产',content:msg,
      success:function(r){if(!r.confirm)return;
        util.api('/api/production-batch','POST',batch).then(function(res){
          if(res.error){wx.showModal({title:'库存不足',content:res.error,showCancel:false});return;}
          wx.showToast({title:'生产成功',icon:'success'});that.closeForm();that.loadRecords();
        });
      }});
  },

  _submitOut: function(model,date) {
    var batch=[],t=0;
    this.data.formRows.forEach(function(r){
      if(r.outQty>0){batch.push({shoe_model:model,shoe_size:r.eurSize,quantity:r.outQty,date:date});t+=r.outQty;}
    });
    if(!batch.length){wx.showToast({title:'至少填一个尺码',icon:'none'});return;}
    var that=this;
    wx.showModal({title:'确认出货',content:'出货 '+t+'双',
      success:function(r){if(!r.confirm)return;
        util.api('/api/stock-out-batch','POST',batch).then(function(res){
          if(res.error){wx.showModal({title:'库存不足',content:res.error,showCancel:false});return;}
          wx.showToast({title:'出货成功',icon:'success'});that.closeForm();that.loadRecords();
        });
      }});
  },

  // ========== 撤销 ==========
  voidRecord: function(e) {
    var type=e.currentTarget.dataset.type,id=e.currentTarget.dataset.id;
    var apiType=type==='in'?'stock-in':type==='production'?'production':'stock-out';
    var that=this;
    wx.showModal({title:'确认撤销？',content:'撤销后库存会自动回退',
      success:function(r){if(!r.confirm)return;
        util.api('/api/'+apiType+'/'+id+'/void','POST').then(function(res){
          if(res.error){wx.showToast({title:res.error,icon:'none'});return;}
          wx.showToast({title:'已撤销',icon:'success'});that.loadRecords();
        });
      }});
  }
});
