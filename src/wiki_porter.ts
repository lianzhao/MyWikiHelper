
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

        port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage, options: any): JQueryPromise<any>;
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

        port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage, options: any): JQueryPromise<any> {
            var d1 = sourcePage.getWikiText();
            var d2 = targetPage.site.getCsrfToken();
            return $.when(d1, d2).done((param1, param2) => {
                var wikitext = param1;
                var token = param2;
                if (this.wiki_text_mapping_func !== null) {
                    wikitext = this.wiki_text_mapping_func(wikitext, sourcePage, targetPage);
                }
                return targetPage.edit(wikitext, token, options.overwriteExist);
            })
        }
    }

    export class FilePorter extends DefaultPorter {

        canPort(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): boolean {
            return super.canPort(sourcePage, targetPage)
                && sourcePage.isFilePage && targetPage.isFilePage;
        }

        port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage, options: any): JQueryPromise<any> {
            var sourceFilePage = sourcePage.asFilePage();
            var targetFilePage = targetPage.asFilePage();
            if (sourceFilePage == null || targetFilePage == null) {
                // something went wrong...
                var d = $.Deferred()
                d.reject(null);
                return d.promise();
            } else {
                var d1 = sourcePage.getWikiText();
                var d2 = sourceFilePage.getFileUrl();
                var d3 = targetPage.site.getCsrfToken();
                return $.when(d1, d2, d3).done((param1, param2, param3) => {
                    var wikitext = param1;
                    var url = param2;
                    var token = param3;
                    return targetFilePage.upload(url, wikitext, token);
                });
            }
        }
    }

    export class CategoryPorter extends DefaultPorter {

        canPort(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): boolean {
            return super.canPort(sourcePage, targetPage)
                && sourcePage.isCategoryPage && targetPage.isCategoryPage;
        }

        port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage, options: any): JQueryPromise<any> {
            var sourceCategoryPage = sourcePage.asCategoryPage();
            var targetCategoryPage = targetPage.asCategoryPage();
            if (sourceCategoryPage == null || targetCategoryPage == null) {
                // something went wrong...
                var d = $.Deferred()
                d.reject(null);
                return d.promise();
            } else {
                // get pages to be porting
                sourceCategoryPage.getMembers(options.portCategoryOptions).done(params => {
                    var pages = params;
                    $.each(pages, (i, page) => {
                        var sourcePage1 = new Wiki.WikiPage(page, sourcePage.site);
                        var targetPage1 = new Wiki.WikiPage(page, targetPage.site);
                        var porter = sourcePage1.isCategoryPage ? new DefaultPorter() : Config.getPorter(sourcePage1, targetPage1);
                        porter.port(sourcePage1, targetPage1, options);
                    })
                });
                var d = $.Deferred()
                d.reject(null);
                return d.promise();
            }
        }
    }

    export interface CanPortPredicate {
        (sourcePage?: Wiki.WikiPage, targetPage?: Wiki.WikiPage): boolean;
    }

    export interface WikiTextMappingFunc {
        (wikiText: string, sourcePage?: Wiki.WikiPage, targetPage?: Wiki.WikiPage): string;
    }
}