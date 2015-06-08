
/// <reference path="wiki.ts"/>
module WikiPorter {
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
		//		{
		//			name: "Tolkein Gateway",
		//			desc: "Tolkein Gateway",
		//			url: "http://www.tolkiengateway.net",
		//			page_url: "http://www.tolkiengateway.net/wiki/",
		//			api_url: "http://www.tolkiengateway.net/w/api.php",
		//		},
		//		{
		//			name: "日文维基百科",
		//			desc: "日文维基百科",
		//			url: "http://ja.wikipedia.org",
		//			page_url: "http://ja.wikipedia.org/wiki/",
		//			api_url: "http://ja.wikipedia.org/w/api.php",
		//		},
		//  {
		//    name : "",
		//    desc : "",
		//    url : "",
		//    page_url : "",
		//    api_url : "",
		//  },
	];

	export class Config {
		static wiki_sites: Array<Wiki.WikiSite>;
		static target_wiki_site: Wiki.WikiSite;
		static wiki_porters: Array<Porter>;
		static default_wiki_text_mapping_func: WikiTextMappingFunc;

		static init() {
			this.wiki_sites = new Array<Wiki.WikiSite>();
			WIKI_SITES.forEach((json) => {
				var site = new Wiki.WikiSite(json);
				this.wiki_sites.push(site);
			});
			this.target_wiki_site = this.wiki_sites[0];//todo
			this.wiki_porters = new Array<Porter>();
			this.default_wiki_text_mapping_func = (wikiText, sourcePage) => {
				return "'''这个页面由[https://github.com/lianzhao/MyWikiHelper Wiki Porter]自动搬运。搬运中产生的版权问题由搬运者自行解决，Wiki Porter不为此搬运行为背书。您可以前往[" + sourcePage.url + " 源地址]查看版权声明。'''[[Category:WikiPorter搬运]]<br>" + wikiText;
			}
			var filePorter = new FilePorter();
			filePorter.wiki_text_mapping_func = this.default_wiki_text_mapping_func;
			this.registerPorter(filePorter);
			var defaultPorter = new DefaultPorter();
			defaultPorter.wiki_text_mapping_func = this.default_wiki_text_mapping_func;
			this.registerPorter(defaultPorter);
		}

		static registerPorter(porter: Porter) {
			this.wiki_porters.push(porter);
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

		port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): P.Promise<any>;
	}

	export class DefaultPorter implements Porter {
		wiki_text_mapping_func: WikiTextMappingFunc;

		canPort(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): boolean {
			return sourcePage.site !== targetPage.site;
		}

		port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): P.Promise<any> {
			var deferredResult = P.defer<any>();
			sourcePage.getWikiText().done(wikitext => {
				targetPage.site.getCsrfToken().done(token=> {
					if (this.wiki_text_mapping_func != null) {
						wikitext = this.wiki_text_mapping_func(wikitext, sourcePage, targetPage);
					}
					targetPage.edit(wikitext, token).done(_ => deferredResult.resolve(_)).fail(deferredResult.reject);
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

		port(sourcePage: Wiki.WikiPage, targetPage: Wiki.WikiPage): P.Promise<any> {
			var deferredResult = P.defer<any>();
			var sourceFilePage = sourcePage.asFilePage();
			var targetFilePage = targetPage.asFilePage();
			if (sourceFilePage == null || targetFilePage == null) {
				// something went wrong...
				return;
			}
			sourcePage.getWikiText().done(wikitext=> {
				sourceFilePage.getFileUrl().done(url => {
					targetPage.site.getCsrfToken().done(token=> {
						if (this.wiki_text_mapping_func != null) {
							wikitext = this.wiki_text_mapping_func(wikitext, sourcePage, targetPage);
						}
						targetFilePage.upload(url, wikitext, token).done(_ => deferredResult.resolve(_)).fail(deferredResult.reject);
					}).fail(deferredResult.reject);
				}).fail(deferredResult.reject);
			}).fail(deferredResult.reject);
			return deferredResult.promise();
		}
	}

	export interface WikiTextMappingFunc {
		(wikiText: string, sourcePage?: Wiki.WikiPage, targetPage?: Wiki.WikiPage): string;
	}
}