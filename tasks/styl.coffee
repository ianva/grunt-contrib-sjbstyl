 #!/usr/bin/env node

exec = require('child_process').exec
path = require 'path'
fs   = require 'fs'
opt = require 'optimist'
stylus = require 'stylus'
nib = require 'nib'
csso =  require 'csso'
shell = require 'shelljs'

getFileName = (filepath)->
  pathArr = filepath.split('/')
  nameArr = pathArr[pathArr.length - 1].split('.')
  nameArr.pop()
  name = nameArr.join('.')

exports.complies = (grunt, compe) ->
  exports = {}
  exports.init = (options) ->

    processCSSO = (src, isOpt) ->
      min = ''
      if isOpt
        min = csso.justDoIt src
      else
        min = csso.justDoIt src, true
      return min

    # 给上线部署只编译stylus预留接口
    getPath = (dir) ->
      if options.onlyStylu
        return dir
      else
        return 'tos-styl/' + dir

    distCss = getPath 'dist_css'
    distIconCss = getPath 'dist_icon_css'
    distStyl = getPath 'dist_styl'

    importPath = getPath 'styl/import'
    basePath = getPath 'styl/base'
    dplPath = getPath 'styl/dpl'
    sysPath = getPath 'styl/sys'
    pagePath = getPath 'styl/app/page'

    writeFile = (putfile, results) ->
      grunt.log.ok  "File " + putfile + ' created'
      grunt.file.write putfile, results.join grunt.util.normalizelf grunt.util.linefeed

    #获取到指定目录下的文件名列表
    processDir = (dir, callback) ->
      grunt.file.recurse dir, (abspath, rootdir, subdir, filename) ->
        #line = '@import ' + '"' + abspath + '"'
        callback filename, abspath

    tasks =
      importDirProcess: (mod, needimp = false, currentDir) ->
        putfile = distStyl + '/' + mod + '.styl'
        putCss = distCss + '/' + mod + '.css'
        content = []
        linesArr = []
        filesArr = []
        fargs = []
        #是不是要引入import.styl
        if needimp is true
          fargs.push ->
            content.push grunt.file.read distStyl + '/import.styl'
        #遍历目录下的所有文件，写成一句一句的import
        fargs.push ->
          processDir currentDir, (filename, abspath) ->
            linesArr[filename]= path: '@import ' + '"' + abspath + '"'
            filesArr.push filename
        fargs.push ->
            filesArr.sort()
            content.push linesArr[file].path for file in filesArr
        #把所有的import 语句写入的目标styl文件中
        fargs.push ->
          writeFile putfile, content
        #调用compile把stylu编译成css
        fargs.push ->
          compe putfile, options, (css, err) ->
            grunt.file.write putCss, css
            console.log 'File ' + putCss + ' created'
        grunt.util.async.parallel fargs


      proPage: (filepath) ->
        #console.log 'filepath: ' + filepath
        pathArr = filepath.split('/')
        putfile = distStyl + '/' + pathArr[pathArr.length - 1]
        nameArr = pathArr[pathArr.length - 1].split('.')
        nameArr.pop()
        name = nameArr.join('.')
        putCss = distCss + '/' + name + '.css'
        putCssMin = distCss + '/'+ name + '.min.css'
        importCss = ""

        regImport = /@import\s+"([a-zA-Z0-9._/-]+\.css)";?\n/gm

        content = []
        fargs = []

        fargs.push ->
          content.push grunt.file.read distStyl + '/import.styl'
        fargs.push ->
          content.push grunt.file.read filepath
        fargs.push ->
          writeFile putfile, content
        fargs.push ->
          compe putfile, options, (css, err) ->
            
            #检查是否有对应css的icon样式有的话加入其中
            strArr = putCss.slice(putCss.lastIndexOf('/')+1, putCss.length - 4)

            patt = new RegExp "(icon|i)-#{strArr}[0-9]*[-.]"
            iconFiles = shell.find(distIconCss).filter (file)->
              file.match( patt )

            # 合并icon到对应的css

            if iconFiles.length
              
              iconFiles.forEach (item)->
                css = grunt.file.read(item) + "\r\n" + css
                grunt.log.ok 'File ' + putCss + ' prepended file ' + item


            # 检查 improt 的 icon
            css.replace regImport,(m,s1)->
              importCss =  importCss + grunt.file.read(s1)
              grunt.log.ok 'Import ' + s1 + ' success.'

            css = importCss + css.replace regImport,''

            #压缩css
            #css = processCSSO css
            grunt.file.write putCss, css

            if options.isCompress
              try
                  tempCss = processCSSO css
                  css = tempCss
                  grunt.file.write putCssMin, css
                  grunt.log.ok 'File ' + putCss + ' minified.'
              catch e
                grunt.file.write putCssMin, css
                grunt.log.error 'minify '+putCss+' failed.'

            grunt.log.ok 'File ' + putCss + ' created'


        grunt.util.async.parallel fargs

      proModule: (filepath) ->

        fargs = []

        grunt.file.recurse pagePath, (abspath, rootdir, subdir, filename) ->
          matchPath = new RegExp( '/module/' + getFileName( filepath ) )
          fargs.push ->
            matchPath.test( fs.readFileSync( abspath ).toString() ) && tasks.proPage abspath

        grunt.util.async.parallel fargs

    #入口函数
    main = (mod, filepath) ->

      if mod in ['base', 'dpl', 'sys']
        currentDir = path.dirname filepath
        fargs = []
        fargs.push ->
          tasks.importDirProcess mod, true, currentDir
        grunt.util.async.parallel fargs
      else if mod is 'import'

        currentDir = path.dirname filepath
        fargs = []
        fargs.push ->
          tasks.importDirProcess mod, false, currentDir
        fargs.push ->
          tasks.importDirProcess 'base', true, basePath
        fargs.push ->
          tasks.importDirProcess 'dpl', true, dplPath
        fargs.push ->
          tasks.importDirProcess 'sys', true, sysPath
        fargs.push ->
          grunt.file.recurse pagePath, (abspath, rootdir, subdir, filename) ->
            tasks.proPage abspath
        grunt.util.async.parallel fargs

      else if mod is 'page'
        tasks.proPage filepath
      else if mod is 'module'
        tasks.proModule filepath

    deploy = () ->
      
      execute = (command, callback) ->
        callback shell.exec(command,{silent:true}).output


      lastReleaseVersion = null
      versionCacheFile = 'versioncache.log'

      currentVersion = shell.exec("git log -1 --pretty=format:'%H'",{silent:true}).output
      

      if grunt.file.exists(versionCacheFile)
        lastReleaseVersion = grunt.file.read versionCacheFile

      if lastReleaseVersion

        execute "git diff "+currentVersion+".."+lastReleaseVersion+" --raw", (raw) ->
          if not raw
            return

          rawArr = raw.split("\n");
          console.log raw
          
          rawArr.forEach (line) ->
            if line
              lineArr = line.split(' ');
              fileArr = lineArr[4].split("\t");
              if fileArr[0] != 'D' and fileArr[1].indexOf(".styl") != -1
                filename = fileArr[1]
                filenameArr = filename.split("/")
                main filenameArr[filenameArr.length - 2],fileArr[1]
      else
        main 'import', 'styl/import/effect.styl'

      grunt.file.write versionCacheFile, currentVersion


    
    if not options.deploy
      main options.mod, options.filepath
    else
      deploy()

  return exports











