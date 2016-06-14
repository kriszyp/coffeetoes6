"use strict"
const fs = require('fs')
const glob = require('glob')
const coffee = require('coffee-script')


exports.processFile = function(filename){

  let commentsToAdd = []
  let currentLevel
  function parseStringsAndComments(line, lineNumber) {
    return line.replace(/'(?:\s*\\.|[^'])*'|"(?:\\.|[^"])*"|#.+|[^'"#]*/g, (t) => {
      if (t[0] == "'") {
        return t
      } else if(t[0] == '"') {
        // convert double quotes to single
        return "'" + t.slice(1, -1).replace(/'/g, "\\'") + "'"
      } else if (t[0] == '#' && !(t[1] == '#' && t[2] == '#')) {
        // comment
        if(lineNumber > -1){
          commentsToAdd[lineNumber] = '//' + t.slice(1)
        }
        return ''
      } else {
        return t
      }
    })
  }
  function parse(line){
    return trailingWhiteSpace(
      callSpread(
        argumentSpread(
          boundMethods(
            nullCoalesce(
              indexOf(
                existentialPropertyAccess(
                  stringPropertyConvert(
                    void0ToUndefined(
                      forOf(
                        functionToFat(
                          objectMethodConvert(
                            methodConvert(
                              classConvert(
                                thisConvert(
                                  indexOfConvert(
                                    boundFunctionToFat(
                                      assignment(
                                        varToLet(
                                          semicolons(
                                            requireToImport(
                                              parseStringsAndComments(line))))))))))))))))))))))
  }
  function requireToImport(line) {
    return line
      .replace(/^(.*)=\s*require\(('(?:\s*\\.|[^'])*'|"(?:\\.|[^"])*")\)/g, (t, target, module) => {
        let variable = target.trim()
        consumeVariable(variable)
        return 'import ' + variable + ' from ' + module
      })
      .replace(/module\.exports = /, 'export default ')
  }
  function semicolons(line){
    return line.replace(/;(\s*)$/, (t, endingSpace) => endingSpace)
  }

  function varToLet(line){
    return line.replace(/var (.*)/, (t, variableString) => {
      getCurrentLevel().varLine = currentLineNumber
      getCurrentLevel().variables = variableString.split(/, ?/).filter((part) => part)
      return 'let ' + variableString
    })
  }

  function assignment(line){
    return line.replace(/^(\s*)(\w+) =/g, (t, indentation, variable) => {
      if (consumeVariable(variable)) {
        return indentation + (variable.match(/[a-z]/) ? 'let ' : 'const ') + variable + ' ='
      } else{
        return t
      }
    })
  }
  function consumeVariable(variable){
    let level = getCurrentLevel()
    let varLine = level.varLine
    let variables = level.variables
    if (variables) {
      let position = variables.indexOf(variable)
      if (position > -1) {
        variables.splice(position, 1)
        if (variables.length > 0) {
          lines[varLine] = level.indentation + 'let ' + variables.join(', ')
        } else {
          lines[varLine] = undefined
        }
        return true
      }
    }
  }
  function trailingWhiteSpace(line){
    return line.replace(/\s+$/, '')
  }
  function thisConvert(line) {
    return line.replace(/_this/g, 'this')
  }
  let lastFatArrow
  function boundFunctionToFat(line) {
    return line.replace(/\(function\(_this\) \{/, (t) => {
      lastFatArrow = currentLineNumber
      return ''
    }).replace(/return function(\([^\)]*\))/, (t, args) => {
      if (lastFatArrow + 1 === currentLineNumber) {
        return args + ' =>'
      }
      return t
    }).replace(/^\s*\}\)\(this\)/, () => '--empty--')
  }
  function functionToFat(line) {
    return line.replace(/function(\([^\)]*\)) \{/g, (t, args) => {
      // TODO: actually verify that `this` is used correctly in function
      if (args.length > 2 && args.indexOf(',') === -1) {
        // single arg doesn't need paranthesis
        return args.slice(1, -1) + ' => {'
      }
      return args + ' => {'
    })
  }


  function forOf(line) {
    return line.
    replace(/\s*(ref\d*) = (.*)/, (t, ref, expression) => {
      let currentLevel = getCurrentLevel()
      currentLevel.forOfRefLine = currentLineNumber
      currentLevel.forOfRefName = ref
      currentLevel.forOfRefExpression = expression
      return t
    }).replace(/for \((\w) = 0, (len\d*) = (\w+)\.length; \w < len\d*; \w\+\+\)/, (t, i, len, array) => {
      consumeVariable(i)
      consumeVariable(len)
      let currentLevel = getCurrentLevel()
      currentLevel.arrayName = array
      if (currentLevel.forOfRefName === array) {
        lines[currentLevel.forOfRefLine] = '--empty--'
        array = currentLevel.forOfRefExpression
      }
      currentLevel.forOfLine = currentLineNumber
      currentLevel.iName = i
      return 'for (let __value__ of ' + array + ')'
    }).replace(/\s+(\w+) = (\w+)\[(\w+)\]/, (t, item, array, i) => {
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.arrayName === array && parentLevel.iName === i) {
        lines[parentLevel.forOfLine] = lines[parentLevel.forOfLine].replace(/__value__/, item)
        return '--empty--'
      }
      return t
    })
  }

  function existentialPropertyAccess(line) {
    let needsProcessing = true
    while(needsProcessing) {
      needsProcessing = false
      line = line.replace(/\((ref\d*) = ([^\)]+)\) != null \? ref\d*\.(\w+) : undefined/g, (t, ref, expression, property) => {
        consumeVariable(ref)
        needsProcessing = true
        return expression + ' && ' + expression + '.' + property
      })
    }
    return line
  }

  function nullCoalesce(line) {
    return line.replace(/\((ref\d*) = ([^\)]+)\) != null \? ref\d* :/, (t, ref, expression) => {
      consumeVariable(ref)
      return expression + ' ||'
    })
  }

  function indexOf(line) {
    return line.replace(/(ref\d*) = ([^,]+), (.+)\.indexOf\(ref\d*\) >= 0/, (t, ref, item, array) => {
      consumeVariable(ref)
      return array + '.indexOf(' + item + ') >= 0'
    })
  }


  function classConvert(line){
    return line.replace(/let (\w+) = \(function\((superClass)?\) \{/, (t, className) => {
      let line = sourceMap.lines[currentLineNumber]
      if (line && line.columns.some((column) => {
        let sourceLine = sourceLines[column.sourceLine]
        return sourceLine && sourceLine.indexOf('class ') > -1
      })) {
        getCurrentLevel().className = className
        getCurrentLevel().classLine = currentLineNumber
        return '\nclass ' + className + ' {'
      }
      return t
    })
      .replace(/\s+extend = function\(child, parent\).*/, '--empty--')
      .replace(/\s+extend\([\w\.]+, superClass\).*/, '--empty--')
      .replace(/\s+hasProp = \{\}.hasOwnProperty.*/, '--empty--')
      .replace(/\}\)\(([\w\.]*)\)/, (t, baseClassName) => {
        let level = getCurrentLevel()
        if(level.className){
          if (baseClassName) {
            lines[level.classLine] = lines[level.classLine].slice(0, -1) + 'extends ' + baseClassName + ' {'
          }
          level.className = null
          return '}'
        }
        return t
      })
  }
  function methodConvert(line) {
    return line.replace(/(\w+)\.prototype\.(\w+) = function(\([^\)]*\))/, (t, className, methodName, methodArgs) => {
      // a method
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.className === className) {
        parentLevel.lastMethodArgs = methodArgs
        getCurrentLevel().lastMethodLine = currentLineNumber
        return methodName + methodArgs
      }
      return t
    }).replace(/(\w+)\.prototype\.(\w+) = (.+)/, (t, className, propertyName, value) => {
      // a property
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.className === className) {
        return 'get ' + propertyName + '() { return ' + value + ' }'
      }
      return t
    }).replace(/(\w+)\.(\w+) = function(\([^\)]*\))/, (t, className, methodName, methodArgs) => {
      // a static method
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.className === className) {
        parentLevel.lastMethodArgs = methodArgs
        return 'static ' + methodName + methodArgs
      }
      return t
    }).replace(/(\w+)\.(\w+) = (.+)/, (t, className, propertyName, value) => {
      // a static property
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.className === className) {
        return 'static get ' + propertyName + '() { return ' + value + ' }'
      }
      return t
    }).replace(/(\w+)\.__super__\.(\w+)\.apply\(this, arguments\)/, (t, className, methodName, value) => {
      // super call with implied arguments
      let i = 1
      let parentLevel
      let lastMethodArgs
      while ((parentLevel = indentationLevels[indentationLevels.length - ++i])) {
        lastMethodArgs = lastMethodArgs || parentLevel.lastMethodArgs
        if (parentLevel.className === className) {
          if (methodName === 'constructor') {
            return 'super(...arguments)'
          } else {
            return 'super.' + methodName + lastMethodArgs
          }
        }
      }
      return t
    }).replace(/(\w+)\.__super__\.(\w+)\.call\(this,? ?([^\)]*)\)/, (t, className, methodName, args, value) => {
      // super call with explicit arguments
      let i = 1
      let parentLevel
      let lastMethodArgs
      while ((parentLevel = indentationLevels[indentationLevels.length - ++i])) {
        lastMethodArgs = lastMethodArgs || parentLevel.lastMethodArgs
        if (parentLevel.className === className) {
          if (methodName === 'constructor') {
            return 'super(' + args + ')'
          } else {
            return 'super.' + methodName + '(' + args + ')'
          }
        }
      }
      return t
    }).replace(/function (\w+)(\([^\)]*\))/, (t, className, constructorArgs) => {
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.className === className) {
        parentLevel.lastMethodArgs = constructorArgs
        return 'constructor' + constructorArgs
      }
      return t
    }).replace(/\s+return (\w+)$/, (t, className) => {
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.className === className) {
        return '--empty--'
      }
      return t
    })
  }

  function objectMethodConvert(line) {
    return line.replace(/(\w+):\s*function/, (t, methodName) => {
      // a method
      return methodName
    })
  }

  function indexOfConvert(line) {
    return line
      .replace(/\s+indexOf = \[\]\.indexOf \|\| .*/, '--empty--')
      .replace(/indexOf\.call\(([^,]+), ([^\)]+)\) >= 0/g, (t, array, item) => {
        return array + '.indexOf(' + item + ') >= 0'
      })
  }
  function stringPropertyConvert(line) {
    return line.replace(/(\w+)\['(\w+)'\]/g, (t, object, property) => {
      return object + '.' + property
    })
  }
  function void0ToUndefined(line) {
    return line.replace(/void 0/g, 'undefined')
  }

  function boundMethods(line) {
    return line.replace(/  bind = function\(fn, me\)\{ return function\(\)\{ return fn\.apply\(me, arguments\); \}; \},?/, '--empty--')
      .replace(/\s*this\.(\w+) = bind\(this\.\w+, this\)/g, (t, method) => {
        boundMethodNames[method] = true
        return '--empty--'
      }).replace(/this\.(\w+)([^\(\w])/g, (t, method, nextChar) => {
        if (boundMethodNames[method]) {
          return 'this.' + method + '.bind(this)' + nextChar
        }
        return t
      })
  }

  function getCurrentVariables() {
    let currentLevel = getCurrentLevel()
    return currentLevel.variables || (currentLevel.variables = {})
  }
  function getCurrentLevel() {
    return indentationLevels[indentationLevels.length - 1]
  }
  function getParentLevel() {
    return indentationLevels[indentationLevels.length - 2]
  }
  function postProcess(js) {
    return trailingSpaceBeforeBracket(
      removeEmptyConstructors(
        collapseFatArrowExpression(js)))
  }
  function removeEmptyConstructors(js) {
    return js.replace(/constructor\(\)\s\{\s+return super\(\.\.\.arguments\)\s+\}\s+/g, '')
  }
  function trailingSpaceBeforeBracket(js) {
    return js.replace(/\n+\}/g, '\n}')
  }
  function collapseFatArrowExpression(js) {
    return js.replace(/ => \{\n\s*return (.+)\n\s*}/g, (t, expression) => ' => ' + expression)
  }

  function argumentSpread(js) {
    return js.replace(/let (\w+) = 1 <= arguments\.length \? slice\.call\(arguments, (\d)\) : \[\]/, (t, variable, index) => {
      let parentLevel = getParentLevel()
      let lastMethodLine = parentLevel.lastMethodLine
      if (lastMethodLine > 0) {
        lines[lastMethodLine] = lines[lastMethodLine].replace(/\)/, '...' + variable + ')')
        return ''
      }
      return t
    })

  }

  function callSpread(js) {
    return js.replace(/(\w+).apply\(\w+, \[([^\]]+)\]\.concat\(slice.call\((\w+)\)\)\)/, (t, func, firstArgs, args) => {
      return func + '(' + firstArgs + ', ...' + args + ')'  
    }).replace(/(\w+).apply\(\w+, (\w+)\)/, (t, func, args) => {
      return func + '(...' + args + ')'
    }).replace(/\s+slice = \[\]\.slice.*/, '--empty--')
  }

  let boundMethodNames = {}
  let onNextIndent
  let coffeeContents = fs.readFileSync(filename, 'utf8')
  let sourceLines = coffeeContents.split(/\r?\n/)
  sourceLines.forEach(parseStringsAndComments)

  let compileResults = coffee.compile(coffeeContents, {
    bare: true,
    header: false,
    sourceMap: true
  })
  let jsContents = compileResults.js
  let sourceMap = compileResults.sourceMap

  let lines = jsContents.split(/\r?\n/)
  let indentationLevels = [{
    indentation: ''
  }]
  let lastIndentation = ''
  let newLines = []
  let lastNonEmptyLine = 0
  let lastLine
  let lastLineIsCall
  let currentLineNumber
  let inComments = false
  lines.forEach((line, lineNumber) => {
    try {
      if (line.match(/\s*\/\*/)) {
        inComments = true
      }
      if (!inComments) {
        let indentation = ''
        currentLineNumber = lineNumber
        let afterIndent = line.replace(/^[ \t]+/, (t) => {
          indentation = t
          return ''
        })
        if (!afterIndent) {
          return
        }
        if (indentation.length > lastIndentation.length) {
          indentationLevels.push(currentLevel = {
            indentation: indentation
          })
          if (onNextIndent) {
            onNextIndent()
            onNextIndent = null
          }
        } else if (indentation.length < lastIndentation.length) {
          do {
            indentationLevels.pop()
            currentLevel = indentationLevels[indentationLevels.length - 1]
          } while (currentLevel.indentation != indentation && indentationLevels.length > 0)
        } else {
          if (currentLevel){
            currentLevel.lastLine = lastLine
          }
        }
        line = parse(line)
        lastNonEmptyLine = newLines.length
        lastIndentation = indentation
      }
      lastLine = line
      lines[lineNumber] = line
      if (line.match(/\s*\*\//)) {
        inComments = false
      }
    } catch (error) {
      console.error(error, 'on line', lineNumber, line, 'in', filename)
    }
  })

  let offset = 0
  for (let targetLineNumber = 0, sourceLineNumber = 0; sourceLineNumber < commentsToAdd.length; sourceLineNumber++){
    let commentToAdd = commentsToAdd[sourceLineNumber]
    if (commentToAdd) {
      let found = false
      while (!found) {
        let line = sourceMap.lines[targetLineNumber]
        if (line) {
          found = line.columns.some((column) => {
            if (column) {
              if (column.sourceLine === sourceLineNumber) {
                lines[targetLineNumber + offset] = (lines[targetLineNumber + offset] || '') + ' ' + commentToAdd
                return true
              } else if (column.sourceLine > sourceLineNumber) {
                let lastLine = lines[targetLineNumber + offset] || ''
                lines.splice(targetLineNumber + offset++, 0, lastLine.replace(/\S.*/, '') + commentToAdd)
                return true
              }
            }
          })
        } else {
          if (targetLineNumber > sourceMap.lines.length) {
            lines.push(commentToAdd)
            found = true
          }
        }
        if(!found){
          targetLineNumber++
        }
      }
    }
  }
  lines.forEach((line, lineNumber) => {
    let lastLine = lines[lineNumber - 1]
    if (line && line.startsWith('--empty--')) {
      let afterEmpty = line.slice(line.indexOf('--empty--') + 9)
      if (afterEmpty) {
        lines[lineNumber - 1] = (lastLine || '') + afterEmpty // collect everything after the --empty-- and put it on the last line
      }
      lines[lineNumber] = undefined
    }
    if (line == '') {
      // eliminate the extra lines at the top level
      if (lastLine && !lastLine.match(/^\s/)) {
        lines[lineNumber] = undefined
      }
    }
  })
  while(!lines[0]) {
    // remove initial empty lines
    lines.shift()
  }
  let jsOutput = lines.filter((line) => typeof line == 'string').join('\n')

  jsOutput = postProcess(jsOutput)
  fs.writeFileSync(filename.replace(/\.coffee/, '.js'), jsOutput, 'utf8')
}

exports.run = function(args){
  glob(args[0], (error, filenames) => {
    if (error) {
      return console.error(error)
    }
    if (!filenames) {
      console.log(args[0], 'not found')
    }
    filenames.forEach(exports.processFile)
  })
}
