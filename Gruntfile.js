module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    watch: {
    	all: {
    		files: ['Gruntfile.js', 'package.json', 'icon-data.js', 'src/**'],
    		tasks: ['default'],
    		options: {
    			spawn: true
    		}
    	}
    },

    copy: { main:{
    	files: [
    		{ expand: true, cwd: 'src/', src: 'app.xml', dest: 'build/'}
    	]}
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

	grunt.registerTask('default', ['icon-data', 'copy', 'insert']);
};

