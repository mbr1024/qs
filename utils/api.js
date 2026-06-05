var app = getApp();

function api(path, method, data) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: app.globalData.apiBase + path,
      method: method || 'GET',
      data: data || {},
      header: { 'Content-Type': 'application/json' },
      success: function(res) { resolve(res.data); },
      fail: function(err) { reject(err); }
    });
  });
}

function today() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

function fmtNum(n) { return n == null ? '0' : Number(n).toLocaleString(); }
function fmtPrice(n) { return n == null ? '0.00' : Number(n).toFixed(2); }
// 欧码转中码: 35->225, 42->260
function cnSize(eur) { return (eur + 10) * 5; }

module.exports = { api: api, today: today, fmtNum: fmtNum, fmtPrice: fmtPrice, cnSize: cnSize };
