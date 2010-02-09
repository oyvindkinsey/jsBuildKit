function writeFile(content, file, encoding){
    var out = new java.io.BufferedWriter(new java.io.FileWriter(file));
    out.write(content);
    out.close();
}

/**
 * The applications 'main'
 */
(function(a){
    var inputFile, outputFileBase;
    var input, output;
    var options = {
        jslint: true,
        jscontract: true,
        jsbeautify: true
    };
    
    if (!a[0]) {
        print("Usage: jsBuildKit.js input.js");
        quit(1);
    }
    inputFile = a[0];
    input = readFile(inputFile);
    if (!input) {
        print("jsBuildKit: Couldn't open file '" + a[0] + "'.");
        quit(1);
    }
    
    output = input;
    
    if (inputFile.substring(inputFile.length - 3) === ".js") {
        outputFileBase = inputFile.substring(0, inputFile.length - 3);
    }
    else {
        outputFileBase = inputFile;
    }
    
    // JSLint
    if (options.jslint) {
        load("tools/fulljslint.js");
        if (!JSLINT(input, {
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
    
    // jsContract
    if (options.jscontract) {
        load("tools/jsContract.js");
        output = Contract.instrument(output);
    }
    
    // js-beautify
    if (options.jsbeautify) {
        load('tools/js-beautify/beautify.js');
        output = js_beautify(output, {
            indent_size: 4,
            indent_char: " ",
            space_after_anon_function: true
        });
    }
    writeFile(output, outputFileBase + ".out.js");
    quit();
})(arguments);
