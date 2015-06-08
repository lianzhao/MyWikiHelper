
/// <reference path="typings/jquery/jquery.d.ts"/>
/// <reference path="typings/Promise.ts"/>
/// <reference path="util.ts"/>
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
				var encodedTitle = source_url.substr(this.page_url.length);
				var title = decodeURIComponent(encodedTitle);
				title = title.replace(this.project_name + ":", "Project:");
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
		private _ns: string;
		private _title_without_ns: string;

		constructor(title: string, site: WikiSite) {
			this._title = title;
			this._site = site;
			var index = title.indexOf(":");
			if (index > 0) {
				this._ns = title.substr(0, index);
				this._title_without_ns = title.substr(index + 1);
			}
			else {
				this._title_without_ns = title;
			}
		}

		get title(): string {
			return this._title;
		}

		get site(): WikiSite {
			return this._site;
		}

		get url(): string {
			return this._site.page_url + this.title;
		}

		get ns(): string {
			return this._ns;
		}

		get title_without_ns(): string {
			return this._title_without_ns;
		}

		get isFilePage(): boolean {
			return this._ns === "File" || this._ns === "文件";//todo
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

		asFilePage(): WikiFilePage {
			return this.isFilePage ? new WikiFilePage(this._title, this._site) : null;
		}

		protected getFirstChildInObject(obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					return obj[key];
				}
			}
		}

		protected getChildByName(obj: Object, name: string) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key) && key === name) {
					return obj[key];
				}
			}
		}
	}

	export class WikiFilePage extends WikiPage {
		constructor(title: string, site: WikiSite) {
			super(title, site);
		}

		get file_name(): string {
			return this.title_without_ns;
		}

		getFileUrl(): P.Promise<string> {
			var deferredResult = P.defer<string>();
			var requestUrl = this.site.api_url + "?action=query&prop=imageinfo&iiprop=url&format=json&titles=" + this.title;
			console.log(requestUrl);
			$.ajax({
				url: requestUrl,
				success: params => {
					console.log(params);
					var pagesNode = params.query.pages;
					var pageNode = this.getFirstChildInObject(pagesNode);
					deferredResult.resolve(pageNode.imageinfo[0].url);
				},
				error: (e, msg) => {
					deferredResult.reject({ message: msg });
				}
			})
			return deferredResult.promise();
		}

		upload(file_url: string, wiki_text: string, token: string): P.Promise<any> {
			var deferredResult = P.defer<any>();
			// upload by url is not supported by default, so download the image first...
			$.ajax({
				url: file_url,
				success: params => {
					console.log(params);
					var requestUrl = this.site.api_url + "?action=upload";
					console.log(requestUrl);
					var requestPara = {
						"filename": this.file_name,
						//"comment": "port",
						"token": token
					}
					var boundary = "---------------------------8ce5ac3ab79ab2c";// todo random
					//var boundary = '--nodemw' + Math.random().toString().substr(2);
					var pbb = new PostBodyBuilder(boundary);
					pbb.appendObject(requestPara);
					pbb.appendFile("file", this.file_name, params);
					var postBody = pbb.toString();
					var contentType = "multipart/form-data; boundary=" + boundary;

					console.log(postBody);
					console.log(contentType);
					var xhr = new XMLHttpRequest();
					xhr.open("POST", requestUrl, true);
					xhr.setRequestHeader("Content-Type", contentType);
					xhr.onreadystatechange = () => {
						if (xhr.readyState === 4) {
							// 4 = "loaded"
							console.log(xhr);
							if (xhr.status === 200) {
								deferredResult.resolve(xhr);
							}
							else {
								deferredResult.reject({ message: xhr.statusText });
							}
						}
					};
					xhr.send(postBody);

					//console.log(postBody);
					//					$.ajax({
					//						url: requestUrl,
					//						type: "POST",
					//						data: postBody,
					//						//async: false,
					//						//contentType: "multipart/form-data; boundary=" + boundary,
					//						//						headers: {
					//						//							"content-type": "multipart/form-data; boundary=" + boundary
					//						//						},
					//						//contentType: false,
					//						contentType: contentType,
					//						processData: false,
					//						beforeSend: (xhr,settings)=>{
					//							console.log(xhr);
					//							console.log(settings);
					//						},
					//						success: params1 => {
					//							console.log(params1);
					//							deferredResult.resolve(params1);
					//						},
					//						error: (e, msg) => {
					//							console.log(e);
					//							console.log(msg);
					//							deferredResult.reject({ message: msg });
					//						}
					//					})
				},
				error: (e, msg) => {
					console.log(e);
					console.log(msg);
					deferredResult.reject({ message: msg });
				}
			})


			//			var requestUrl = this.site.api_url + "?action=upload&url=" + file_url + "&filename=" + this.file_name + "&comment=port";
			//			console.log(requestUrl);
			//			console.log(this.file_name);
			//			console.log(file_url);
			//			$.ajax({
			//				url: requestUrl,
			//				data: {
			//					//"filename": this.file_name,
			//					//"url": file_url,
			//					//"comment": "port",
			//					"text": wiki_text,
			//					"token": token
			//				},
			//				success: params => {
			//					deferredResult.resolve(params);
			//				},
			//				error: (e, msg) => {
			//					console.log(e);
			//					console.log(msg);
			//					deferredResult.reject({ message: msg });
			//				}
			//			})
			return deferredResult.promise();
		}
	}

	class PostBodyBuilder {
		private CRLF = "\r\n";
		private _buffer: string;
		private _boundaryPlus: string;

		constructor(boundary: string) {
			this._boundaryPlus = "--" + boundary;
			this._buffer = "";
		}

		appendObject(obj: any): PostBodyBuilder {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					this.appendString(key, "" + obj[key]);
				}
			}
			return this;
		}

		appendString(key: string, value: string): PostBodyBuilder {
			this._buffer += this._boundaryPlus + this.CRLF;
			this._buffer += "Content-Disposition: form-data; name=\"" + key + "\"" + this.CRLF;
			this._buffer += "Content-Type: text/plain; charset=UTF-8" + this.CRLF;
			this._buffer += "Content-Transfer-Encoding: 8bit" + this.CRLF;
			this._buffer += this.CRLF;
			this._buffer += value + this.CRLF;
			return this;
		}

		appendFile(key: string, file_name: string, content: any): PostBodyBuilder {
			this._buffer += this._boundaryPlus + this.CRLF;
			this._buffer += "Content-Disposition: form-data; name=\"" + key + "\"; filename=\"" + file_name + "\"" + this.CRLF;
			this._buffer += "Content-Type: application/octet-stream; charset=UTF-8" + this.CRLF;
			this._buffer += "Content-Transfer-Encoding: binary" + this.CRLF;
			this._buffer += this.CRLF;
			this._buffer += content + this.CRLF;
			return this;
		}

		toString(): string {
			this._buffer += this._boundaryPlus + "--";
			return this._buffer;
		}
	}
}