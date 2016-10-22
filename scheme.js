var scheme = (function() {
    var Type = {
        Number: 'Number', String: 'String', Symbol: 'Symbol', Pair: 'Pair', Null: 'Null', Bool: 'Bool', Lambda: 'Lambda', Fun: 'Fun'
    }
    function Pair(a, b) {
        return { car: a, cdr: b };
    }
    function Lambda(ev, p, e) {
        return { env: ev, param: p, exp: e };
    }
    function Env(parent) {
        this.parent = parent;
        this.env = {};
    }
    Env.prototype.get = function(key) {
        if (this.env[key] != undefined) {
            return this.env[key];
        } else {
            if (this.parent == null)
                throw "no varialbe " + key;
            return this.parent.get(key);
        }
    }
    Env.prototype.set = function(key, value) {
        if (this.env[key] != undefined) {
            this.env[key] = value;
        } else {
            if (this.parent == null)
                throw "no varialbe " + key;
            this.parent.set(key, value);
        }
    }
    
    function isBlank(c) {
        return c == ' ' || c == '\t' || c == '\n' || c == '\r';
    }
    function skipBlank(v) {
        while (isBlank(v.s.charAt(v.p))) {
            v.p++;
        }
    }
    function IsNum(s) {
        var r = s.match(/[+-]?([0-9]*\.?[0-9]+|[0-9]+\.?[0-9]*)(e[+-]?[0-9]+)?/i);
        if (r == null)
            return false;
        else
            return r[0] == s;
    }
    function cons(a, b) {
        return new SObject(Pair(a, b), Type.Pair);
    }
    function car(n) {
        return n.content.car;
    }
    function cdr(n) {
        return n.content.cdr;
    }
    function eq0(a, b) {
        return a.type == b.type && a.content == b.content;
    }
    function singleParse(v) {
        if (v.s.charAt(v.p) == "\"") {
            var escapeChar = {
                'n': '\n',
                'r': '\r',
                't': '\t',
                '\\': '\\',
                '\'': '\'',
                '\"': '\"'
            }
            var s = "";
            v.p++;
            while (true) {
                if (v.p >= v.s.length) throw "wrong string";
                else if (v.s.charAt(v.p) == '\\') {
                    v.p++;
                    s += escapeChar[exp.charAt(v.p)];
                } else if (v.s.charAt(v.p) == '\"') {
                    v.p++;
                    return new SObject(s, Type.String);
                } else {
                    s += v.s.charAt(v.p);
                }
                v.p++;
            }
        } else {
            var s = "";
            while (v.p < v.s.length ) {
                var c = v.s.charAt(v.p);
                if ( c != '(' && c != ')' && !isBlank(c)) {
                    s += c;
                    v.p++;
                } else
                    break;
            }
            if (IsNum(s)) {
                return new SObject(Number(s));
            } else if (s == 'true') {
                return new SObject(true);
            } else if (s == 'false') {
                return new SObject(false);
            } else if (s == 'null') {
                return new SObject(null, Type.Null);
            } else {
                return new SObject(s, Type.Symbol);
            }
        }
    }
    function quote(n) {
        if (n.type == Type.Null || n.type == Type.Bool || n.type == Type.Number || n.type == Type.String) {
            return n;
        } else {
            return cons(new SObject("quote"), cons(n, new SObject(null, Type.Null)));
        }
    }
    function parse(v) {
        skipBlank(v);
        if (v.p >= v.s.length) {
            return new SObject(null, Type.Null);
        }else if (v.s.charAt(v.p) == '(') {
            v.p++;
            var nList = new Array();
            while (true) {
                skipBlank(v);
                if (v.p >= v.s.length) {
                    throw "List not match";
                } else if (v.s.charAt(v.p) == ')') {
                    v.p++;
                    break;
                } else {
                    nList.push(parse(v));
                }
            }
            var list;
            if (nList.length > 2 && eq0(nList[nList.length - 2], new SObject("."))) {
                list = nList[nList.length - 1];
                for (var i = nList.length - 3; i >= 0; i--) {
                    list = cons(nList[i], list);
                }
            } else {
                list = new SObject(null, Type.Null);
                for (var i = nList.length - 1; i >= 0; i--) {
                    list = cons(nList[i], list);
                }
            }
            return list;
        } else if (v.s.charAt(v.p) == '\'') {
            v.p++;
            return quote(parse(v));
        } else {
            return singleParse(v);
        }
    }
    function SObject(exp, type) {
        if (arguments.length == 2) {
            this.type = type;
            this.content = exp;
        } else {
            switch (typeof exp) {
                case 'number':
                    this.type = Type.Number;
                    this.content = exp;
                    break;
                case 'boolean':
                    this.type = Type.Bool;
                    this.content = exp;
                    break;
                case 'string':
                    var node = parse({ s: exp, p: 0 });
                    this.type = node.type;
                    this.content = node.content;
                    break;
            }
        }
    }
    SObject.prototype.toString = function() {
        switch (this.type) {
            case Type.Pair:
                s = '(';
                var n = this;
                while (n.type == Type.Pair) {
                    s += car(n).toString() + ' ';
                    n = cdr(n);
                }
                if (n.type == Type.Null) {
                    s = s.slice(0, s.length - 1) + ')';
                } else {
                    s += ". " + n.toString() + ')';
                }
                return s;
            case Type.Null:
            case Type.Number:
            case Type.Symbol:
            case Type.Bool:
                return String(this.content);
            case Type.String:
                return '"' + this.content + '"';
            default:
                return String(this.type);
        }
    }
    SObject.prototype.eval = function(env) {
        try {
            if (this.type == Type.Symbol) {
                return env.get(this.content);
            } else if (this.type == Type.Pair && car(this).type == Type.Symbol) {
                var n = cdr(this);
                switch (car(this).content) {
                    case 'quote':
                        return car(n);
                    case 'set!':
                        env.set(car(n).content, car(cdr(n)).eval(env));
                        return new SObject(null, Type.Null);
                    case 'define':
                        if (car(n).type != Type.Pair) {//define a var
                            var key = car(n).content;
                            if (env.env[key] != undefined) {
                                throw 'cannot re-define';
                            }
                            env.env[key] = car(cdr(n)).eval(env);
                            return env.env[key];
                        } else {//define a lambda
                            var key = car(car(n)).content;
                            var lambda = cons(new SObject("lambda", Type.Symbol), cons(cdr(car(n)), cdr(n))).eval(env);
                            env.env[key] = lambda;
                            return lambda;
                        }
                    case 'and':
                        var res = new SObject(true);
                        while (n.type != Type.Null) {
                            var x = car(n).eval(env);
                            if (eq0(x, new SObject(false)))
                                return x;
                            res = x;
                            n = cdr(n);
                        }
                        return res;
                    case 'or':
                        var res = new SObject(false);
                        while (n.type != Type.Null) {
                            var x = car(n).eval(env);
                            if (!eq0(x, new SObject(false)))
                                return x;
                            res = x;
                            n = cdr(n);
                        }
                        return res;
                    case 'if':
                        if (!eq0(car(n).eval(env), new SObject(false)))
                            return car(cdr(n)).eval(env);
                        else return car(cdr(cdr(n))).eval(env);
                    case 'cond':
                        while (n.type != Type.Null) {
                            if (!eq0(car(car(n)).eval(env), new SObject(false)))
                                return car(cdr(car(n))).eval(env);
                            n = cdr(n);
                        }
                        return new SObject(null, Type.Null);
                    case 'lambda':
                        var exp = cdr(n);
                        if (cdr(exp).type == Type.Null) {
                            exp = car(exp);
                        } else {
                            exp = cons(new SObject("begin"), exp);
                        }
                        return new SObject(
                            new Lambda(env, car(n), exp), Type.Lambda);
                    case 'eval':
                        return car(n).eval(env).eval(env);
                    case 'apply':
                        var fun = car(n).eval(env);
                        n = car(cdr(n)).eval(env);
                        return apply(fun, n, env);
                    default:
                        return this.apply(env);
                }
            } else if (this.type == Type.Pair) {
                return this.apply(env);
            } else {
                return this;
            }
        } catch (e) {
            throw e + '\nin ' + this.toString();
        }
    }
    function apply(fun, n, env) {
        if (fun.type == Type.Lambda) {
            var lambda = fun.content;
            var param = lambda.param;
            var env1 = new Env(lambda.env);
            while (param.type != Type.Null) {
                if (param.type == Type.Pair) {
                    env1.env[car(param).content] = car(n);
                    param = cdr(param);
                    n = cdr(n);
                } else {
                    env1.env[param.content] = n;
                    break;
                }
            }
            return lambda.exp.eval(env1);
        } else if (fun.type == Type.Fun) {
            var nList = new Array();
            while (n.type != Type.Null) {
                nList.push(car(n));
                n = cdr(n);
            }
            return fun.content(nList);
        } else {
            throw fun.toString() + " is not a function";
        }
    }
    SObject.prototype.apply = function (env) {
        var fun = car(this).eval(env);
        var n = cdr(this);
        var nList = new Array();
        while (n.type != Type.Null) {
            if (n.type != Type.Pair) {
                throw "cannot eval a pair"
            }
            nList.push(car(n).eval(env));
            n = cdr(n);
        }
        n = new SObject(null, Type.Null);
        for (var i = nList.length - 1; i >= 0; i--) {
            n = cons(nList[i], n);
        }
        return apply(fun, n, env);
    }

    function addPrim(name, fun) {
        env0.env[name] = new SObject(fun, Type.Fun);
    }
    function accumFun(fun) {
        return function(nList) {
            var s = nList[0].content;
            for (var i = 1; i < nList.length; i++) {
                s = fun(s, nList[i].content);
            }
            return new SObject(s);
        }
    }
    function getBaseEnv() {
        addPrim("+", accumFun(function (a, b) { return a + b; }));
        addPrim("*", accumFun(function (a, b) { return a * b; }));
        addPrim("/", accumFun(function (a, b) { return a / b; }));
        addPrim("-", function (nList) {
            var s = nList[0].content;
            if (nList.length == 1) {
                s = -s;
            } else {
                for (var i = 1; i < nList.length; i++) {
                    s = s - nList[i].content;
                }
            }
            return new SObject(s);
        });
        addPrim(">", function (nList) { return new SObject(nList[0].content > nList[1].content) });
        addPrim("<", function (nList) { return new SObject(nList[0].content < nList[1].content) });
        addPrim("=", function (nList) { return new SObject(nList[0].content == nList[1].content) });
        addPrim(">=", function (nList) { return new SObject(nList[0].content >= nList[1].content) });
        addPrim("<=", function (nList) { return new SObject(nList[0].content <= nList[1].content) });
        addPrim("begin", function (nList) { return nList[nList.length - 1] });
        addPrim("car", function (nList) { return car(nList[0]) });
        addPrim("cdr", function (nList) { return cdr(nList[0]) });
        addPrim("cons", function (nList) { return cons(nList[0], nList[1]) });
        addPrim("eq?", function (nList) { return new SObject(eq0(nList[0], nList[1])) });
        addPrim("null?", function (nList) { return new SObject(nList[0].type == Type.Null) });
        addPrim("symbol?", function (nList) { return new SObject(nList[0].type == Type.Symbol) });
        addPrim("pair?", function (nList) { return new SObject(nList[0].type == Type.Pair) });
        new SObject("(define #f false)").eval(env0);
        new SObject("(define #t true)").eval(env0);
        new SObject("(define (caar x) (car (car x)))").eval(env0);
        new SObject("(define (cadr x) (car (cdr x)))").eval(env0);
        new SObject("(define (cdar x) (cdr (car x)))").eval(env0);
        new SObject("(define (cddr x) (cdr (cdr x)))").eval(env0);
        new SObject("(define (caaar x) (car (car (car x))))").eval(env0);
        new SObject("(define (caadr x) (car (car (cdr x))))").eval(env0);
        new SObject("(define (cadar x) (car (cdr (car x))))").eval(env0);
        new SObject("(define (caddr x) (car (cdr (cdr x))))").eval(env0);
        new SObject("(define (cdaar x) (cdr (car (car x))))").eval(env0);
        new SObject("(define (cdadr x) (cdr (car (cdr x))))").eval(env0);
        new SObject("(define (cddar x) (cdr (cdr (car x))))").eval(env0);
        new SObject("(define (cdddr x) (cdr (cdr (cdr x))))").eval(env0);
        new SObject("(define (list . x) x)").eval(env0);
        new SObject("(define (u-map op x) (if (null? x) null (cons (op (car x)) (u-map op (cdr x)))))").eval(env0);
        new SObject("(define (map fn p . q) (if (null? p) null (cons (apply fn (cons (car p) (u-map car q))) (apply map (cons fn (cons (cdr p) (u-map cdr q)))))))").eval(env0);
        new SObject("(define (list? x) (or (null? x) (and (pair? x) (list? (cdr x)))))").eval(env0);
    }

    var env0 = new Env(null);
    getBaseEnv();
    var scheme = function (exp) {
        try {
            return (new SObject(exp).eval(env0)).toString();
        }
        catch (e) {
            return e;
        }
    }
    scheme.clearEnv = function () {
        env0 = new Env(null);
        getBaseEnv();
    }
    return scheme;
})()

scheme("(define x 1)");
scheme("(set! x '(2 . 3))");
console.assert(scheme("x") == "(2 . 3)");
console.assert(scheme("(and 2 1)") == "1");
console.assert(scheme("(and)") == "true");
console.assert(scheme("(and false 1)") == "false");
console.assert(scheme("(or false 1)") == "1");
console.assert(scheme("(or)") == "false");
console.assert(scheme("(or 2 false)") == "2");

console.assert(scheme("(cond (false 1) (3 4))") == "4");
scheme("(define y (begin (define z 2) (* z z)))");
console.assert(scheme("z") == "2");
console.assert(scheme("y") == "4");

console.assert(scheme("(apply + '(1 2 3))") == "6");
console.assert(scheme("(map (lambda (x) (+ 1 x)) '(1 2))") == "(2 3)");
scheme("(define 1+ (lambda (x) (+ 1 x)))");
console.assert(scheme("(1+ 2)") == "3");
console.assert(scheme("(((lambda (x) (lambda (y) (+ x y))) 1) 2)") == "3");
scheme("(define sum-of-square (lambda x (if (null? x) 0 (+ (* (car x) (car x)) (apply sum-of-square (cdr x))))))");
console.assert(scheme("(sum-of-square 1 2 3 4)") == "30");
console.assert(scheme("(eval '(+ 1 2))") == "3");
scheme.clearEnv();