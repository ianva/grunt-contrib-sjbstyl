// Generated by CoffeeScript 1.9.2
(function() {
  var csso, exec, fs, getFileName, nib, opt, path, shell, stylus;

  exec = require('child_process').exec;

  path = require('path');

  fs = require('fs');

  opt = require('optimist');

  stylus = require('stylus');

  nib = require('nib');

  csso = require('csso');

  shell = require('shelljs');

  getFileName = function(filepath) {
    var name, nameArr, pathArr;
    pathArr = filepath.split('/');
    nameArr = pathArr[pathArr.length - 1].split('.');
    nameArr.pop();
    return name = nameArr.join('.');
  };

  exports.complies = function(grunt, compe) {
    var exports;
    exports = {};
    exports.init = function(options) {
      var basePath, deploy, distCss, distIconCss, distStyl, dplPath, getPath, importPath, main, pagePath, processCSSO, processDir, sysPath, tasks, writeFile;
      processCSSO = function(src, isOpt) {
        var min;
        min = '';
        if (isOpt) {
          min = csso.justDoIt(src);
        } else {
          min = csso.justDoIt(src, true);
        }
        return min;
      };
      getPath = function(dir) {
        if (options.onlyStylu) {
          return dir;
        } else {
          return 'tos-styl/' + dir;
        }
      };
      distCss = getPath('dist_css');
      distIconCss = getPath('dist_icon_css');
      distStyl = getPath('dist_styl');
      importPath = getPath('styl/import');
      basePath = getPath('styl/base');
      dplPath = getPath('styl/dpl');
      sysPath = getPath('styl/sys');
      pagePath = getPath('styl/app/page');
      writeFile = function(putfile, results) {
        grunt.log.ok("File " + putfile + ' created');
        return grunt.file.write(putfile, results.join(grunt.util.normalizelf(grunt.util.linefeed)));
      };
      processDir = function(dir, callback) {
        return grunt.file.recurse(dir, function(abspath, rootdir, subdir, filename) {
          return callback(filename, abspath);
        });
      };
      tasks = {
        importDirProcess: function(mod, needimp, currentDir) {
          var content, fargs, filesArr, linesArr, putCss, putfile;
          if (needimp == null) {
            needimp = false;
          }
          putfile = distStyl + '/' + mod + '.styl';
          putCss = distCss + '/' + mod + '.css';
          content = [];
          linesArr = [];
          filesArr = [];
          fargs = [];
          if (needimp === true) {
            fargs.push(function() {
              return content.push(grunt.file.read(distStyl + '/import.styl'));
            });
          }
          fargs.push(function() {
            return processDir(currentDir, function(filename, abspath) {
              linesArr[filename] = {
                path: '@import ' + '"' + abspath + '"'
              };
              return filesArr.push(filename);
            });
          });
          fargs.push(function() {
            var file, i, len, results1;
            filesArr.sort();
            results1 = [];
            for (i = 0, len = filesArr.length; i < len; i++) {
              file = filesArr[i];
              results1.push(content.push(linesArr[file].path));
            }
            return results1;
          });
          fargs.push(function() {
            return writeFile(putfile, content);
          });
          fargs.push(function() {
            return compe(putfile, options, function(css, err) {
              grunt.file.write(putCss, css);
              return console.log('File ' + putCss + ' created');
            });
          });
          return grunt.util.async.parallel(fargs);
        },
        proPage: function(filepath) {
          var content, fargs, importCss, name, nameArr, pathArr, putCss, putCssMin, putfile, regImport;
          pathArr = filepath.split('/');
          putfile = distStyl + '/' + pathArr[pathArr.length - 1];
          nameArr = pathArr[pathArr.length - 1].split('.');
          nameArr.pop();
          name = nameArr.join('.');
          putCss = distCss + '/' + name + '.css';
          putCssMin = distCss + '/' + name + '.min.css';
          importCss = "";
          regImport = /@import\s+"([a-zA-Z0-9._\/-]+\.css)";?\n/gm;
          content = [];
          fargs = [];
          fargs.push(function() {
            return content.push(grunt.file.read(distStyl + '/import.styl'));
          });
          fargs.push(function() {
            return content.push(grunt.file.read(filepath));
          });
          fargs.push(function() {
            return writeFile(putfile, content);
          });
          fargs.push(function() {
            return compe(putfile, options, function(css, err) {
              var e, iconFiles, patt, strArr, tempCss;
              strArr = putCss.slice(putCss.lastIndexOf('/') + 1, putCss.length - 4);
              patt = new RegExp("(icon|i)-" + strArr + "[0-9]*\.");
              iconFiles = shell.find(distIconCss).filter(function(file) {
                return file.match(patt);
              });
              if (iconFiles.length) {
                iconFiles.forEach(function(item) {
                  css = grunt.file.read(item) + "\r\n" + css;
                  return grunt.log.ok('File ' + putCss + ' prepended file ' + item);
                });
              }
              css.replace(regImport, function(m, s1) {
                importCss = importCss + grunt.file.read(s1);
                return grunt.log.ok('Import ' + s1 + ' success.');
              });
              css = importCss + css.replace(regImport, '');
              grunt.file.write(putCss, css);
              if (options.isCompress) {
                try {
                  tempCss = processCSSO(css);
                  css = tempCss;
                  grunt.file.write(putCssMin, css);
                  grunt.log.ok('File ' + putCss + ' minified.');
                } catch (_error) {
                  e = _error;
                  grunt.file.write(putCssMin, css);
                  grunt.log.error('minify ' + putCss + ' failed.');
                }
              }
              return grunt.log.ok('File ' + putCss + ' created');
            });
          });
          return grunt.util.async.parallel(fargs);
        },
        proModule: function(filepath) {
          var fargs;
          fargs = [];
          grunt.file.recurse(pagePath, function(abspath, rootdir, subdir, filename) {
            var matchPath;
            matchPath = new RegExp('/module/' + getFileName(filepath));
            return fargs.push(function() {
              return matchPath.test(fs.readFileSync(abspath).toString()) && tasks.proPage(abspath);
            });
          });
          return grunt.util.async.parallel(fargs);
        }
      };
      main = function(mod, filepath) {
        var currentDir, fargs;
        if (mod === 'base' || mod === 'dpl' || mod === 'sys') {
          currentDir = path.dirname(filepath);
          fargs = [];
          fargs.push(function() {
            return tasks.importDirProcess(mod, true, currentDir);
          });
          return grunt.util.async.parallel(fargs);
        } else if (mod === 'import') {
          currentDir = path.dirname(filepath);
          fargs = [];
          fargs.push(function() {
            return tasks.importDirProcess(mod, false, currentDir);
          });
          fargs.push(function() {
            return tasks.importDirProcess('base', true, basePath);
          });
          fargs.push(function() {
            return tasks.importDirProcess('dpl', true, dplPath);
          });
          fargs.push(function() {
            return tasks.importDirProcess('sys', true, sysPath);
          });
          fargs.push(function() {
            return grunt.file.recurse(pagePath, function(abspath, rootdir, subdir, filename) {
              return tasks.proPage(abspath);
            });
          });
          return grunt.util.async.parallel(fargs);
        } else if (mod === 'page') {
          return tasks.proPage(filepath);
        } else if (mod === 'module') {
          return tasks.proModule(filepath);
        }
      };
      deploy = function() {
        var currentVersion, execute, lastReleaseVersion, versionCacheFile;
        execute = function(command, callback) {
          return callback(shell.exec(command, {
            silent: true
          }).output);
        };
        lastReleaseVersion = null;
        versionCacheFile = 'versioncache.log';
        currentVersion = shell.exec("git log -1 --pretty=format:'%H'", {
          silent: true
        }).output;
        if (grunt.file.exists(versionCacheFile)) {
          lastReleaseVersion = grunt.file.read(versionCacheFile);
        }
        if (lastReleaseVersion) {
          execute("git diff " + currentVersion + ".." + lastReleaseVersion + " --raw", function(raw) {
            var rawArr;
            if (!raw) {
              return;
            }
            rawArr = raw.split("\n");
            console.log(raw);
            return rawArr.forEach(function(line) {
              var fileArr, filename, filenameArr, lineArr;
              if (line) {
                lineArr = line.split(' ');
                fileArr = lineArr[4].split("\t");
                if (fileArr[0] !== 'D' && fileArr[1].indexOf(".styl") !== -1) {
                  filename = fileArr[1];
                  filenameArr = filename.split("/");
                  return main(filenameArr[filenameArr.length - 2], fileArr[1]);
                }
              }
            });
          });
        } else {
          main('import', 'styl/import/effect.styl');
        }
        return grunt.file.write(versionCacheFile, currentVersion);
      };
      if (!options.deploy) {
        return main(options.mod, options.filepath);
      } else {
        return deploy();
      }
    };
    return exports;
  };

}).call(this);
