"use strict"
const fs = require('fs')
const coffee = require('coffee-script')

exports.run = function(args){

  function requireToImport(next) {
    return (line) =>
      next(line
        .replace(/^(.*)=\s*require\s*('(?:\\.|[^'])*'|"(?:\\.|[^"])*")/g, (t, target, path) => '`import ' + target.trim() + ' from ' + path + '`')
        .replace(/module\.exports = (\w+)/, (t, name) => '`export default ' + name + '`')
        )
  }
  function classMarker(line){
    return line.replace(/class\s+(\w+)\s+(?:extends\s*(\w+))/, (t, className, baseClass) =>
      ''
  }
  function parseStringsAndComments(next) {
    return (line) => {
      return line.replace(/'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|#.+|[^'"#]*/g, (t) => {
        if (t[0] == "'") {
          return t // plain string
        } else if(t[0] == '"') {
          // template
          return '`' + t.slice(1, t.length - 1).replace(/#\{([^}]*)\}/g, (t, expression) => '${' + next(expression) + '}') + '`'
        } else if (t[0] == '#') {
          // comment
          return '//' + t.slice(1)
        } else {
          return next(t)
        }
      })
    }
  }
  function removeSemicolons(line) {
    return line.replace(/;$/, '')
  }
  function methods(next) {
    return (line) =>
      next(line.replace(/\w+.prototype.(\w+) = function/, (t, methodName) => methodName))
  }
  function restoreExtendingClass(line) {
    line.replace(/(\w+) = \(function\(superClass\) \{\s*extend((\w+), superClass);/, (t, className) => {
      let baseClass = ''
      currentLevel.modify = (line) =>
        line.replace(/})\((\w+)\);/, (t, className) =>
          baseClass = className)
      return {
        toString() {
          return 'class ' + className + ' extends ' + baseClass
        }
      }
    })
  }

  function operators(next) {
    return (line) =>
      next(line
        .replace(/\sand\s/g, ' && ')
        .replace(/\sis\s/g, ' === ')
        .replace(/\sor\s/g, ' || ')
        .replace(/\sisnt\s/g, ' !== ')
        .replace(/\snot\s/g, ' ! ')
        .replace(/unless\s/g, 'if !')
      )
  }
  function varToLet(line) {
    return line.replace(/var /, 'let ')
  }
  function assignment(line) {
    line.replace(/(\w*)\s*=/, (t, variable) => {
      let level
      for(var i = 0; i < indentationLevels.length; i++) {
        level = indentationLevels[i]
        if (level.variables && level.variables[variable]) {
          return t
        }
      }
      (level.variables || (level.variables = {}))[variable] = true
      return 'let ' + t
    })
  }
  function identity(line) {
    return line
  }

  function getCurrentVariables() {
    let currentLevel = getCurrentLevel()
    return currentLevel.variables || (currentLevel.variables = {})
  }
  function getCurrentLevel() {
    return indentationLevels[indentationLevels.length - 1]
  }
  let filename = args[0]
  let coffeeContents = fs.readFileSync(filename, 'utf8')
  let jsContents = coffee.compile(coffeeContents, {
    bare: true,
    header: false,
    sourceRoot: false
  })

  jsContents
  let lines = jsContents.split(/\r?\n/)
  let indentationLevels = [{
    indentation: ''
  }]
  let lastIndentation = ''
  let newLines = []
  let parser = parseStringsAndComments(methods(atThis(skinnyToFat(requireToImport(operators(identity))))))
  lines.forEach((line, lineNumber) => {
    let indentation = ''
    let afterIndent = line.replace(/^[ \t]+/, (t) => {
      indentation = t
      return ''
    })
    if (!afterIndent) {
      newLines.push('')
      return
    }
    if (indentation.length > lastIndentation.length) {
      indentationLevels.push({
        indentation: indentation
      })
    } else if (indentation.length < lastIndentation.length) {
      let level
      do {
        indentationLevels.pop()
        level = indentationLevels[indentationLevels.length - 1]
        if (!level) {
          throw new SyntaxError('outdent error on line ' + (lineNumber + 1))
        }
        if(level.modify){
          line = level.modify(line)
        }
      } while (level.indentation != indentation)
      indentationLevels.push({
        indentation: indentation
      })
    }
    line = parser(line)
    newLines.push(line)
    lastIndentation = indentation
  })
  fs.writeFileSync(filename.replace(/\.coffee/, '.js'), newLines.join('\n'), 'utf8')
}
