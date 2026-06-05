var util = require('../../utils/api.js');

Page({
  data: { list: [] },
  onShow: function() { this.loadInventory(); },
  loadInventory: function() {
    var that = this;
    util.api('/api/inventory-detail', 'GET').then(function(data) {
      (data || []).forEach(function(m) {
        m.midsole.forEach(function(s){ s.size = util.cnSize(s.size); });
        m.outsole.forEach(function(s){ s.size = util.cnSize(s.size); });
        m.product.forEach(function(s){ s.size = util.cnSize(s.size); });
        m.midTotal = m.midsole.reduce(function(a,b){return a+b.qty}, 0);
        m.outTotal = m.outsole.reduce(function(a,b){return a+b.qty}, 0);
        m.prodTotal = m.product.reduce(function(a,b){return a+b.qty}, 0);
      });
      that.setData({ list: data || [] });
    });
  }
});
