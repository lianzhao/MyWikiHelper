
/// <reference path="wiki.ts"/>
/// <reference path="wiki_sites.ts"/>
module WikiPorter {
    export class Config {
        static wiki_sites: Array<Wiki.WikiSite>;
        static wiki_porters: Array<Porter>;
        static default_wiki_text_mapping_func: WikiTextMappingFunc;

        static init() {
            this.wiki_sites = new Array<Wiki.WikiSite>();
            WIKI_SITES.forEach((json) => {
                var site = new Wiki.WikiSite(json);
                this.wiki_sites.push(site);
            });
            this.wiki_porters = new Array<Porter>();
            this.default_wiki_text_mapping_func = (wikiText, sourcePage) => {
                return "'''这个页面由[https://github.com/lianzhao/MyWikiHelper Wiki Porter]自动搬运。搬运中产生的版权问题由搬运者自行解决，Wiki Porter不为此搬运行为背书。您可以前往[" + sourcePage.url + " 源地址]查看版权声明。'''[[Category:WikiPorter搬运]]<br>" + wikiText;
            }
            var categoryPorter = new CategoryPorter();
            categoryPorter.wiki_text_mapping_func = this.default_wiki_text_mapping_func;
            this.registerPorter(categoryPorter);
            var filePorter = new FilePorter();
            filePorter.wiki_text_mapping_func = this.default_wiki_text_mapping_func;
            this.registerPorter(filePorter);
            var defaultPorter = new DefaultPorter();
            defaultPorter.wiki_text_mapping_func = this.default_wiki_text_mapping_func;
            this.registerPorter(defaultPorter);
        }

        static registerPorter(porter: Porter, index = -1) {
            if (index < 0) {
                this.wiki_porters.push(porter);
            } else {
                this.wiki_porters.splice(index, 0, porter);
            }
        }

        static getPorter(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): Porter {
            for (var index = 0; index < this.wiki_porters.length; index++) {
                var porter = this.wiki_porters[index];
                if (porter.canPort(sourcePage, targetPage)) {
                    return porter;
                }
            }
            return null;
        }

        static parsePage(source: string): Wiki.WikiPage {
            for (var index = 0; index < this.wiki_sites.length; index++) {
                var site = this.wiki_sites[index];
                var page = site.parsePage(source);
                if (page !== null) {
                    return page;
                }
            }
            return null;
        }
    }

    export interface Porter {
        canPort(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): boolean;

        port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage, options: any): P.Promise<any>;
    }

    export class DefaultPorter implements Porter {
        wiki_text_mapping_func: WikiTextMappingFunc;
        can_port_predicate: CanPortPredicate;

        constructor() {
            this.wiki_text_mapping_func = null;
            this.can_port_predicate = null;
        }

        canPort(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): boolean {
            return sourcePage.site !== targetPage.site && (this.can_port_predicate === null || this.can_port_predicate(sourcePage, targetPage));
        }

        port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage, options: any): P.Promise<any> {
            var deferredResult = P.defer<any>();
            sourcePage.getWikiText().done(wikitext => {
                targetPage.site.getCsrfToken().done(token => {
                    if (this.wiki_text_mapping_func !== null) {
                        wikitext = this.wiki_text_mapping_func(wikitext, sourcePage, targetPage);
                    }
                    targetPage.edit(wikitext, token, options.overwriteExist).done(_ => deferredResult.resolve(_)).fail(deferredResult.reject);
                }).fail(deferredResult.reject);
            }).fail(deferredResult.reject);
            return deferredResult.promise();
        }
    }

    export class FilePorter extends DefaultPorter {

        canPort(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): boolean {
            return super.canPort(sourcePage, targetPage)
                && sourcePage.isFilePage && targetPage.isFilePage;
        }

        port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage, options: any): P.Promise<any> {
            var deferredResult = P.defer<any>();
            var sourceFilePage = sourcePage.asFilePage();
            var targetFilePage = targetPage.asFilePage();
            if (sourceFilePage == null || targetFilePage == null) {
                // something went wrong...
                deferredResult.reject(null);
            } else {
                sourcePage.getWikiText().done(wikitext => {
                    sourceFilePage.getFileUrl().done(url => {
                        targetPage.site.getCsrfToken().done(token => {
                            if (this.wiki_text_mapping_func != null) {
                                wikitext = this.wiki_text_mapping_func(wikitext, sourcePage, targetPage);
                            }
                            targetFilePage.upload(url, wikitext, token).done(_ => deferredResult.resolve(_)).fail(deferredResult.reject);
                        }).fail(deferredResult.reject);
                    }).fail(deferredResult.reject);
                }).fail(deferredResult.reject);
            }
            return deferredResult.promise();
        }
    }

    export class CategoryPorter extends DefaultPorter {

        canPort(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): boolean {
            return super.canPort(sourcePage, targetPage)
                && sourcePage.isCategoryPage && targetPage.isCategoryPage;
        }

        port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage, options: any): P.Promise<any> {
            var deferredResult = P.defer<any>();
            var sourceCategoryPage = sourcePage.asCategoryPage();
            var targetCategoryPage = targetPage.asCategoryPage();
            if (sourceCategoryPage == null || targetCategoryPage == null) {
                // something went wrong...
                deferredResult.reject(null);
            } else {
                // get pages to be porting
                var pages = [];
                $.each(options.portCategoryOptions, (i,e) => {
                    var d = sourceCategoryPage.getMembers(e);
                    pages = pages.concat(d.result)
                });
            }
            return deferredResult.promise();
        }
    }

    export interface CanPortPredicate {
        (sourcePage?: Wiki.WikiPage, targetPage?: Wiki.WikiPage): boolean;
    }

    export interface WikiTextMappingFunc {
        (wikiText: string, sourcePage?: Wiki.WikiPage, targetPage?: Wiki.WikiPage): string;
    }
}