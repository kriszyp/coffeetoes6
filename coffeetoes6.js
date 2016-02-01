"use strict"
const fs = require('fs')
const coffee = require('coffeescript')


exports.run = function(args){

  let commentsToAdd = []
  let nextId = 1
  let currentLevel
  function parseStringsAndComments(line, lineNumber) {
    return line.replace(/'(?:\s*\\.|[^'])*'|"(?:\\.|[^"])*"|#.+|[^'"#]*/g, (t) => {
      if (t[0] == "'") {
        return t
      } else if(t[0] == '"') {
        // template
        return t
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
    return trailingWhiteSpace(void0ToUndefined(methodConvert(classConvert(thisConvert(functionToFat(assignment(varToLet(semicolons(requireToImport(parseStringsAndComments(line)))))))))))
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
          console.log('reassigning', varLine, level.indentation + 'let ' + variables.join(', '))
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
  function functionToFat(line) {
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

  function classConvert(line){
    return line.replace(/let (\w+) = \(function\(superClass\) \{/, (t, className) => {
      getCurrentLevel().className = className
      getCurrentLevel().classLine = currentLineNumber
      return 'class ' + className + ' {'
    })
      .replace(/\s+extend = function\(child, parent\).*/, '--empty--')
      .replace(/\s+extend\(\w+, superClass\).*/, '--empty--')
      .replace(/\s+hasProp = \{\}.hasOwnProperty.*/, '--empty--')
      .replace(/\}\)\((\w+)\)/, (t, baseClassName) => {
        let level = getCurrentLevel()
        if(level.className){
          lines[level.classLine] = lines[level.classLine].slice(0, -1) + 'extends ' + baseClassName + ' {'
          level.className = null
          return '}'
        }
        return t
      })
  }
  function methodConvert(line) {
    return line.replace(/(\w+)\.prototype\.(\w+) = function/, (t, className, methodName) => {
      // TODO: check class name
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.className === className) {
        return methodName
      }
      return t
    }).replace(/function (\w+)\(/, (t, className) => {
      let parentLevel = getParentLevel()
      if (parentLevel && parentLevel.className === className) {
        return 'constructor('
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
  function void0ToUndefined(line) {
    return line.replace(/void 0/g, 'undefined')
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
  let filename = args[0]
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
  lines.forEach((line, lineNumber) => {
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
    lastLine = line
    lines[lineNumber] = line
    lastIndentation = indentation
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
                lines[targetLineNumber + offset] += ' ' + commentToAdd
                return true
              } else if (column.sourceLine > sourceLineNumber) {
                let lastLine = lines[targetLineNumber + offset]
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
    console.log(lineNumber, line)
    if (line && line.startsWith('--empty--')) {
      console.log('empty line' ,line)
      let afterEmpty = line.slice(line.indexOf('--empty--') + 9)
      if (afterEmpty) {
        lines[lineNumber - 1] = (lines[lineNumber - 1] || '') + afterEmpty // collect everything after the --empty-- and put it on the last line
      }
      lines[lineNumber] = undefined
    }
  })
  let jsOutput = lines.filter((line) => typeof line == 'string').join('\n')

  fs.writeFileSync(filename.replace(/\.coffee/, '.js'), jsOutput, 'utf8')
}
