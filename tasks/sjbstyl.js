/*
 * grunt-sjbstyl
 * https://github.com/evanchen/grunt-contrib-sjbstyl
 *
 * Copyright (c) 2013 evan.chen
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var nib = require('nib');
  var compileStylus = function(srcFile, options, callback) {
    options = grunt.util._.extend({filename: srcFile}, options);

    // Never compress output in debug mode
    if (grunt.option('debug')) {
      options.compress = false;
    }

    var srcCode = grunt.file.read(srcFile);
    var stylus = require('stylus');
    var s = stylus(srcCode);

    // Load Nib if available
    try {
      s.use(require('nib')()).import('nib');
    } catch (e) {}

    s.render(function(err, css) {
      if (err) {
        grunt.log.error(err);
        grunt.fail.warn('Stylus failed to compile.');

        callback(css, true);
      } else {
        callback(css, null);
      }
    });
  };

  var sty = require('./styl.js'); 
  var csso =  require('csso');

    // compile styl
    grunt.registerMultiTask('compileStyl', 'Your task description goes here.', function() {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            punctuation: '.',
            separator: ', '
        });

        // Iterate over all specified file groups.
        this.files.forEach(function(f) {
            sty.complies(grunt, compileStylus).init(options);
        });
    });

    // Minify css for extra and also copy css to dist directory. 
    grunt.task.registerMultiTask('extraCss', 'Minify css for extra and also copy css to dist directory.', function() {
        this.files.forEach(function(file){
             var contents = file.src.filter(function(filepath) {
                 if (!grunt.file.exists(filepath) ) {
                     grunt.log.warn('Source file "' + filepath + '" not found.');
                     return false;
                 }

                 if(/\.min.css$/.test(filepath)){
                    return false;
                 }
                 return true;

             }).forEach(function(filepath) {
                 
                 var css  = grunt.file.read(filepath);

                 var name =  /([^\/]+).css$/.exec(filepath)[1];

                 // copy extra 源文件到 dest 目录
                 grunt.file.write(file.dest +'/'+ name + '.css', css);
                 grunt.log.ok('copy   File ' + filepath + ' copied => ' +  file.dest +'/'+ name + '.css' );
                 
                 // minify css 到 dest 目录
                 try {
                     grunt.file.write(file.dest +'/'+ name + '.min.css', csso.justDoIt(css));
                     grunt.log.ok('minify File ' + filepath + ' minified => ' +  file.dest +'/'+ name + '.min.css' );
                 } catch (e) {
                     grunt.file.write(file.dest +'/'+ name + '.min.css', css);
                     grunt.log.warn( 'WARN Minify: File ' + filepath + ' minify failed.' );
                     grunt.log.warn( '=> ' + e );
                 }


             });
        });
    });
  
};
