/**
 * @file css
 * @author junmer
 */

/* eslint-env node */
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var isTtf = require('is-ttf');
var through = require('through2');
var replaceExt = require('replace-ext');

/**
 * tpl
 *
 * @type {string}
 */
var tpl = fs.readFileSync(
    path.resolve(__dirname, '../lib/font-face.tpl')
).toString('utf-8');

/**
 * renderCss
 *
 * @type {function}
 */
var renderCss = _.template(tpl);


/**
 * listUnicode
 *
 * @param  {Array} unicode unicode
 * @return {string}         unicode string
 */
function listUnicode(unicode) {
    return unicode.map(function (u) {
        return '\\' + u.toString(16);
    }).join(',');
}

/**
 * ttf数据结构转icon数据结构
 *
 * @param {ttfObject} ttf ttfObject对象
 * @param {Object} options 选项
 * @param {Object} options.iconPrefix icon 前缀
 * @param {Object} options.fontFamily fontFamily
 * @return {Object} icon obj
 */
function ttfobject2icon(ttf, options) {

    var glyfList = [];

    // glyf 信息
    var filtered = ttf.glyf.filter(function (g) {
        return g.name !== '.notdef'
            && g.name !== '.null'
            && g.name !== 'nonmarkingreturn'
            && g.unicode && g.unicode.length;
    });

    filtered.forEach(function (g) {
        glyfList.push({
            code: '&#x' + g.unicode[0].toString(16) + ';',
            codeName: listUnicode(g.unicode),
            name: g.name
        });
    });

    return {
        fontFamily: options.fontFamily || ttf.name.fontFamily,
        iconPrefix: options.iconPrefix || 'icon',
        glyfList: glyfList
    };

}

/**
 * css fontmin plugin
 *
 * @param {Object} opts opts
 * @param {Object} opts.glyph      生成字型 css
 * @param {Object} opts.iconPrefix icon 前缀
 * @param {Object} opts.fontFamily fontFamily
 * @return {Object} stream.Transform instance
 * @api public
 */
module.exports = function (opts) {
    opts = opts || {};

    return through.ctor({
        objectMode: true
    }, function (file, enc, cb) {

        // check null
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        // check stream
        if (file.isStream()) {
            cb(new Error('Streaming is not supported'));
        }

        // check ttf
        if (!isTtf(file.contents)) {
            cb(null, file);
            return;
        }

        // clone
        this.push(file.clone());

        file.path = replaceExt(file.path, '.css');
        var fontFile = path.basename(file.path, '.css');

        // font data
        var fontInfo = {
            fontUri: fontFile
        };

        if (opts.glyph && file.ttfObject) {
            _.defaults(
                fontInfo,
                ttfobject2icon(file.ttfObject, opts),
                {
                    fontFamily: fontFile
                }
            );
        }
        else {
            fontInfo.fontFamily = fontFile;
        }

        file.contents = new Buffer(renderCss(fontInfo));

        cb(null, file);

    });

};

