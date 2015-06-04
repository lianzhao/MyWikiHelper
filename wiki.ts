
/// <reference path="typings/jquery/jquery.d.ts"/>
/// <reference path="typings/Promise.ts"/>
module Wiki {
	export class WikiSite {
		name: string;
		desc: string;
		project_name: string;
		url: string;
		page_url: string;
		api_url: string;

		constructor(json: any) {
			this.name = json.name;
			this.desc = json.desc;
			this.project_name = json.project_name;
			this.url = json.url;
			this.page_url = json.page_url;
			this.api_url = json.api_url;
		}

		parsePage(source_url: string): WikiPage {
			var index = source_url.indexOf(this.page_url);
			if (index === 0) {
				var title = source_url.substr(this.page_url.length).replace(this.project_name + ":", "Project:");
				var page = new WikiPage(title, this);
				return page;
			}
			return null;
		}

		getCsrfToken(): P.Promise<string> {
			var deferredResult = P.defer<string>();
			var requestUrl = this.api_url + "?action=query&meta=tokens&format=json";
			$.ajax({
				url: requestUrl,
				success: params=> {
					var token = params.query.tokens.csrftoken;
					console.log(token);
					deferredResult.resolve(token);
				},
				error: (e, msg) => {
					deferredResult.reject({ message: msg });
				}
			})
			return deferredResult.promise();
		}
	}

	export class WikiPage {
		private _title: string;
		private _site: WikiSite;
		
		constructor(title: string, site: WikiSite){
			this._title = title;
			this._site = site;
		}
		
		get title(): string{
			return this._title;
		}
		
		get site(): WikiSite{
			return this._site;
		}
		
		get url(): string{
			return this._site.page_url + this.title;
		}

		getWikiText(): P.Promise<string> {
			var deferredResult = P.defer<string>();
			var requestUrl = this.site.api_url + "?action=query&prop=revisions&rvprop=content&format=json&titles=" + this.title;
			console.log(requestUrl);
			$.ajax({
				url: requestUrl,
				success: params => {
					var pagesNode = params.query.pages;
					var pageNode = this.getFirstChildInObject(pagesNode);
					var wikitext = this.getChildByName(pageNode.revisions[0], "*");
					console.log(wikitext);
					deferredResult.resolve(wikitext);
				},
				error: (e, msg) => {
					deferredResult.reject({ message: msg });
				}
			});
			return deferredResult.promise();
		}

		edit(wiki_text: string, token: string): P.Promise<any> {
			var deferredResult = P.defer<any>();
			var requestUrl = this.site.api_url + "?action=edit&format=json&createonly&summary=port&title=" + this.title;
			$.ajax({
				url: requestUrl,
				type: "POST",
				data: {
					"text": wiki_text,
					"token": token
				},
				success: params => {
					deferredResult.resolve(params);
				},
				error: (e, msg) => {
					deferredResult.reject({ message: msg });
				}
			})
			return deferredResult.promise();
		}

		private getFirstChildInObject(obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					return obj[key];
				}
			}
		}
		
		private getChildByName(obj: Object, name: string){
			for (var key in obj) {
				if (obj.hasOwnProperty(key) && key === name) {
					return obj[key];
				}
			}
		}
	}
}