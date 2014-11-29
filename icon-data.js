var yaml = require('js-yaml');
var fs = require('fs');
var cli = require('cli');

module.exports.categoryMax = 999;
module.exports.icons = {};

module.exports.addIcon = function(category, name, classes) {
	var cat = category;
	if(!module.exports.icons[cat]) {
		module.exports.icons[cat] = [];
	}

	for (var x = 2; x < 99; x++) {
		if(module.exports.icons[cat].length < module.exports.categoryMax) {
			break;
		}

		cat = category + ' ' + x;

		if(!module.exports.icons[cat]) {
			module.exports.icons[cat] = [];
		}
	}


	module.exports.icons[cat].push({
		name: name,
		classes: classes
	}); 
};

module.exports.loadYaml = function(src) {
	var iconList = yaml.safeLoad(fs.readFileSync(src, 'utf8'));

	for (var i = 0; i < iconList.icons.length; i++) {
		var icon = iconList.icons[i];

		for (var c = 0; c < icon.categories.length; c++) {
			module.exports.addIcon(icon.categories[c], icon.name, 'fa fa-fw fa-'+icon.id);
		}
	}

	console.log('Loaded ' +iconList.icons.length+ ' icons from '+src);
};

module.exports.save = function(dest, prefix, suffix) {
	console.log('Saving to ' +dest)
	var categories = Object.getOwnPropertyNames(module.exports.icons).sort();

	for(i in categories) {
		var c = categories[i];
		console.log('  '+ c + ': ' +module.exports.icons[c].length);
	}

	fs.writeFileSync(dest, prefix + JSON.stringify(module.exports.icons) + suffix);
}
