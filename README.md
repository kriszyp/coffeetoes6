Coffeetoes6 converts CoffeeScript to JavaScript, using newer EcmaScript functionality. Install it with:
```
	npm install -g coffeetoes6
```

There are several of these types of converters. This one works by first using the standard CoffeeScript compiler to convert to JavaScript, and then converting some of the verbose JavaScript output to use newer features. It is definitely not perfect, and any converted code must be reviewed. It can convert:
* Classes (with methods)
* Comment preservation (the CoffeeScript compiler usually loses them)
* require -> import statements
* Anonymous to fat arrow functions
* var -> let

Again, the output code will definitely need to be reviewed (as you should always do, to make sure you are using the most appropriate new features). There are a number of converters out there. This one works well for me, it is small, simple, and easy to hack on. Perhaps it will work for you.