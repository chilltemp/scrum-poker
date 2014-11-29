var yaml = require('js-yaml');
var fs = require('fs');
var cli = require('cli');

module.exports.catalogMax = 60;
module.exports.icons = { 'default': [{
	name: 'Default',
	classes: 'cardBack'
}]};

module.exports.loadYaml = function(src) {
	var iconList = yaml.safeLoad(fs.readFileSync(src, 'utf8'));

	for (var i = 0; i < iconList.icons.length; i++) {
		var icon = iconList.icons[i];

		for (var c = 0; c < icon.categories.length; c++) {
			var catalog = icon.categories[c];

			if(!module.exports.icons[catalog]) {
				module.exports.icons[catalog] = [];
			}

			for (var x = 2; x < 99; x++) {
				if(module.exports.icons[catalog].length < module.exports.catalogMax) {
					break;
				}

				catalog = icon.categories[c] + ' ' + x;

				if(!module.exports.icons[catalog]) {
					module.exports.icons[catalog] = [];
				}
			}


			module.exports.icons[catalog].push({
				name: icon.name,
				classes: 'fa fa-fw fa-'+icon.id
			}); 
		};
	};

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
