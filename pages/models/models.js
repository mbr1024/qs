var util = require('../../utils/api.js');

Page({
  data: {
    models: [],
    showAddForm: false,
    newName: '',
    editingId: -1,
    editName: '',
    hasDisabled: false
  },
  onShow: function() {
    this.loadModels();
  },
  loadModels: function() {
    var that = this;
    util.api('/api/shoe-models', 'GET').then(function(list) {
      var hasDisabled = list.some(function(m) { return m.disabled; });
      that.setData({ models: list || [], hasDisabled: hasDisabled });
    });
  },
  showAdd: function() {
    this.setData({ showAddForm: true, newName: '' });
  },
  hideAdd: function() {
    this.setData({ showAddForm: false, newName: '' });
  },
  onNewName: function(e) {
    this.setData({ newName: e.detail.value });
  },
  addModel: function() {
    var name = this.data.newName.trim();
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }
    var that = this;
    util.api('/api/shoe-models', 'POST', { name: name }).then(function(r) {
      if (r.error) {
        wx.showToast({ title: r.error, icon: 'none' });
        return;
      }
      wx.showToast({ title: '添加成功', icon: 'success' });
      that.setData({ showAddForm: false, newName: '' });
      that.loadModels();
    });
  },
  startEdit: function(e) {
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    this.setData({ editingId: id, editName: name });
  },
  onEditName: function(e) {
    this.setData({ editName: e.detail.value });
  },
  saveEdit: function() {
    var id = this.data.editingId;
    var name = this.data.editName.trim();
    if (!name) {
      this.setData({ editingId: -1 });
      return;
    }
    var that = this;
    util.api('/api/shoe-models/' + id, 'PUT', { name: name }).then(function(r) {
      if (r.error) {
        wx.showToast({ title: r.error, icon: 'none' });
      } else {
        wx.showToast({ title: '修改成功', icon: 'success' });
      }
      that.setData({ editingId: -1 });
      that.loadModels();
    });
  },
  disableModel: function(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({
      title: '确认禁用？',
      content: '禁用后该鞋款不会在入库/生产/出货中显示，已有数据不受影响',
      success: function(res) {
        if (res.confirm) {
          util.api('/api/shoe-models/' + id + '/disable', 'PUT').then(function(r) {
            if (r.error) {
              wx.showToast({ title: r.error, icon: 'none' });
            } else {
              wx.showToast({ title: '已禁用', icon: 'success' });
            }
            that.loadModels();
          });
        }
      }
    });
  },
  enableModel: function(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    util.api('/api/shoe-models/' + id + '/enable', 'PUT').then(function(r) {
      if (r.error) {
        wx.showToast({ title: r.error, icon: 'none' });
      } else {
        wx.showToast({ title: '已启用', icon: 'success' });
      }
      that.loadModels();
    });
  }
});
