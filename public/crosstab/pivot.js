/*!
 * Based on PivotTable.js:
 * https://github.com/nicolaskruchten/pivottable/tree/189cd44fc6938561e2638c932657e0a4e61f7ce2
 * © 2012-2013 Nicolas Kruchten, Datacratic
 * MIT License
 */

// Generated by CoffeeScript 1.6.3 and Gabe

/*jshint eqnull:true, quotmark:false */
'use strict';

var $ = require('jquery');
var jQuery = $;

var PivotData, addSeparators, aggregatorTemplates, aggregators, convertToArray, dayNames, deriveAttributes, derivers,
  forEachRecord, getPivotData, mthNames, naturalSort, numberFormat, pivotTableRenderer, renderers, spanSize, zeroPad,
  __slice = [].slice,
  __indexOf = [].indexOf || function (item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (i in this && this[i] === item) {
        return i;
      }
    }
    return -1;
  },
  __hasProp = {}.hasOwnProperty,
  __bind = function (fn, me) {
    return function () {
      return fn.apply(me, arguments);
    };
  };

/*
 Utilities
 */

addSeparators = function (nStr, thousandsSep, decimalSep) {
  var rgx, x, x1, x2;
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? decimalSep + x[1] : '';
  rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + thousandsSep + '$2');
  }
  return x1 + x2;
};

numberFormat = function (sigfig, scaler, thousandsSep, decimalSep) {
  if (sigfig == null) {
    sigfig = 3;
  }
  if (scaler == null) {
    scaler = 1;
  }
  if (thousandsSep == null) {
    thousandsSep = ",";
  }
  if (decimalSep == null) {
    decimalSep = ".";
  }
  return function (x) {
    if (x === 0 || isNaN(x) || !isFinite(x)) {
      return "";
    } else {
      return addSeparators((scaler * x).toFixed(sigfig), thousandsSep, decimalSep);
    }
  };
};

aggregatorTemplates = {
  sum: function (sigfig, scaler) {
    if (sigfig == null) {
      sigfig = 3;
    }
    if (scaler == null) {
      scaler = 1;
    }
    return function (_arg) {
      var attr;
      attr = _arg[0];
      return function () {
        return {
          sum: 0,
          push: function (record) {
            if (!isNaN(parseFloat(record[attr]))) {
              return this.sum += parseFloat(record[attr]);
            }
          },
          value: function () {
            return this.sum;
          },
          format: numberFormat(sigfig, scaler),
          label: "Sum of " + attr
        };
      };
    };
  },
  average: function (sigfig, scaler) {
    if (sigfig == null) {
      sigfig = 3;
    }
    if (scaler == null) {
      scaler = 1;
    }
    return function (_arg) {
      var attr;
      attr = _arg[0];
      return function () {
        return {
          sum: 0,
          len: 0,
          push: function (record) {
            if (!isNaN(parseFloat(record[attr]))) {
              this.sum += parseFloat(record[attr]);
              return this.len++;
            }
          },
          value: function () {
            return this.sum / this.len;
          },
          format: numberFormat(sigfig, scaler),
          label: "Average of " + attr
        };
      };
    };
  },
  sumOverSum: function (sigfig, scaler) {
    if (sigfig == null) {
      sigfig = 3;
    }
    if (scaler == null) {
      scaler = 1;
    }
    return function (_arg) {
      var denom, num;
      num = _arg[0];
      denom = _arg[1];
      return function () {
        return {
          sumNum: 0,
          sumDenom: 0,
          push: function (record) {
            if (!isNaN(parseFloat(record[num]))) {
              this.sumNum += parseFloat(record[num]);
            }
            if (!isNaN(parseFloat(record[denom]))) {
              return this.sumDenom += parseFloat(record[denom]);
            }
          },
          value: function () {
            return this.sumNum / this.sumDenom;
          },
          format: numberFormat(sigfig, scaler),
          label: "" + num + "/" + denom
        };
      };
    };
  },
  sumOverSumBound80: function (sigfig, scaler, upper) {
    if (sigfig == null) {
      sigfig = 3;
    }
    if (scaler == null) {
      scaler = 1;
    }
    if (upper == null) {
      upper = true;
    }
    return function (_arg) {
      var denom, num;
      num = _arg[0];
      denom = _arg[1];
      return function () {
        return {
          sumNum: 0,
          sumDenom: 0,
          push: function (record) {
            if (!isNaN(parseFloat(record[num]))) {
              this.sumNum += parseFloat(record[num]);
            }
            if (!isNaN(parseFloat(record[denom]))) {
              return this.sumDenom += parseFloat(record[denom]);
            }
          },
          value: function () {
            var sign;
            sign = upper ? 1 : -1;
            return (0.821187207574908 / this.sumDenom + this.sumNum / this.sumDenom + 1.2815515655446004 *
              sign * Math.sqrt(0.410593603787454 / (this.sumDenom * this.sumDenom) +
              (this.sumNum * (1 - this.sumNum / this.sumDenom)) / (this.sumDenom * this.sumDenom))) /
              (1 + 1.642374415149816 / this.sumDenom);
          },
          format: numberFormat(sigfig, scaler),
          label: "" + (upper ? "Upper" : "Lower") + " Bound of " + num + "/" + denom
        };
      };
    };
  },
  fractionOf: function (wrapped, type) {
    if (type == null) {
      type = "total";
    }
    return function () {
      var x;
      x = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return function (data, rowKey, colKey) {
        return {
          selector: {
            total: [
              [],
              []
            ],
            row: [rowKey, []],
            col: [
              [],
              colKey
            ]
          }[type],
          inner: wrapped.apply(null, x)(data, rowKey, colKey),
          push: function (record) {
            return this.inner.push(record);
          },
          format: function (v) {
            return numberFormat(2)(100 * v) + "%";
          },
          label: wrapped.apply(null, x)(data, rowKey, colKey).label + " % of " + type,
          value: function () {
            return this.inner.value() / data.getAggregator.apply(data, this.selector).inner.value();
          }
        };
      };
    };
  },
  l10nWrapper: function (wrapped, formatter, labelFn) {
    return function () {
      var x;
      x = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return function (data, rowKey, colKey) {
        return {
          inner: wrapped.apply(null, x)(data, rowKey, colKey),
          push: function (record) {
            return this.inner.push(record);
          },
          format: formatter,
          label: labelFn(data),
          value: function () {
            return this.inner.value();
          }
        };
      };
    };
  }
};

aggregators = {
  count: function (record) {
    return function (record) {
      return {
        count: 0,
        push: function (record) {
          var explodeFields = ['symptoms', 'diagnoses', 'symptomsGroup', 'diagnosesGroup'];
          var tmpCount = 0;
          explodeFields.forEach(function(fld){
            if (record[fld] && angular.isArray(record[fld])) {
              var data = record[fld];
              angular.forEach(data, function (v) {
                var count = (v.count !== undefined) ? v.count : 1;
                
                 tmpCount += parseInt(v.count);
              });
            } 

          });
          
          return this.count += tmpCount;
        },
        value: function () {
          return this.count;
        },
        format: numberFormat(0),
        label: "Count"
      };
    };
  },
  countUnique: function (_arg) {
    var attr;
    attr = _arg[0];
    return function () {
      return {
        uniq: [],
        push: function (record) {
          var _ref;
          if (_ref = record[attr], __indexOf.call(this.uniq, _ref) < 0) {
            return this.uniq.push(record[attr]);
          }
        },
        value: function () {
          return this.uniq.length;
        },
        format: numberFormat(0),
        label: "Count Unique " + attr
      };
    };
  },
  listUnique: function (_arg) {
    var attr;
    attr = _arg[0];
    return function () {
      return {
        uniq: [],
        push: function (record) {
          var _ref;
          if (_ref = record[attr], __indexOf.call(this.uniq, _ref) < 0) {
            return this.uniq.push(record[attr]);
          }
        },
        value: function () {
          return this.uniq.join(", ");
        },
        format: function (x) {
          return x;
        },
        label: "List Unique " + attr
      };
    };
  },
  intSum: aggregatorTemplates.sum(0),
  sum: aggregatorTemplates.sum(3),
  average: aggregatorTemplates.average(3),
  sumOverSum: aggregatorTemplates.sumOverSum(3),
  ub80: aggregatorTemplates.sumOverSumBound80(3, 1, true),
  lb80: aggregatorTemplates.sumOverSumBound80(3, 1, false)
};

aggregators.sumAsFractionOfTotal = aggregatorTemplates.fractionOf(aggregators.sum);

aggregators.sumAsFractionOfRow = aggregatorTemplates.fractionOf(aggregators.sum, "row");

aggregators.sumAsFractionOfCol = aggregatorTemplates.fractionOf(aggregators.sum, "col");

aggregators.countAsFractionOfTotal = aggregatorTemplates.fractionOf(aggregators.count);

aggregators.countAsFractionOfRow = aggregatorTemplates.fractionOf(aggregators.count, "row");

aggregators.countAsFractionOfCol = aggregatorTemplates.fractionOf(aggregators.count, "col");

renderers = {
  "Table": function (pvtData, opts) {
    return pivotTableRenderer(pvtData, opts);
  },
  "Table Barchart": function (pvtData, opts) {
    return pivotTableRenderer(pvtData, opts).barchart();
  },
  "Heatmap": function (pvtData, opts) {
    return pivotTableRenderer(pvtData, opts).heatmap();
  },
  "Row Heatmap": function (pvtData, opts) {
    return pivotTableRenderer(pvtData, opts).heatmap("rowheatmap");
  },
  "Col Heatmap": function (pvtData, opts) {
    return pivotTableRenderer(pvtData, opts).heatmap("colheatmap");
  }
};

mthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

zeroPad = function (number) {
  return ("0" + number).substr(-2, 2);
};

derivers = {
  bin: function (col, binWidth) {
    return function (record) {
      return record[col] - record[col] % binWidth;
    };
  },
  dateFormat: function (col, formatString) {
    return function (record) {
      var date;
      date = new Date(Date.parse(record[col]));
      if (isNaN(date)) {
        return "";
      }
      return formatString.replace(/%(.)/g, function (m, p) {
        switch (p) {
          case "y":
            return date.getFullYear();
          case "m":
            return zeroPad(date.getMonth() + 1);
          case "n":
            return mthNames[date.getMonth()];
          case "d":
            return zeroPad(date.getDate());
          case "w":
            return dayNames[date.getDay()];
          case "x":
            return date.getDay();
          case "H":
            return zeroPad(date.getHours());
          case "M":
            return zeroPad(date.getMinutes());
          case "S":
            return zeroPad(date.getSeconds());
          default:
            return "%" + p;
        }
      });
    };
  }
};

naturalSort = function (as, bs) {
  var a, a1, b, b1, rd, rx, rz;
  rx = /(\d+)|(\D+)/g;
  rd = /\d/;
  rz = /^0/;
  if (typeof as === "number" || typeof bs === "number") {
    if (isNaN(as)) {
      return 1;
    }
    if (isNaN(bs)) {
      return -1;
    }
    return as - bs;
  }
  a = String(as).toLowerCase();
  b = String(bs).toLowerCase();
  if (a === b) {
    return 0;
  }
  if (!(rd.test(a) && rd.test(b))) {
    return (a > b ? 1 : -1);
  }
  a = a.match(rx);
  b = b.match(rx);
  while (a.length && b.length) {
    a1 = a.shift();
    b1 = b.shift();
    if (a1 !== b1) {
      if (rd.test(a1) && rd.test(b1)) {
        return a1.replace(rz, ".0") - b1.replace(rz, ".0");
      } else {
        return (a1 > b1 ? 1 : -1);
      }
    }
  }
  return a.length - b.length;
};


/*
 functions for accessing input
 */

deriveAttributes = function (record, derivedAttributes, f) {
  var k, v, _ref;
  for (k in derivedAttributes) {
    v = derivedAttributes[k];
    record[k] = (_ref = v(record)) != null ? _ref : record[k];
  }
  for (k in record) {
    if (!__hasProp.call(record, k)) {
      continue;
    }
    if (record[k] == null) {
      record[k] = "null";
    }
  }
  return f(record);
};

forEachRecord = function (input, derivedAttributes, f) {
  var addRecord, compactRecord, i, j, k, record, tblCols, _i, _len, _ref, _results, _results1;
  addRecord = function (record) {
    return deriveAttributes(record, derivedAttributes, f);
  };
  if ($.isFunction(input)) {
    return input(addRecord);
  } else if ($.isArray(input)) {
    if ($.isArray(input[0])) {
      _results = [];
      for (i in input) {
        if (!__hasProp.call(input, i)) {
          continue;
        }
        compactRecord = input[i];
        if (i <= 0) {
          continue;
        }
        record = {};
        _ref = input[0];
        for (j in _ref) {
          if (!__hasProp.call(_ref, j)) {
            continue;
          }
          k = _ref[j];
          record[k] = compactRecord[j];
        }
        _results.push(addRecord(record));
      }
      return _results;
    } else {
      _results1 = [];
      for (_i = 0, _len = input.length; _i < _len; _i++) {
        record = input[_i];
        _results1.push(addRecord(record));
      }
      return _results1;
    }
  } else if (input instanceof jQuery) {
    tblCols = [];
    $("thead > tr > th", input).each(function () {
      return tblCols.push($(this).text());
    });
    return $("tbody > tr", input).each(function () {
      record = {};
      $("td", this).each(function (j) {
        record[tblCols[j]] = $(this).text();
      });
      return addRecord(record);
    });
  } else {
    throw new Error("unknown input format");
  }
};

convertToArray = function (input) {
  var result;
  result = [];
  forEachRecord(input, {}, function (record) {
    return result.push(record);
  });
  return result;
};

PivotData = (function () {
  function PivotData (aggregator, colAttrs, rowAttrs) {
    this.aggregator = aggregator;
    this.colAttrs = colAttrs;
    this.rowAttrs = rowAttrs;
    this.getAggregator = __bind(this.getAggregator, this);
    this.flattenKey = __bind(this.flattenKey, this);
    this.getRowKeys = __bind(this.getRowKeys, this);
    this.getColKeys = __bind(this.getColKeys, this);
    this.getKeyFromRecord = __bind(this.getKeyFromRecord, this);
    this.getCellKey = __bind(this.getCellKey, this);
    this.sortKeys = __bind(this.sortKeys, this);
    this.arrSort = __bind(this.arrSort, this);
    this.natSort = __bind(this.natSort, this);
    this.tree = {};
    this.rowKeys = [];
    this.colKeys = [];
    this.flatRowKeys = [];
    this.flatColKeys = [];
    this.rowTotals = {};
    this.colTotals = {};
    this.allTotal = this.aggregator(this, [], []);
    this.sorted = false;
  }

  PivotData.prototype.natSort = function (as, bs) {
    return naturalSort(as, bs);
  };

  PivotData.prototype.arrSort = function (a, b) {
    return this.natSort(a.join(), b.join());
  };

  PivotData.prototype.sortKeys = function () {
    if (!this.sorted) {
      this.rowKeys.sort(this.arrSort);
      this.colKeys.sort(this.arrSort);
    }
    this.sorted = true;
    return true;
  };

  PivotData.prototype.getColKeys = function () {
    this.sortKeys();
    return this.colKeys;
  };

  PivotData.prototype.getRowKeys = function () {
    this.sortKeys();
    return this.rowKeys;
  };

  PivotData.prototype.getKeyFromRecord = function (nameKey, record) {
    var key, j;
    key = record;
    if(record && (typeof record !== 'string')){
      key = [];
      for(j = 0; j < record.length; ++j){
        key.push( record[j][nameKey] || record[j]);
      }
      key = key.join(',');
    }
    return key;
  };

  /*
   Extracted to function call to all for records to contain arrays of objects.
   Currently coded to search for array[index].name
   */
  PivotData.prototype.getCellKey = function (attrs, record, nameKey) {
    var _i, _len, _ref, _results, x, key;
    _ref = attrs;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      x = _ref[_i];
      key = this.getKeyFromRecord(nameKey, record[x]);
      _results.push(key);
    }
    return _results;
  };

  PivotData.prototype.flattenKey = function (x) {
    return x.join(String.fromCharCode(0));
  };

  PivotData.prototype.processRecord = function (record) {
    var colKey, flatColKey, flatRowKey, rowKey;
    colKey = this.getCellKey(this.colAttrs, record, 'name');
    rowKey = this.getCellKey(this.rowAttrs, record, 'name');
    flatRowKey = this.flattenKey(rowKey);
    flatColKey = this.flattenKey(colKey);
    this.allTotal.push(record);
    if (rowKey.length !== 0) {
      if (__indexOf.call(this.flatRowKeys, flatRowKey) < 0) {
        this.rowKeys.push(rowKey);
        this.flatRowKeys.push(flatRowKey);
      }
      if (!this.rowTotals[flatRowKey]) {
        this.rowTotals[flatRowKey] = this.aggregator(this, rowKey, []);
      }
      this.rowTotals[flatRowKey].push(record);
    }
    if (colKey.length !== 0) {
      if (__indexOf.call(this.flatColKeys, flatColKey) < 0) {
        this.colKeys.push(colKey);
        this.flatColKeys.push(flatColKey);
      }
      if (!this.colTotals[flatColKey]) {
        this.colTotals[flatColKey] = this.aggregator(this, [], colKey);
      }
      this.colTotals[flatColKey].push(record);
    }
    if (colKey.length !== 0 && rowKey.length !== 0) {
      if (!(flatRowKey in this.tree)) {
        this.tree[flatRowKey] = {};
      }
      if (!(flatColKey in this.tree[flatRowKey])) {
        this.tree[flatRowKey][flatColKey] = this.aggregator(this, rowKey, colKey);
      }
      return this.tree[flatRowKey][flatColKey].push(record);
    }
  };

  PivotData.prototype.getAggregator = function (rowKey, colKey) {
    var agg, flatColKey, flatRowKey;
    flatRowKey = this.flattenKey(rowKey);
    flatColKey = this.flattenKey(colKey);
    if (rowKey.length === 0 && colKey.length === 0) {
      agg = this.allTotal;
    } else if (rowKey.length === 0) {
      agg = this.colTotals[flatColKey];
    } else if (colKey.length === 0) {
      agg = this.rowTotals[flatRowKey];
    } else {
      agg = this.tree[flatRowKey][flatColKey];
    }
    return agg != null ? agg : {
      value: function () {
        return null;
      },
      format: function () {
        return "";
      }
    };
  };

  return PivotData;

})();

getPivotData = function (input, cols, rows, aggregator, filter, derivedAttributes) {
  var pivotData;
  pivotData = new PivotData(aggregator, cols, rows);
  forEachRecord(input, derivedAttributes, function (record) {
    if (filter(record)) {
      return pivotData.processRecord(record);
    }
  });
  return pivotData;
};

spanSize = function (arr, i, j) {
  var len, noDraw, stop, x, _i, _j;
  if (i !== 0) {
    noDraw = true;
    for (x = _i = 0; 0 <= j ? _i <= j : _i >= j; x = 0 <= j ? ++_i : --_i) {
      if (arr[i - 1][x] !== arr[i][x]) {
        noDraw = false;
      }
    }
    if (noDraw) {
      return -1;
    }
  }
  len = 0;
  while (i + len < arr.length) {
    stop = false;
    for (x = _j = 0; 0 <= j ? _j <= j : _j >= j; x = 0 <= j ? ++_j : --_j) {
      if (arr[i][x] !== arr[i + len][x]) {
        stop = true;
      }
    }
    if (stop) {
      break;
    }
    len++;
  }
  return len;
};

pivotTableRenderer = function (pivotData, opts) {
  var aggregator, c, colAttrs, colKey, colKeys, defaults, i, j, r, result, rowAttrs, rowKey, rowKeys, th, totalAggregator, tr, txt, val, x;
  defaults = {
    localeStrings: {
      totals: "Totals"
    }
  };
  opts = $.extend(defaults, opts);
  colAttrs = pivotData.colAttrs;
  rowAttrs = pivotData.rowAttrs;
  rowKeys = pivotData.getRowKeys();
  colKeys = pivotData.getColKeys();
  result = $("<table class='table table-bordered pvtTable'>");
  for (j in colAttrs) {
    if (!__hasProp.call(colAttrs, j)) {
      continue;
    }
    c = colAttrs[j];
    tr = $("<tr>");
    if (parseInt(j) === 0 && rowAttrs.length !== 0) {
      tr.append($("<th>").attr("colspan", rowAttrs.length).attr("rowspan", colAttrs.length));
    }
    tr.append($("<th class='pvtAxisLabel'>").text(c));
    for (i in colKeys) {
      if (!__hasProp.call(colKeys, i)) {
        continue;
      }
      colKey = colKeys[i];
      x = spanSize(colKeys, parseInt(i), parseInt(j));
      if (x !== -1) {
        th = $("<th class='pvtColLabel'>").text(colKey[j]).attr("colspan", x);
        if (parseInt(j) === colAttrs.length - 1 && rowAttrs.length !== 0) {
          th.attr("rowspan", 2);
        }
        tr.append(th);
      }
    }
    if (parseInt(j) === 0) {
      tr.append($("<th class='pvtTotalLabel'>").text(opts.localeStrings.totals).attr("rowspan", colAttrs.length + (rowAttrs.length === 0 ? 0 : 1)));
    }
    result.append(tr);
  }
  if (rowAttrs.length !== 0) {
    tr = $("<tr>");
    for (i in rowAttrs) {
      if (!__hasProp.call(rowAttrs, i)) {
        continue;
      }
      r = rowAttrs[i];
      tr.append($("<th class='pvtAxisLabel'>").text(r));
    }
    th = $("<th>");
    if (colAttrs.length === 0) {
      th.addClass("pvtTotalLabel").text(opts.localeStrings.totals);
    }
    tr.append(th);
    result.append(tr);
  }
  for (i in rowKeys) {
    if (!__hasProp.call(rowKeys, i)) {
      continue;
    }
    rowKey = rowKeys[i];
    tr = $("<tr>");
    for (j in rowKey) {
      if (!__hasProp.call(rowKey, j)) {
        continue;
      }
      txt = rowKey[j];
      x = spanSize(rowKeys, parseInt(i), parseInt(j));
      if (x !== -1) {
        th = $("<th class='pvtRowLabel'>").text(txt).attr("rowspan", x);
        if (parseInt(j) === rowAttrs.length - 1 && colAttrs.length !== 0) {
          th.attr("colspan", 2);
        }
        tr.append(th);
      }
    }
    for (j in colKeys) {
      if (!__hasProp.call(colKeys, j)) {
        continue;
      }
      colKey = colKeys[j];
      aggregator = pivotData.getAggregator(rowKey, colKey);
      val = aggregator.value();
      tr.append($("<td class='pvtVal row" + i + " col" + j + "'>").html(aggregator.format(val)).data("value", val));
    }
    totalAggregator = pivotData.getAggregator(rowKey, []);
    val = totalAggregator.value();
    tr.append($("<td class='pvtTotal rowTotal'>").html(totalAggregator.format(val)).data("value", val).data("for", "row" + i));
    result.append(tr);
  }
  tr = $("<tr>");
  th = $("<th class='pvtTotalLabel'>").text(opts.localeStrings.totals);
  th.attr("colspan", rowAttrs.length + (colAttrs.length === 0 ? 0 : 1));
  tr.append(th);
  for (j in colKeys) {
    if (!__hasProp.call(colKeys, j)) {
      continue;
    }
    colKey = colKeys[j];
    totalAggregator = pivotData.getAggregator([], colKey);
    val = totalAggregator.value();
    tr.append($("<td class='pvtTotal colTotal'>").html(totalAggregator.format(val)).data("value", val).data("for", "col" + j));
  }
  totalAggregator = pivotData.getAggregator([], []);
  val = totalAggregator.value();
  tr.append($("<td class='pvtGrandTotal'>").html(totalAggregator.format(val)).data("value", val));
  result.append(tr);
  result.data("dimensions", [rowKeys.length, colKeys.length]);
  return result;
};


$.pivotUtilities = {
  aggregatorTemplates: aggregatorTemplates,
  aggregators: aggregators,
  renderers: renderers,
  derivers: derivers,
  naturalSort: naturalSort,
  numberFormat: numberFormat,
  //added for data pull test
  getPivotData: getPivotData
};


/*
 Pivot Table
 */

module.exports = $.fn.pivot = function (input, opts) {
  var defaults, e, pivotData, result;
  defaults = {
    cols: [],
    rows: [],
    filter: function () {
      return true;
    },
    aggregator: aggregators.count(),
    derivedAttributes: {},
    renderer: pivotTableRenderer,
    rendererOptions: null,
    localeStrings: {
      renderError: "An error occurred rendering the PivotTable results.",
      computeError: "An error occurred computing the PivotTable results."
    }
  };
  opts = $.extend(defaults, opts);
  result = null;
  try {
    pivotData = getPivotData(input, opts.cols, opts.rows, opts.aggregator, opts.filter, opts.derivedAttributes);
    try {
      result = opts.renderer(pivotData, opts.rendererOptions);
    } catch (_error) {
      e = _error;
      if (typeof console !== "undefined" && console !== null) {
        console.error(e.stack);
      }
      result = opts.localeStrings.renderError;
    }
  } catch (_error) {
    e = _error;
    if (typeof console !== "undefined" && console !== null) {
      console.error(e.stack);
    }
    result = opts.localeStrings.computeError;
  }
  this.html(result);
  return this;
};

/*
 Heatmap post-processing
 */

$.fn.heatmap = function (scope) {
  var colorGen, heatmapper, i, j, numCols, numRows, _i, _j, _ref,
    _this = this;
  if (scope == null) {
    scope = "heatmap";
  }
  _ref = this.data("dimensions");
  numRows = _ref[0];
  numCols = _ref[1];

  colorGen = function (color, min, max) {
    var hexGen;
    hexGen = (function () {
      switch (color) {
        case "red":
          return function (hex) {
            return "ff" + hex + hex;
          };
        case "green":
          return function (hex) {
            return "" + hex + "ff" + hex;
          };
        case "blue":
          return function (hex) {
            return "" + hex + hex + "ff";
          };
      }
    })();
    return function (x) {
      var hex, intensity;
      intensity = 255 - Math.round(255 * (x - min) / (max - min));
      hex = intensity.toString(16).split(".")[0];
      if (hex.length === 1) {
        hex = 0 + hex;
      }
      return hexGen(hex);
    };
  };
  heatmapper = function (scope, color) {
    var colorFor, forEachCell, values;
    forEachCell = function (f) {
      return _this.find(scope).each(function () {
        var x;
        x = $(this).data("value");
        if ((x != null) && isFinite(x)) {
          return f(x, $(this));
        }
      });
    };
    values = [];
    forEachCell(function (x) {
      return values.push(x);
    });
    colorFor = colorGen(color, Math.min.apply(Math, values), Math.max.apply(Math, values));
    return forEachCell(function (x, elem) {
      return elem.css("background-color", "#" + colorFor(x));
    });
  };
  switch (scope) {
    case "heatmap":
      heatmapper(".pvtVal", "red");
      break;
    case "rowheatmap":
      for (i = _i = 0; 0 <= numRows ? _i < numRows : _i > numRows; i = 0 <= numRows ? ++_i : --_i) {
        heatmapper(".pvtVal.row" + i, "red");
      }
      break;
    case "colheatmap":
      for (j = _j = 0; 0 <= numCols ? _j < numCols : _j > numCols; j = 0 <= numCols ? ++_j : --_j) {
        heatmapper(".pvtVal.col" + j, "red");
      }
  }
  heatmapper(".pvtTotal.rowTotal", "red");
  heatmapper(".pvtTotal.colTotal", "red");
  return this;
};

/*
 Barchart post-processing
 */

$.fn.barchart = function () {
  var barcharter, i, numCols, numRows, _i, _ref,
    _this = this;
  _ref = this.data("dimensions");
  numRows = _ref[0];
  numCols = _ref[1];

  barcharter = function (scope) {
    var forEachCell, max, scaler, values;
    forEachCell = function (f) {
      return _this.find(scope).each(function () {
        var x;
        x = $(this).data("value");
        if ((x != null) && isFinite(x)) {
          return f(x, $(this));
        }
      });
    };
    values = [];
    forEachCell(function (x) {
      return values.push(x);
    });
    max = Math.max.apply(Math, values);
    scaler = function (x) {
      return 100 * x / (1.4 * max);
    };
    return forEachCell(function (x, elem) {
      var text, wrapper;
      text = elem.text();
      wrapper = $("<div>").css({
        "position": "relative",
        "height": "55px"
      });
      wrapper.append($("<div>").css({
        "position": "absolute",
        "bottom": 0,
        "left": 0,
        "right": 0,
        "height": scaler(x) + "%",
        "background-color": "gray"
      }));
      wrapper.append($("<div>").text(text).css({
        "position": "relative",
        "padding-left": "5px",
        "padding-right": "5px"
      }));
      return elem.css({
        "padding": 0,
        "padding-top": "5px",
        "text-align": "center"
      }).html(wrapper);
    });
  };
  for (i = _i = 0; 0 <= numRows ? _i < numRows : _i > numRows; i = 0 <= numRows ? ++_i : --_i) {
    barcharter(".pvtVal.row" + i);
  }
  barcharter(".pvtTotal.colTotal");
  return this;
};

