module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    watch: {
    	all: {
    		files: ['Gruntfile.js', 'package.json', 'icon-data.js', 'src/**'],
    		tasks: ['default'],
    		options: {
    			atBegin: true,
    			spawn: true
    		}
    	}
    },

    copy: { 
    	main: {
    		files: [
    			{ expand: true, cwd: 'src/', src: 'app.xml', dest: 'build/' }
    		]
    	},
    	deploy: {
    		files: [
    			{ expand: true, cwd: 'build/', src: 'app.xml', 
    				dest: '/Volumes/myfiles.messagingengine.com/hangouts/',
    				rename: function(dest, src) { 
    					var v = grunt.config.data.pkg.version.replace('v','').split('.');    					
    					var name = 'scrum-poker-' + v[0] + '-' + v[1];
    					name = src.replace('app', name);

    					console.log(grunt.config.data.pkg.version + ' ==> ' + name);
    					return dest + name; 
    				}
    			}
    		],
				options: {
  				process: function(content, src) {
  					return content.replace('###version###', grunt.config.data.pkg.version);
  				} 
				}
    	}
    },

	  insert: {
			html: {
				src: "src/app.html",
				dest: "build/app.xml",
				match: "###app.html###"
			},
			css: {
				src: "src/app.css",
				dest: "build/app.xml",
				match: "/* ###app.css### */"
			},
			js: {
				src: "src/app.js",
				dest: "build/app.xml",
				match: "/* ###app.js### */"
			},
			icons: {
				src: "build/icons.json",
				dest: "build/app.xml",
				match: "/* ###icons.json### */"
			}
		}
	});

  grunt.registerTask('icon-data', function() {
  	var builder = require('./icon-data.js');
  	builder.loadYaml('src/icons.yml');
  	builder.save('build/icons.json', '$scope.icons = ', ';');
  });

	grunt.loadNpmTasks('grunt-insert');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['icon-data', 'copy:main', 'insert', 'copy:deploy']);
};

