#!/usr/bin/env node

// Checks entries in vocab.json.
// We assume maintainer adds entries in vocab.json with just a src="..."
// line, and then downloads the thenounproject icon to $HOME/Downloads/*.zip
// This script unpacks and lays out the icon and its attribution, following
// the CC-BY terms.

var fs = require('fs');
var sh = require('shelljs');

var name_sub = {
    "=": "_equals_",
    "<": "_lt_",
    ">": "_gt_",
    "?": "_lambda_"
};

function get_thenounproject(id,name) {
    if (name_sub[name]) {
	name = name_sub[name];
    }
    var m = name.match(/([-a-zA-Z_0-9]+)/);
    if (!m) {
	throw("name " + 'name' + " is strange");
    }
    name = m[1];
    var fname = "svg/" + name + ".svg";
    if (sh.test("-e",fname)) {
	sh.rm(fname);
    }
    var dname = sh.env['HOME'] + "/Downloads/svg_" + id + ".zip";
    if (sh.test("-e",dname)) {
	console.log("Working on: " + name);
	sh.exec("unzip -j " + dname + " \"*/icon*.svg\" \"*/license.txt\" -d " + "svg");
	sh.mv("svg/icon_" + id + ".svg", "svg/" + name + ".svg");
	var attr = sh.grep("from The Noun Project","svg/license.txt");
	var author = attr.match(/[^ \t].* by (.*) from The Noun Project/,attr[0]);
	var dud = false;
	if (!author) dud = true;
	if (!sh.grep("Commons Attribution","svg/license.txt")) dud = true;
	var license = "CC BY";
	if (sh.grep("Public Domain","svg/license.txt")) {
	    author = ["PD","[Public Domain]"];
	    dud = false;
	    license = "Public Domain";
	}
	var license_txt = sh.grep('-v',"(Premium)|(worry about attribution)|(purchase with)","svg/license.txt");
	sh.rm("svg/license.txt");
	if (dud) return false;
	license_txt.to("svg/" + name + ".txt");
	author = author[1];
	return {
	    author: author,
	    license: license,
	    np_id: id,
	    media: "svg/" + name + ".svg"
	};
    } else {
	return null;
    }
}

var low = require('lowdb');
low.path = "vocab.json";
low.load();
var vocabs = low('vocab').value();
for (var i=0; i<vocabs.length; i++) {
    var vocab = vocabs[i];
    var title = vocab.title;
    var src = vocab.src;
    var np_id = vocab.np_id;
    var media = vocab.media;
    if (src && !media) {
	var m = src.match(/thenounproject.com\/.*\/.*\/([0-9]+)\//);
	if (m) {
	    var fields = get_thenounproject(m[1],title);
	    if (!fields) {
		console.log("nothing for: " + title);
		console.log("download from: " + src);
	    } else {
		console.log("update with: " + JSON.stringify(fields));
		low('vocab').updateWhere({title: title},fields);
	    }
	} else {
	    throw("do not know what to do with " + src);
	}
    }
}
