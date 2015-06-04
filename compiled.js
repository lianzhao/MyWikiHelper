/**
    Module P: Generic Promises for TypeScript

    Project, documentation, and license: https://github.com/pragmatrix/Promise
*/
var P;
(function (P) {
    /**
        Returns a new "Deferred" value that may be resolved or rejected.
    */
    function defer() {
        return new DeferredI();
    }
    P.defer = defer;
    /**
        Converts a value to a resolved promise.
    */
    function resolve(v) {
        return defer().resolve(v).promise();
    }
    P.resolve = resolve;
    /**
        Returns a rejected promise.
    */
    function reject(err) {
        return defer().reject(err).promise();
    }
    P.reject = reject;
    /**
        http://en.wikipedia.org/wiki/Anamorphism

        Given a seed value, unfold calls the unspool function, waits for the returned promise to be resolved, and then
        calls it again if a next seed value was returned.

        All the values of all promise results are collected into the resulting promise which is resolved as soon
        the last generated element value is resolved.
    */
    function unfold(unspool, seed) {
        var d = defer();
        var elements = new Array();
        unfoldCore(elements, d, unspool, seed);
        return d.promise();
    }
    P.unfold = unfold;
    function unfoldCore(elements, deferred, unspool, seed) {
        var result = unspool(seed);
        if (!result) {
            deferred.resolve(elements);
            return;
        }
        // fastpath: don't waste stack space if promise resolves immediately.
        while (result.next && result.promise.status == P.Status.Resolved) {
            elements.push(result.promise.result);
            result = unspool(result.next);
            if (!result) {
                deferred.resolve(elements);
                return;
            }
        }
        result.promise
            .done(function (v) {
            elements.push(v);
            if (!result.next)
                deferred.resolve(elements);
            else
                unfoldCore(elements, deferred, unspool, result.next);
        })
            .fail(function (e) {
            deferred.reject(e);
        });
    }
    /**
        The status of a Promise. Initially a Promise is Unfulfilled and may
        change to Rejected or Resolved.
     
        Once a promise is either Rejected or Resolved, it can not change its
        status anymore.
    */
    (function (Status) {
        Status[Status["Unfulfilled"] = 0] = "Unfulfilled";
        Status[Status["Rejected"] = 1] = "Rejected";
        Status[Status["Resolved"] = 2] = "Resolved";
    })(P.Status || (P.Status = {}));
    var Status = P.Status;
    /**
        Creates a promise that gets resolved when all the promises in the argument list get resolved.
        As soon one of the arguments gets rejected, the resulting promise gets rejected.
        If no promises were provided, the resulting promise is immediately resolved.
    */
    function when() {
        var promises = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            promises[_i - 0] = arguments[_i];
        }
        var allDone = defer();
        if (!promises.length) {
            allDone.resolve([]);
            return allDone.promise();
        }
        var resolved = 0;
        var results = [];
        promises.forEach(function (p, i) {
            p
                .done(function (v) {
                results[i] = v;
                ++resolved;
                if (resolved === promises.length && allDone.status !== Status.Rejected)
                    allDone.resolve(results);
            })
                .fail(function (e) {
                if (allDone.status !== Status.Rejected)
                    allDone.reject(new Error("when: one or more promises were rejected"));
            });
        });
        return allDone.promise();
    }
    P.when = when;
    /**
        Implementation of a promise.

        The Promise<Value> instance is a proxy to the Deferred<Value> instance.
    */
    var PromiseI = (function () {
        function PromiseI(deferred) {
            this.deferred = deferred;
        }
        Object.defineProperty(PromiseI.prototype, "status", {
            get: function () { return this.deferred.status; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PromiseI.prototype, "result", {
            get: function () { return this.deferred.result; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PromiseI.prototype, "error", {
            get: function () { return this.deferred.error; },
            enumerable: true,
            configurable: true
        });
        PromiseI.prototype.done = function (f) {
            this.deferred.done(f);
            return this;
        };
        PromiseI.prototype.fail = function (f) {
            this.deferred.fail(f);
            return this;
        };
        PromiseI.prototype.always = function (f) {
            this.deferred.always(f);
            return this;
        };
        PromiseI.prototype.then = function (f) {
            return this.deferred.then(f);
        };
        return PromiseI;
    })();
    /**
        Implementation of a deferred.
    */
    var DeferredI = (function () {
        function DeferredI() {
            this._resolved = function (_) { };
            this._rejected = function (_) { };
            this._status = Status.Unfulfilled;
            this._error = { message: "" };
            this._promise = new PromiseI(this);
        }
        DeferredI.prototype.promise = function () {
            return this._promise;
        };
        Object.defineProperty(DeferredI.prototype, "status", {
            get: function () {
                return this._status;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeferredI.prototype, "result", {
            get: function () {
                if (this._status != Status.Resolved)
                    throw new Error("Promise: result not available");
                return this._result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeferredI.prototype, "error", {
            get: function () {
                if (this._status != Status.Rejected)
                    throw new Error("Promise: rejection reason not available");
                return this._error;
            },
            enumerable: true,
            configurable: true
        });
        DeferredI.prototype.then = function (f) {
            var d = defer();
            this
                .done(function (v) {
                var promiseOrValue = f(v);
                // todo: need to find another way to check if r is really of interface
                // type Promise<any>, otherwise we would not support other 
                // implementations here.
                if (promiseOrValue instanceof PromiseI) {
                    var p = promiseOrValue;
                    p.done(function (v2) { return d.resolve(v2); })
                        .fail(function (err) { return d.reject(err); });
                    return p;
                }
                d.resolve(promiseOrValue);
            })
                .fail(function (err) { return d.reject(err); });
            return d.promise();
        };
        DeferredI.prototype.done = function (f) {
            if (this.status === Status.Resolved) {
                f(this._result);
                return this;
            }
            if (this.status !== Status.Unfulfilled)
                return this;
            var prev = this._resolved;
            this._resolved = function (v) { prev(v); f(v); };
            return this;
        };
        DeferredI.prototype.fail = function (f) {
            if (this.status === Status.Rejected) {
                f(this._error);
                return this;
            }
            if (this.status !== Status.Unfulfilled)
                return this;
            var prev = this._rejected;
            this._rejected = function (e) { prev(e); f(e); };
            return this;
        };
        DeferredI.prototype.always = function (f) {
            this
                .done(function (v) { return f(v); })
                .fail(function (err) { return f(null, err); });
            return this;
        };
        DeferredI.prototype.resolve = function (result) {
            if (this._status !== Status.Unfulfilled)
                throw new Error("tried to resolve a fulfilled promise");
            this._result = result;
            this._status = Status.Resolved;
            this._resolved(result);
            this.detach();
            return this;
        };
        DeferredI.prototype.reject = function (err) {
            if (this._status !== Status.Unfulfilled)
                throw new Error("tried to reject a fulfilled promise");
            this._error = err;
            this._status = Status.Rejected;
            this._rejected(err);
            this.detach();
            return this;
        };
        DeferredI.prototype.detach = function () {
            this._resolved = function (_) { };
            this._rejected = function (_) { };
        };
        return DeferredI;
    })();
    function generator(g) {
        return function () { return iterator(g()); };
    }
    P.generator = generator;
    ;
    function iterator(f) {
        return new IteratorI(f);
    }
    P.iterator = iterator;
    var IteratorI = (function () {
        function IteratorI(f) {
            this.f = f;
            this.current = undefined;
        }
        IteratorI.prototype.advance = function () {
            var _this = this;
            var res = this.f();
            return res.then(function (value) {
                if (isUndefined(value))
                    return false;
                _this.current = value;
                return true;
            });
        };
        return IteratorI;
    })();
    /**
        Iterator functions.
    */
    function each(gen, f) {
        var d = defer();
        eachCore(d, gen(), f);
        return d.promise();
    }
    P.each = each;
    function eachCore(fin, it, f) {
        it.advance()
            .done(function (hasValue) {
            if (!hasValue) {
                fin.resolve({});
                return;
            }
            f(it.current);
            eachCore(fin, it, f);
        })
            .fail(function (err) { return fin.reject(err); });
    }
    /**
        std
    */
    function isUndefined(v) {
        return typeof v === 'undefined';
    }
    P.isUndefined = isUndefined;
})(P || (P = {}));
/// <reference path="typings/jquery/jquery.d.ts"/>
/// <reference path="typings/Promise.ts"/>
var Wiki;
(function (Wiki) {
    var WikiSite = (function () {
        function WikiSite(json) {
            this.name = json.name;
            this.desc = json.desc;
            this.project_name = json.project_name;
            this.url = json.url;
            this.page_url = json.page_url;
            this.api_url = json.api_url;
        }
        WikiSite.prototype.parsePage = function (source_url) {
            var index = source_url.indexOf(this.page_url);
            if (index === 0) {
                var title = source_url.substr(this.page_url.length).replace(this.project_name + ":", "Project:");
                var page = new WikiPage(title, this);
                return page;
            }
            return null;
        };
        WikiSite.prototype.getCsrfToken = function () {
            var deferredResult = P.defer();
            var requestUrl = this.api_url + "?action=query&meta=tokens&format=json";
            $.ajax({
                url: requestUrl,
                success: function (params) {
                    var token = params.query.tokens.csrftoken;
                    console.log(token);
                    deferredResult.resolve(token);
                },
                error: function (e, msg) {
                    deferredResult.reject({ message: msg });
                }
            });
            return deferredResult.promise();
        };
        return WikiSite;
    })();
    Wiki.WikiSite = WikiSite;
    var WikiPage = (function () {
        function WikiPage(title, site) {
            this._title = title;
            this._site = site;
        }
        Object.defineProperty(WikiPage.prototype, "title", {
            get: function () {
                return this._title;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WikiPage.prototype, "site", {
            get: function () {
                return this._site;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WikiPage.prototype, "url", {
            get: function () {
                return this._site.page_url + this.title;
            },
            enumerable: true,
            configurable: true
        });
        WikiPage.prototype.getWikiText = function () {
            var _this = this;
            var deferredResult = P.defer();
            var requestUrl = this.site.api_url + "?action=query&prop=revisions&rvprop=content&format=json&titles=" + this.title;
            console.log(requestUrl);
            $.ajax({
                url: requestUrl,
                success: function (params) {
                    var pagesNode = params.query.pages;
                    var pageNode = _this.getFirstChildInObject(pagesNode);
                    var wikitext = _this.getChildByName(pageNode.revisions[0], "*");
                    console.log(wikitext);
                    deferredResult.resolve(wikitext);
                },
                error: function (e, msg) {
                    deferredResult.reject({ message: msg });
                }
            });
            return deferredResult.promise();
        };
        WikiPage.prototype.edit = function (wiki_text, token) {
            var deferredResult = P.defer();
            var requestUrl = this.site.api_url + "?action=edit&format=json&createonly&summary=port&title=" + this.title;
            $.ajax({
                url: requestUrl,
                type: "POST",
                data: {
                    "text": wiki_text,
                    "token": token
                },
                success: function (params) {
                    deferredResult.resolve(params);
                },
                error: function (e, msg) {
                    deferredResult.reject({ message: msg });
                }
            });
            return deferredResult.promise();
        };
        WikiPage.prototype.getFirstChildInObject = function (obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    return obj[key];
                }
            }
        };
        WikiPage.prototype.getChildByName = function (obj, name) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key) && key === name) {
                    return obj[key];
                }
            }
        };
        return WikiPage;
    })();
    Wiki.WikiPage = WikiPage;
})(Wiki || (Wiki = {}));
/// <reference path="wiki.ts"/>
var WikiPorter;
(function (WikiPorter) {
    var WIKI_SITES = [
        {
            name: "麻将维基",
            desc: "麻将维基",
            project_name: "麻将维基",
            url: "http://mahjong.huiji.wiki",
            page_url: "http://mahjong.huiji.wiki/wiki/",
            api_url: "http://mahjong.huiji.wiki/api.php",
        },
        {
            name: "逆境无赖维基",
            desc: "逆境无赖维基",
            project_name: "逆境无赖维基",
            url: "http://kaiji.huiji.wiki",
            page_url: "http://kaiji.huiji.wiki/wiki/",
            api_url: "http://kaiji.huiji.wiki/api.php",
        },
        {
            name: "魔戒中文维基",
            desc: "魔戒中文维基",
            project_name: "魔戒中文维基",
            url: "http://lotr.huiji.wiki",
            page_url: "http://lotr.huiji.wiki/wiki/",
            api_url: "http://lotr.huiji.wiki/api.php",
        },
    ];
    var Config = (function () {
        function Config() {
        }
        Config.init = function () {
            var _this = this;
            this.wiki_sites = new Array();
            WIKI_SITES.forEach(function (json) {
                var site = new Wiki.WikiSite(json);
                _this.wiki_sites.push(site);
            });
            this.target_wiki_site = this.wiki_sites[0]; //todo
            this.wiki_porters = new Array();
            this.default_wiki_text_mapping_func = function (wikiText, sourcePage) {
                return "'''这个页面由[https://github.com/lianzhao/MyWikiHelper Wiki Porter]自动搬运。搬运中产生的版权问题由搬运者自行解决，Wiki Porter不为此搬运行为背书。您可以前往[" + sourcePage.url + " 源地址]查看版权声明。'''[[Category:WikiPorter搬运]]<br>" + wikiText;
            };
            var defaultPorter = new DefaultPorter();
            defaultPorter.wiki_text_mapping_func = this.default_wiki_text_mapping_func;
            this.registerPorter(defaultPorter);
        };
        Config.registerPorter = function (porter) {
            this.wiki_porters.push(porter);
        };
        Config.getPorter = function (sourcePage, targetPage) {
            for (var index = 0; index < this.wiki_porters.length; index++) {
                var porter = this.wiki_porters[index];
                if (porter.canPort(sourcePage, targetPage)) {
                    return porter;
                }
            }
            return null;
        };
        Config.parsePage = function (source) {
            for (var index = 0; index < this.wiki_sites.length; index++) {
                var site = this.wiki_sites[index];
                var page = site.parsePage(source);
                if (page !== null) {
                    return page;
                }
            }
            return null;
        };
        return Config;
    })();
    WikiPorter.Config = Config;
    var DefaultPorter = (function () {
        function DefaultPorter() {
        }
        DefaultPorter.prototype.canPort = function (sourcePage, targetPage) {
            return sourcePage.site !== targetPage.site;
        };
        DefaultPorter.prototype.port = function (sourcePage, targetPage) {
            var _this = this;
            var deferredResult = P.defer();
            sourcePage.getWikiText().done(function (wikitext) {
                targetPage.site.getCsrfToken().done(function (token) {
                    if (_this.wiki_text_mapping_func != null) {
                        wikitext = _this.wiki_text_mapping_func(wikitext, sourcePage, targetPage);
                    }
                    targetPage.edit(wikitext, token).done(function (_) { return deferredResult.resolve(_); }).fail(deferredResult.reject);
                }).fail(deferredResult.reject);
            }).fail(deferredResult.reject);
            return deferredResult.promise();
        };
        return DefaultPorter;
    })();
    WikiPorter.DefaultPorter = DefaultPorter;
})(WikiPorter || (WikiPorter = {}));
/// <reference path="typings/jquery/jquery.d.ts"/>
/// <reference path="wiki_porter.ts"/>
function getCurrentTabUrl(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };
    chrome.tabs.query(queryInfo, function (tabs) {
        var tab = tabs[0];
        var url = tab.url;
        callback(url);
    });
}
$(document).ready(function () {
    getCurrentTabUrl(function (url) {
        $("#navBtn").hide();
        WikiPorter.Config.init();
        var page = WikiPorter.Config.parsePage(url);
        if (page === null) {
            $("#msgText").text("Not a valid wiki page.");
            $("#portBtn").hide();
            $("#loadingImg").hide();
            return;
        }
        console.log("source_page=" + page.url);
        var targetSite = WikiPorter.Config.target_wiki_site; //todo
        var targetPage = new Wiki.WikiPage(page.title, targetSite); //todo support differet name
        $("#msgText").text();
        $("#portBtn").show();
        $("#portBtn").text("Port " + page.title + " to " + targetSite.name);
        $("#loadingImg").hide();
        var porter = WikiPorter.Config.getPorter(page, targetPage);
        if (porter === null) {
            // something went wrong...
            return;
        }
        $("#navBtn").click(function () {
            chrome.tabs.create({ url: targetPage.url });
        });
        console.log(porter);
        $("#portBtn").click(function () {
            $("#loadingImg").show();
            $("#portBtn").hide();
            porter.port(page, targetPage).done(function (params) {
                $("#msgText").text("Done!");
                $("#targetLink").text("See it");
                $("#msgText").show();
                $("#navBtn").show();
                $("#loadingImg").hide();
            }).fail(function (params) {
                console.log(params.message);
                $("#msgText").text("error, see log.");
                $("#msgText").show();
                $("#loadingImg").hide();
            });
        });
    });
});
