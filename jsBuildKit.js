load("tools/jsContract.js");
load("tools/jslint.js");
/**
 * The applications 'main'
 */
(function(a) {
	var input, output;
	var options = {
		jslint: true,
		jscontract: true
	};

	if (!a[0]) {
        print("Usage: jsBuildKit.js file.js");
        quit(1);
    }
    input = readFile(a[0]);
    if (!input) {
        print("jsBuildKit: Couldn't open file '" + a[0] + "'.");
        quit(1);
    }
	
	output = input;
	
	// JSLint
	if (options.jslint) {
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
		output = Contract.instrument(output);
	}

	quit();
})(arguments);