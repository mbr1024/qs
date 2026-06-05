var util = require('../../utils/api.js');

Page({
  data: {
    dashboard: { today_in: 0, stock_raw: 0, today_produce: 0, stock_product: 0, today_out: 0 },
    models: [],
    recent: []
  },
  onShow: function() { this.load(); },
  load: function() {
    var that = this;
    var d = util.today();
    Promise.all([
      util.api('/api/dashboard?date=' + d, 'GET'),
      util.api('/api/inventory-detail', 'GET'),
      util.api('/api/recent?limit=8', 'GET')
    ]).then(function(res) {
      var s = res[0];
      var models = (res[1] || []).map(function(m) {
        m.midTotal = m.midsole.reduce(function(a,b){return a+b.qty}, 0);
        m.outTotal = m.outsole.reduce(function(a,b){return a+b.qty}, 0);
        m.prodTotal = m.product.reduce(function(a,b){return a+b.qty}, 0);
        return m;
      });
      that.setData({
        dashboard: {
          today_in: util.fmtNum(s.today_in),
          stock_raw: util.fmtNum(s.stock_mid + s.stock_out),
          today_produce: util.fmtNum(s.today_production),
          stock_product: util.fmtNum(s.stock_product),
          today_out: util.fmtNum(s.today_shipment)
        },
        models: models,
        recent: (res[2] || []).map(function(r) {
          if (r._type === 'in') { r.typeText = r.type === 'midsole' ? '中底入库' : '大底入库'; r.typeClass = 't-in'; r.displayQty = util.fmtNum(r.quantity); }
          else if (r._type === 'production') { r.typeText = '生产'; r.typeClass = 't-mid'; r.displayQty = util.fmtNum(r.completed); }
          else { r.typeText = '出货'; r.typeClass = 't-out'; r.displayQty = util.fmtNum(r.quantity); }
          return r;
        })
      });
    });
  }
});
