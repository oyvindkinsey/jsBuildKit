/*jslint evil: true, rhino: true, immed: true, passfail: true, undef: true, newcap: true*/
/*global java, importPackage, Packages, ErrorReporter, EvaluatorException, readFile, print, quit, load,
 JSLINT, js_beautify, Contract,JavaScriptCompressor
 */
importPackage(Packages.com.yahoo.platform.yui.compressor);
importPackage(Packages.org.mozilla.javascript);

/**
 *
 * @param {String} content The string to write
 * @param {String} file The path to output the string to
 */
function writeFile(content, file){
    var out = new java.io.BufferedWriter(new java.io.FileWriter(file));
    out.write(content);
    out.close();
}

/**
 *
 * @param {String} input The script to transform
 * @param {String} symbol The symbol that should be checked for
 * @return {String} The transformed script
 */
function ifdef(input, symbol){
    var block, match, eMatch;
    var reBlock = /^\s*\/\/\ #ifdef [\s\S]+?\/\/ #endif$/gm, reElse = /^\s*\/\/ #else$/m, reMatch = new RegExp("^\\s*\\/\\/\\ #ifdef .*?\\b" + symbol + "\\b.*?$", "mg");
    var ifPart, elsePart;
    while ((match = reBlock.exec(input))) {
        ifPart = elsePart = "";
        block = match[0];
        if ((eMatch = reElse.exec(block))) {
            ifPart = block.substring(0, eMatch.index);
            elsePart = block.substring(eMatch.index + eMatch[0].length);
        }
        else {
            ifPart = block;
        }
        block = (reMatch.test(block) ? ifPart : elsePart).replace(/^\s*\/\/ #.*?$/mg, "");
        input = input.substring(0, match.index - 1) + block + input.substring(match.index + match[0].length + 1);
    }
    return input;
}

/**
 *
 * @param {String} input The script to compress
 * @return {String} A compressed version of the script
 */
function YUICompress(input){
    var reader = new java.io.StringReader(input);
    
    var er = new ErrorReporter({
        warning: function(message, sourceName, line, lineSource, lineOffset){
            if (line < 0) {
                print("[WARNING] " + message);
            }
            else {
                print("[WARNING] " + line + ':' + lineOffset + ':' + message);
            }
        },
        error: function(message, sourceName, line, lineSource, lineOffset){
            if (line < 0) {
                print("[ERROR] " + message);
            }
            else {
                print("[ERROR] " + line + ':' + lineOffset + ':' + message);
            }
        },
        runtimeError: function(message, sourceName, line, lineSource, lineOffset){
            this.error(message, sourceName, line, lineSource, lineOffset);
            return new EvaluatorException(message);
        }
    });
    
    var compressor = new JavaScriptCompressor(reader, er);
    var out = new java.io.StringWriter();
    var munge = true;
    var preserveAllSemiColons = true;
    var disableOptimizations = false;
    var linebreakpos = -1;
    var verbose = true;
    compressor.compress(out, linebreakpos, munge, verbose, preserveAllSemiColons, disableOptimizations);
    return out.toString();
}

/**
 * The applications 'main'
 */
(function(a){
    var inputFile, outputFileBase;
    var products = {
        plain: ""
    }, temp, version;
    
    var options = {
        jslint: true,
        jscontract: true,
        jsbeautify: true,
        yuicompress: true,
        debug: false
    };
    
    if (!a[0]) {
        print("Usage: jsBuildKit.js input.js");
        quit(1);
    }
    inputFile = a[0];
    products.plain = readFile(inputFile);
    if (!products.plain) {
        print("jsBuildKit: Couldn't open file '" + a[0] + "'.");
        quit(1);
    }
    
    if (inputFile.substring(inputFile.length - 3) === ".js") {
        outputFileBase = inputFile.substring(0, inputFile.length - 3);
    }
    else {
        outputFileBase = inputFile;
    }
    
    if (options.jscontract) {
        load("tools/jsContract.js");
    }
    if (options.jsbeautify) {
        load('tools/js-beautify/beautify.js');
    }
	/**
     * step one, check input
     */
    // JSLint
    if (options.jslint) {
        load("tools/fulljslint.js");
        if (!JSLINT(products.plain, {
            eqeqeq: true, // only === and !==
            browser: true,
            immed: true, // parens around invocations
            newcap: true,
            undef: true
        })) {
            for (var i = 0; i < JSLINT.errors.length; i += 1) {
                var e = JSLINT.errors[i];
                if (e) {
                    print('jslint: Lint at line ' + e.line + ' character ' +
                    e.character +
                    ': ' +
                    e.reason);
                    print((e.evidence || '').replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1"));
                    print('');
                }
            }
            quit(2);
        }
        else {
            print("jslint: No problems found in " + a[0]);
        }
    }
    
    /**
     * step two, separate input into plain/debug
     */
    if (options.debug) {
        products.debug = ifdef(products.plain, "debug");
    }
    
    /**
     * step three, run preprocessing on all
     */
    temp = {};
    for (version in products) {
        // jsContract
        if (options.jscontract) {
            temp[version + ".contract"] = Contract.instrument(products[version]);
        }
    }
    for (version in temp) {
        products[version] = temp[version];
    }
    
    /**
     * step four, run postprocessing on all
     */
    temp = {};
    for (version in products) {
        // js-beautify
        if (options.jsbeautify) {
            products[version + ".beautified"] = js_beautify(products[version], {
                indent_size: 4,
                indent_char: " ",
                space_after_anon_function: true
            });
        }
        // YUICompress
        if (options.yuicompress) {
            writeFile(products[version], "temp.js");
            products[version + ".min"] = YUICompress(products[version]);
        }
    }
    for (version in temp) {
        products[version] = temp[version];
    }
    
    /**
     * step five, output the producs
     */
    for (version in products) {
        writeFile(products[version], outputFileBase + "." + version + ".js");
    }
    
    quit();
})(arguments);
