var fs = require('fs');
/********************************/
/* test fuctions                */
/********************************/

function check_throw(a) {
    if (!does_it_throw(a))
        throw new Error('Statement did not throw, but its expected to throw');
}

function check_no_throw(a) {
    if (does_it_throw(a))
        throw new Error('statement is not expected to throw, but throwed');
}

function does_it_throw(a) {
    var throwed = false;
    try {
        a();
        throwed = false;
    } catch(e) {
        throwed = true;
    }
    return throwed;
}

function check_parse_ref_json(parses_json, ref_json) {
    ref_obj = JSON.parse(ref_json);
    parses_obj = JSON.parse(parses_json);
    ref_cmp = JSON.stringify(ref_obj);
    parses_cmp = JSON.stringify(parses_obj);
    if (ref_cmp != parses_cmp)
        throw new Error('Expecting reference to be the same as parse, but they were different')
}

/********************************/
/* Initialization               */
/********************************/
var argv = process.argv;

// checking for command line arguments
if (argv.length != 4) {
    console.log('Incorrect number of command line arguments');
    console.log('Usage: node e2e_tests.js full_path_to_dir_containing_jsjibonlu full_path_to_datadir')
    console.log('Example: node e2e_tests.js /Users/my_user/my_directory_containig_jsjibonlu/ /Users/my_user/my_directory/data');
    process.exit(1);
}

// gteting install prefix
var install_prefix = argv[2];
var datadir = argv[3];

// Loading jsjibonlu library
var jsjibonlu = require(install_prefix + '/jsjibonlu');

/********************************/
/* Compiling tests              */
/********************************/

// good rule format 
var grm = 'TopRule = aa;'
var f = function()  {jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");};
check_no_throw(f);

// bad number of argumets
var f = function()  {jsjibonlu.compile_fst_from_text(grm);};
check_throw(f);

// bad number of argumets
var f = function()  {jsjibonlu.compile_fst_from_text("handle:my_handle");};
check_throw(f);

// bad argument types 
var f = function()  {jsjibonlu.compile_fst_from_text("handle:my_handle", grm);};
check_throw(f);

// bad argument types 
var f = function()  {jsjibonlu.compile_fst_from_text(grm, "handle:my_handle", 3);};
check_throw(f);

// bad argument types 
var f = function()  {jsjibonlu.compile_fst_from_text(grm, "handle:my_handle", "/filepath/file.rule");};
check_no_throw(f);

// bad rule format
var f = function()  {jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");};
grm = 'TopRule = aa';
check_throw(f);

// referencing factory rule
grm = 'TopRule = $factory:date;'
check_no_throw(f)

/********************************/
/* Parsing                      */
/********************************/

// bad number of arguments
grm = "TopRule = aa{nl='aa'};";
txt = "aaa"
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst, fst);};
check_throw(f)

// incorrect argument type
// bad number of arguments
grm = "TopRule = aa{nl='aa'};";
txt = "aaa"
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser('a');};
check_throw(f)

// correct call
grm = "TopRule = aa{nl='aa'};";
txt = "aaa"
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst);};
check_no_throw(f)

// incorrect argument type
// bad number of arguments
grm = "TopRule = aa{nl='aa'};";
txt = "aaa";
parses_json = '';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst);parses_json = parser.parse_sentence(txt,txt);};
check_throw(f)

// incorrect argument type 
grm = "TopRule = aa{nl='aa'};";
txt = "aaa";
parses_json = '';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst);parses_json = parser.parse_sentence(fst);};
check_throw(f)

// correct parse 
grm = "TopRule = aa{nl='aa'};";
txt = "aaa";
parses_json = '';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst);parses_json = parser.parse_sentence(txt)};
check_no_throw(f)

// empty parse
grm = "TopRule = aa{nl='aa'};";
txt = "aaa";
parses_json = '';
ref_json = '[]';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt)};
check_no_throw(f)
check_parse_ref_json(parses_json, ref_json);

// some parse 
grm = "TopRule = aa{nl='aa'};";
txt = "aa";
parses_json = '';
ref_json = '[{"Input":"aa", "NLParse":{"nl":"aa"}, "heuristic_score":3, "index":0}]';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt)};
check_no_throw(f)
check_parse_ref_json(parses_json, ref_json);

// error with factory, unset data dir 
grm = "TopRule = $factory:date{date=date._date_nl};";
txt = "aa";
parses_json = '';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt)};
check_throw(f)

// setting the dat_dir
jsjibonlu.remove_from_memory('handle:my_handle');
jsjibonlu.set_data_dir(datadir);

/********************************/
/* num_fsts_in_mem              */
/********************************/

// incorrect call
var f = function() {num_of_fsts_at_start = jsjibonlu.num_fsts_in_mem(3);}
check_throw(f);

// incorrect call
var f = function() {num_of_fsts_at_start = jsjibonlu.num_fsts_in_mem('hi');}
check_throw(f);

// correct call
var f = function() {num_of_fsts_at_start = jsjibonlu.num_fsts_in_mem();}
check_no_throw(f);

// error with unknown factory, data dir is set 
grm = "TopRule = $factory:datedate{date=datedate._date_nl};";
txt = "aa";
parses_json = '';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt)};
check_throw(f)

// error with known factory, unknown nl var
grm = "TopRule = $factory:date{mydate=b};";
txt = "july 29th 1995";
parses_json = '';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt);};
check_throw(f);

// no error 
grm = "TopRule = $factory:date{date=date._date_nl};";
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}]';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt)};
check_no_throw(f)
check_parse_ref_json(parses_json, ref_json);

/********************************/
/* saving fst                   */
/********************************/

// wrong number of arguments
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");fst.save_fst("my_fst_file.fst", 1)};
check_throw(f)

// wrong type of argument 
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");fst.save_fst(1)};
check_throw(f)

// correct call 
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");fst.save_fst("my_fst_file.fst")};
check_no_throw(f)

/********************************/
/* opening fst file             */
/********************************/

// incorrect number of arguments
var f = function()  {fst = jsjibonlu.read_fst_from_uri("file:my_fst_file.fst", 1);};
check_throw(f)

// wrong type of arguments 
var f = function()  {fst = jsjibonlu.read_fst_from_uri(1);};
check_throw(f)

// non existing file type of arguments 
var f = function()  {fst = jsjibonlu.read_fst_from_uri("file:my_fst_file2.fst");};
check_throw(f)

// correct call 
var f = function()  {fst = jsjibonlu.read_fst_from_uri("file:my_fst_file.fst");};
check_no_throw(f)

/********************************/
/* parsingfrom fst file         */
/********************************/

// correct call 
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}]';
var f = function()  {fst = jsjibonlu.read_fst_from_uri("file:my_fst_file.fst");parser = jsjibonlu.build_sentence_parser(fst);parses_json = parser.parse_sentence(txt);};
check_no_throw(f);
check_parse_ref_json(parses_json, ref_json);


/********************************/
/* parsingfrom fst in memory    */
/********************************/

// trying to parse from a removed handle from memory 
grm = "TopRule = $factory:date{date=date._date_nl};";
txt = "july 29th 1995"
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}]';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");fst1 = jsjibonlu.read_fst_from_uri("handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst1);parses_json = parser.parse_sentence(txt);};
check_no_throw(f)
check_parse_ref_json(parses_json, ref_json);


/************************************/
/* parsing several fsts in parallel */
/************************************/

// correct call 
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}, {"Input":"july 29th 1995", "NLParse":{"july":"july"}, "heuristic_score":5, "index":1}]';
second_rule = 'TopRule = $* july {july = \'july\'} $*;';
var f = function()  {fst1 = jsjibonlu.read_fst_from_uri("file:my_fst_file.fst");fst2 = jsjibonlu.compile_fst_from_text(second_rule, "handle:my_handle");arr=[fst1, fst2];parser = jsjibonlu.build_sentence_parser(arr);parses_json = parser.parse_sentence(txt);};
check_no_throw(f);
check_parse_ref_json(parses_json, ref_json);

/************************************/
/* reading from fst file            */
/************************************/

// correct call 
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}]';
var f = function()  {
    fst = jsjibonlu.load_fst_from_fst_file("./my_fst_file.fst", "handle:my_handle_from_fst_file");
    parser = jsjibonlu.build_sentence_parser(fst);
    parses_json = parser.parse_sentence(txt);
};
f();
check_no_throw(f);
check_parse_ref_json(parses_json, ref_json);

// correct call, testing handle
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}]';
var f = function()  {
    fst = jsjibonlu.load_fst_from_fst_file("./my_fst_file.fst", "handle:my_handle_from_fst_file_2");
    fst_2 = jsjibonlu.read_fst_from_uri("handle:my_handle_from_fst_file_2");
    parser = jsjibonlu.build_sentence_parser(fst_2);
    parses_json = parser.parse_sentence(txt);
};
f();
check_no_throw(f);
check_parse_ref_json(parses_json, ref_json);

// wrong number of arguments
var f = function()  {
    fst = jsjibonlu.load_fst_from_fst_file("./my_fst_file.fst");
};
check_throw(f);

// wrong number of argumets
var f = function()  {
    fst = jsjibonlu.load_fst_from_fst_file("./my_fst_file.fst", "handle:my_handle_fst_file_3", "handle:my_handle_fst_file_3");
};
check_throw(f);

// file that does not exist
var f = function()  {
    fst = jsjibonlu.load_fst_from_fst_file("./my_fst_file_does_not_exist.fst", "handle:my_handle_fst_file_3");
};
check_throw(f);

// wrong type
var f = function()  {
    fst = jsjibonlu.load_fst_from_fst_file(3, "handle:my_handle_fst_file_3");
};
check_throw(f);

// wrong type
var f = function()  {
    fst = jsjibonlu.load_fst_from_fst_file("./my_fst_file.fst", 3);
};
check_throw(f);

/************************************/
/* parsing with union fst           */
/************************************/

// correct call
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995","union_original_fst_name":"file:my_fst_file.fst"}, "heuristic_score":15, "index":0}]';
second_rule = 'TopRule = $* july {july = \'july\'} $*;';
var f = function()  {
    fst2 = jsjibonlu.compile_fst_from_text(second_rule, "handle:my_handle");
    arr=["file:my_fst_file.fst", "handle:my_handle"]; 
    union_fst = jsjibonlu.union_fst(arr, "handle:my_union_handle");
    parser = jsjibonlu.build_sentence_parser(union_fst);
    parses_json = parser.parse_sentence(txt);
};
f();
check_no_throw(f);
check_parse_ref_json(parses_json, ref_json);

// correct call, testing handle
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995", "union_original_fst_name":"file:my_fst_file.fst"}, "heuristic_score":15, "index":0}]';
second_rule = 'TopRule = $* july {july = \'july\'} $*;';
var f = function()  {
    fst2 = jsjibonlu.compile_fst_from_text(second_rule, "handle:my_handle");
    arr=["file:my_fst_file.fst", "handle:my_handle"];
    union_fst = jsjibonlu.union_fst(arr, "handle:my_union_handle");
    union_fst_2 = jsjibonlu.read_fst_from_uri("handle:my_union_handle");
    parser = jsjibonlu.build_sentence_parser(union_fst_2);
    parses_json = parser.parse_sentence(txt);
};
f();
check_no_throw(f);
check_parse_ref_json(parses_json, ref_json);

// wrong number of arguments
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}]';
second_rule = 'TopRule = $* july {july = \'july\'} $*;';
var f = function()  {
    fst2 = jsjibonlu.compile_fst_from_text(second_rule, "handle:my_handle");
    arr=["file:my_fst_file.fst", "handle:my_handle"]; 
    union_fst = jsjibonlu.union_fst(arr);
    parser = jsjibonlu.build_sentence_parser(union_fst);
    parses_json = parser.parse_sentence(txt);
};
check_throw(f);

// incorrect argument
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}]';
second_rule = 'TopRule = $* july {july = \'july\'} $*;';
var f = function()  {
    fst2 = jsjibonlu.compile_fst_from_text(second_rule, "handle:my_handle");
    arr=["file:my_fst_file.fst", "handle:my_handle"]; 
    union_fst = jsjibonlu.union_fst(arr, arr);
    parser = jsjibonlu.build_sentence_parser(union_fst);
    parses_json = parser.parse_sentence(txt);
};
check_throw(f);

// incorrect argument
txt = "july 29th 1995";
parses_json = '';
ref_json = '[{"Input":"july 29th 1995", "NLParse":{"date":"07\\/29\\/1995"}, "heuristic_score":15, "index":0}]';
second_rule = 'TopRule = $* july {july = \'july\'} $*;';
var f = function()  {
    fst2 = jsjibonlu.compile_fst_from_text(second_rule, "handle:my_handle");
    arr=["file:my_fst_file.fst", "handle:my_handle"]; 
    union_fst = jsjibonlu.union_fst(1, "handle:my_union_handle");
    parser = jsjibonlu.build_sentence_parser(union_fst);
    parses_json = parser.parse_sentence(txt);
};
check_throw(f);

/************************************/
/* dumping fst in array of ints     */
/************************************/

// correct call 
rule = 'TopRule = $* july {july = \'july\'} $*;';
fs = require('fs');
var f = function() {fst1 = jsjibonlu.compile_fst_from_text(rule, "handle:my_handle");
                    fst1.save_fst("file-to-cmp1.fst");
                    arr = fst1.to_buffer();
                    saved_arr = fs.readFileSync("./file-to-cmp1.fst")
                    if (arr.length != saved_arr.length)
                        throw new Error("Length of buffers is different");
                    for (i = 0; i < arr.length; ++i) {
                        if (arr[i] != saved_arr[i])
                            throw new Error("Buffers differ");
                    }
                   };
check_no_throw(f);

// wrong number of arguments 
rule = 'TopRule = $* july {july = \'july\'} $*;';
fs = require('fs');
var f = function() {fst1 = jsjibonlu.compile_fst_from_text(rule, "handle:my_handle");
                    fst1.save_fst("file-to-cmp1.fst");
                    arr = new Buffer(fst1.to_buffer("hello"));
                    saved_arr = fs.readFileSync("./file-to-cmp1.fst")
                    if (arr.length != saved_arr.length)
                        throw new Error("Length of buffers is different");
                    for (i = 0; i < arr.length; ++i) {
                        if (arr[i] != saved_arr[i])
                            throw new Error("Buffers differ");
                    }
                   };
check_throw(f);

/*******************************************/
/* reading handle rule inside another rule */
/*******************************************/

grm = "TopRule = $handle:hndl{nl=hndl._nl};";
hndl = "TopRule = julius{_nl='julius'}|marcus{_nl='marcus'};";
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");fst1 = jsjibonlu.compile_fst_from_text(hndl, "handle:hndl");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt)};

txt = "julius";
parses_json = '';
ref_json = '[{"Input":"julius", "NLParse":{"nl":"julius"}, "heuristic_score":7, "index":0}]';
check_no_throw(f);
check_parse_ref_json(parses_json, ref_json);

txt = "marcus";
parses_json = '';
ref_json = '[{"Input":"marcus", "NLParse":{"nl":"marcus"}, "heuristic_score":7, "index":0}]';
check_no_throw(f);
check_parse_ref_json(parses_json, ref_json);

/********************************/
/* Removing fst from memory     */
/********************************/

// wrong number of arguments
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");jsjibonlu.remove_from_memory("handle:my_handle", 1)};
check_throw(f)

// wrong type of argument 
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");jsjibonlu.remove_from_memory(1)};
check_throw(f)

// correct call 
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");jsjibonlu.remove_from_memory("handle:my_handle")};
check_no_throw(f)

// trying to parse from a removed handle from memory 
grm = "TopRule = $factory:date{date=date._date_nl};";
txt = "july 29th 1995"
parses_json = '';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");jsjibonlu.remove_from_memory("handle:my_handle");fst2 = jsjibonlu.read_fst_from_uri("handle:my_handle");};
check_throw(f)

/********************************/
/* syntax check                 */
/********************************/

// wrong number of arguments
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {jsjibonlu.syntax_check(grm, "handle:my_handle");};
check_throw(f)

// wrong type of argument 
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {jsjibonlu.syntax_check(1);};
check_throw(f)

// correct call 
grm = "TopRule = $factory:date{date=date._date_nl};";
var f = function()  {jsjibonlu.syntax_check(grm);};
check_no_throw(f)

// bad argument types 
var f = function()  {jsjibonlu.syntax_check(grm, 3);};
check_throw(f);

// bad argument types 
var f = function()  {jsjibonlu.syntax_check(grm, "/filepath/file.rule");};
check_no_throw(f);

// with include file
grm = "TopRule = $include:./myfile.rule:my_rule;";
fs.writeFileSync("./myfile.rule","my_rule = aa;\n");
jsjibonlu.syntax_check(grm, process.cwd() + "/file.rule");
var f = function()  {jsjibonlu.syntax_check(grm, process.cwd() + "/file.rule");};
check_no_throw(f);

// wrong syntax  
grm = "TopRule = $factory:date{date=date._date_nl}";
var f = function()  {jsjibonlu.syntax_check(grm);};
check_throw(f)

// undefined rule 
grm = "TopRule = $a;"
var f = function()  {jsjibonlu.syntax_check(grm);};
check_throw(f)


/********************************/
/* fst error behavior           */
/********************************/

// Wrong number of arguments
var f = function()  {jsjibonlu.set_fst_error_behavior(0);};
check_throw(f);

// Correct number of arguments
var f = function()  {jsjibonlu.set_fst_error_behavior();};
check_no_throw(f);

// Opening valid fst file
var f = function()  {fst = jsjibonlu.read_fst_from_uri("file:my_fst_file.fst");};
check_no_throw(f);

// Writing incorrect fst file and attempting to open it
fs.writeFile('./my_normal_text_file.fst', "hello there");
var f = function()  {fst = jsjibonlu.read_fst_from_uri("file:my_normal_text_file.fst");};
console.log('**** Expected Error Message: In the next line you will see a std::cerr error message, output by openfst, but you can ignore it')
check_throw(f);
console.log('**** End of Exepcted Error Message')

/********************************/
/* javascript nl returns        */
/********************************/
grm = "TopRule = $* $weather $* ;\n";
grm += "weather = weather{%nl='weather'%} {%cities=[]%} *(+(in|and|or) $city{%cities.push(this.city.nl)%});\n";
grm += "city = (palo alto){% this.nl = 'palo alto' %}|(sunnyvale){%this.nl = 'sunnyvale'%}|(los altos){%this.nl = 'los altos'%}|(cupertino){%this.nl = 'cupertino'%};"; 
txt = "weather in palo alto in cupertino and in sunnyvale"
ref_json = '[{"Input":"weather in palo alto in cupertino and in sunnyvale", "NLParse":{"nl":"weather","cities":["palo alto","cupertino","sunnyvale"]}, "heuristic_score":51, "index":0}]';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst);parses_json = parser.parse_sentence(txt);};
check_no_throw(f);
check_parse_ref_json(ref_json, parses_json);


/*******************************/
/* reset_memory                */
/*******************************/

// incorrect call
var f = function() {jsjibonlu.reset_memory(3);}
check_throw(f);

// incorrect call
var f = function() {jsjibonlu.reset_memory('hi');}
check_throw(f);

// correct call
var f = function() {jsjibonlu.reset_memory()};
check_no_throw(f);

// compiling a couple of rules
grm = "TopRule = aa{nl='aa'};";
handle = 'handle:my_handle1';
var f = function() {jsjibonlu.compile_fst_from_text(grm, handle);};
check_no_throw(f);
handle = 'handle:my_handle2';
check_no_throw(f);
var f = function() {var n = jsjibonlu.num_fsts_in_mem(); if (n != num_of_fsts_at_start + 2) { throw new Error('Error in num_fsts_in_mem')} }
check_no_throw(f);
var f = function() {jsjibonlu.reset_memory(); var n = jsjibonlu.num_fsts_in_mem(); if (n != num_of_fsts_at_start) { throw new Error('Error in reset_memory')} }
check_no_throw(f);

/*******************************/
/* change_locale               */
/*******************************/
// incorrect call wrong number of arguments
var f = function() {jsjibonlu.change_locale('jp-jp', 'jp-jp')};
check_throw(f);

// incorrect call wrong number of arguments
var f = function() {jsjibonlu.change_locale(3)};
check_throw(f);

// correct number of arguments incorrect locale
var f = function() {jsjibonlu.change_locale('incorrect-locale')};
check_throw(f);

// Inputing an incorrect locale causes all factory fsts to get unloaded
var f = function() {var n = jsjibonlu.num_fsts_in_mem(); if (n != 0) { throw new Error('Error in setting locale')} }
check_no_throw(f);

// Reseting datadir
var f = function() { jsjibonlu.set_data_dir(datadir);};
check_no_throw(f);
var f = function() {var n = jsjibonlu.num_fsts_in_mem(); if (n != num_of_fsts_at_start) { throw new Error('Error in setting locale and resetting data_dir')} }
check_no_throw(f);

// correct call
var f = function() {jsjibonlu.change_locale('jp-jp')};
check_no_throw(f);

// parsing
grm = "TopRule = [$factory:yes_no{% nl = this.yes_no._nl %}];";
txt = "はい";
parses_json = '';
ref_json = '[{"Input":"はい", "NLParse":{"nl":"yes"}, "heuristic_score":7, "index":0}]';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt)};
check_no_throw(f)
check_parse_ref_json(parses_json, ref_json);

// correct call
var f = function() {jsjibonlu.change_locale('zh-cn')};
check_no_throw(f);

// parsing
grm = "TopRule = [$factory:yes_no{% nl = this.yes_no._nl %}];";
txt = "是";
parses_json = '';
ref_json = '[{"Input":"是", "NLParse":{"nl":"yes"}, "heuristic_score":4, "index":0}]';
var f = function()  {fst = jsjibonlu.compile_fst_from_text(grm, "handle:my_handle");parser = jsjibonlu.build_sentence_parser(fst); parses_json = parser.parse_sentence(txt)};
check_no_throw(f)
check_parse_ref_json(parses_json, ref_json);

// removing handle from memory
var f = function() {jsjibonlu.remove_from_memory('handle:my_handle');}
check_no_throw(f);

// bringing locale back to en-us
var f = function() {jsjibonlu.change_locale('en-us')};
check_no_throw(f);
var f = function() {var n = jsjibonlu.num_fsts_in_mem(); if (n != num_of_fsts_at_start) { throw new Error('Error in setting locale and resetting data_dir')} }
check_no_throw(f);

console.log('\n\n\nSuccess');

