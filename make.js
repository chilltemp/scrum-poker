#!/usr/local/bin/node
var yaml = require('js-yaml');
var fs = require('fs');
var cli = require('cli');

var iconList = yaml.safeLoad(fs.readFileSync('scrum-poker/icons.yml', 'utf8'));
var iconCatalog = { 'default': [{
	name: 'Default',
	classes: 'cardBack'
}]};
//console.log(iconList);

for (var i = 0; i < iconList.icons.length; i++) {
	var icon = iconList.icons[i];

	for (var c = 0; c < icon.categories.length; c++) {
		var catalog = icon.categories[c];

		if(!iconCatalog[catalog]) {
			iconCatalog[catalog] = [];
		}

		for (var x = 2; x < 99; x++) {
			if(iconCatalog[catalog].length < 60) {
				break;
			}

			catalog = icon.categories[c] + ' ' + x;

			if(!iconCatalog[catalog]) {
				iconCatalog[catalog] = [];
			}
		}


		iconCatalog[catalog].push({
			name: icon.name,
			classes: 'fa fa-fw fa-'+icon.id
		});
	};
};

for(c in iconCatalog) {
	console.log(c);
}

fs.writeFile('scrum-poker/icons.json', '$scope.icons = ' + JSON.stringify(iconCatalog) +';');

