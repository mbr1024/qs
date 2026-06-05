var util = require('../../utils/api.js');

Page({
  data: {
    d: { today_in:0, today_in_mid:0, today_in_out:0, stock_mid:0, stock_out:0,
         today_production:0, stock_product:0, today_shipment:0, today_defects:0,
         inDetail:[], outDetail:[], prodDetail:[], prodStock:[] }
  },
  onShow: function() { this.load(); },
  load: function() {
    var that = this;
    Promise.all([
      util.api('/api/dashboard?date=' + util.today(), 'GET'),
      util.api('/api/inventory-summary', 'GET')
    ]).then(function(res) {
      var s = res[0];
      var stock = res[1] || [];
      var prodStock = stock.map(function(m) {
        return { name: m.name, qty: m.prod };
      }).filter(function(m) { return m.qty > 0; });
      prodStock.sort(function(a, b) { return b.qty - a.qty; });

      that.setData({
        d: {
          today_in: util.fmtNum(s.today_in),
          today_in_mid: util.fmtNum(s.today_in_mid),
          today_in_out: util.fmtNum(s.today_in_out),
          stock_mid: util.fmtNum(s.stock_mid),
          stock_out: util.fmtNum(s.stock_out),
          today_production: util.fmtNum(s.today_production),
          stock_product: util.fmtNum(s.stock_product),
          today_shipment: util.fmtNum(s.today_shipment),
          today_defects: s.today_defects || 0,
          inDetail: s.inDetail || [],
          outDetail: s.outDetail || [],
          prodDetail: s.prodDetail || [],
          prodStock: prodStock
        }
      });
    });
  }
});
