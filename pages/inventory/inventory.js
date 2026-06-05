var util = require('../../utils/api.js');

Page({
  data: { view: 'raw', list: [], models: [], newModel: '' },
  onShow: function() { this.load(); },
  switchView: function(e) {
    var v = e.currentTarget.dataset.view;
    this.setData({ view: v });
    if (v === 'models') this.loadModels();
    else this.loadInventory();
  },
  load: function() {
    var that = this;
    if (this.data.view === 'models') this.loadModels();
    else this.loadInventory();
  },
  loadInventory: function() {
    var that = this;
    util.api('/api/inventory-detail', 'GET').then(function(data) {
      that.setData({ list: data || [] });
    });
  },
  loadModels: function() {
    var that = this;
    util.api('/api/shoe-models', 'GET').then(function(list) {
      that.setData({ models: list || [] });
    });
  },
  onNewModel: function(e) { this.setData({ newModel: e.detail.value }); },
  addModel: function() {
    var name = this.data.newModel.trim();
    if (!name) { wx.showToast({title: '请输入鞋款名称', icon: 'none'}); return; }
    var that = this;
    util.api('/api/shoe-models', 'POST', { name: name }).then(function(res) {
      if (res.error) { wx.showToast({title: res.error, icon: 'none'}); return; }
      wx.showToast({title: '添加成功', icon: 'success'});
      that.setData({ newModel: '' });
      that.loadModels();
    });
  },
  deleteModel: function(e) {
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    var that = this;
    wx.showModal({
      title: '确认删除？',
      content: '删除鞋款"' + name + '"',
      success: function(res) {
        if (res.confirm) {
          util.api('/api/shoe-models/' + id, 'DELETE').then(function() {
            wx.showToast({title: '已删除', icon: 'success'});
            that.loadModels();
          });
        }
      }
    });
  }
});
