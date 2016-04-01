
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
        ns_dict: { [index: string]: string; };

        constructor(json: any) {
            this.name = json.name;
            this.desc = json.desc;
            this.project_name = json.project_name;
            this.url = json.url;
            this.page_url = json.page_url;
            this.api_url = json.api_url;
            this.ns_dict = {}
            this.ns_dict['文件'] = 'File';
            this.ns_dict['Archivo'] = 'File';
            this.ns_dict[this.project_name] = 'Project';
            this.ns_dict['分类'] = 'Category';
        }

        parsePage(source_url: string): WikiPage {
            var index = source_url.indexOf(this.page_url);
            if (index === 0) {
                var encodedTitle = source_url.substr(this.page_url.length);
                var title = decodeURIComponent(encodedTitle);
                var page = new WikiPage(title, this);
                return page;
            }
            return null;
        }

        getCsrfToken(): JQueryPromise<string> {
            var requestUrl = this.api_url + "?action=query&meta=tokens&format=json";
            return $.ajax({
                url: requestUrl,
            }).then(params => {
                var token = params.query.tokens.csrftoken;
                console.log(token);
                return token;
            })
        }
    }

    export class WikiPage {
        private _title: string;
        private _site: WikiSite;
        private _ns: string;
        private _title_without_ns: string;

        constructor(title: string, site: WikiSite) {
            this._site = site;
            var index = title.indexOf(":");
            if (index > 0) {
                var ns = title.substr(0, index);
                this._ns = (ns in this._site.ns_dict) ? this._site.ns_dict[ns] : ns;
                this._title_without_ns = title.substr(index + 1);
                this._title = this._ns + ":" + this._title_without_ns;
            }
            else {
                this._title_without_ns = title;
                this._title = title;
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

        get isCategoryPage(): boolean {
            return this._ns === "Category";
        }

        getWikiText(): JQueryPromise<string> {
            var requestUrl = this.site.api_url + "?action=query&prop=revisions&rvprop=content&format=json&titles=" + encodeURIComponent(this.title);
            console.log(requestUrl);
            return $.ajax({
                url: requestUrl,
            }).then(params => {
                var pagesNode = params.query.pages;
                var pageNode = this.getFirstChildInObject(pagesNode);
                var wikitext = this.getChildByName(pageNode.revisions[0], "*");
                console.log(wikitext);
                return wikitext;
            });
        }

        edit(wiki_text: string, token: string, overwriteExist: boolean): JQueryPromise<any> {
            var requestUrl = this.site.api_url + "?action=edit&format=json&summary=port&title=" + encodeURIComponent(this.title);
            if (overwriteExist !== true) {
                requestUrl += "&createonly";
            }
            return $.ajax({
                url: requestUrl,
                type: "POST",
                data: {
                    "text": wiki_text,
                    "token": token
                },
            });
        }

        asFilePage(): WikiFilePage {
            return this.isFilePage ? new WikiFilePage(this._title, this._site) : null;
        }

        asCategoryPage(): WikiCategoryPage {
            return this.isCategoryPage ? new WikiCategoryPage(this._title, this._site) : null;
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

        getFileUrl(): JQueryPromise<string> {
            var requestUrl = this.site.api_url + "?action=query&prop=imageinfo&iiprop=url&format=json&titles=" + encodeURIComponent(this.title);
            console.log(requestUrl);
            return $.ajax({
                url: requestUrl,
            }).then(params => {
                console.log(params);
                var pagesNode = params.query.pages;
                var pageNode = this.getFirstChildInObject(pagesNode);
                return pageNode.imageinfo[0].url;
            });
        }

        upload(file_url: string, wiki_text: string, token: string): JQueryPromise<any> {
            var d = $.Deferred();
            // upload by url is not supported by default, so download the image first...
            // jQuery does not support XHR2 yet
            var xhr = new XMLHttpRequest();
            // Hack to pass bytes through unprocessed.
            //xhr.overrideMimeType('text/plain; charset=UTF8');
            xhr.responseType = "arraybuffer";
            xhr.open("GET", file_url, true);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    // 4 = "loaded"
                    if (xhr.status === 200) {
                        //						var array = new Uint16Array(xhr.response);
                        //						var file_content = uInt16Array2String(array);
                        var file_content = xhr.response;
                        console.log(file_content);
                        var requestUrl = this.site.api_url + "?action=upload";
                        console.log(requestUrl);
                        var requestPara = {
                            "filename": this.file_name,
                            "comment": "port",
                            "token": token,
                            "text": wiki_text
                        }
                        var boundary = "---------------------------8ce5ac3ab79ab2c";// todo random
                        //var boundary = '--nodemw' + Math.random().toString().substr(2);
                        var pbb = new PostBodyBuilder(boundary);
                        pbb.appendObject(requestPara);
                        pbb.appendFile("file", this.file_name, file_content);
                        var blob = pbb.toBlob();
                        var fr = new FileReader();
                        fr.readAsArrayBuffer(blob);
                        fr.onload = () => {
                            var postBody = fr.result;
                            var contentType = "multipart/form-data; boundary=" + boundary;

                            console.log(postBody);

                            $.ajax({
                                url: requestUrl,
                                type: "POST",
                                data: postBody,
                                contentType: contentType,
                                processData: false,
                                success: params1 => {
                                    console.log(params1);
                                    d.resolve(params1);
                                },
                                error: (e, msg) => {
                                    console.log(e);
                                    console.log(msg);
                                    d.reject({ message: msg });
                                }
                            })
                        }
                    }
                    else {
                        d.reject({ message: xhr.statusText });
                    }
                }
            }
            xhr.send(null);
            return d.promise();
        }
    }

    export class WikiCategoryPage extends WikiPage {
        constructor(title: string, site: WikiSite) {
            super(title, site);
        }

        getMembers(cmtype: string): JQueryPromise<string[]> {
            var requestUrl = this.site.api_url + "?action=query&list=categorymembers&format=json&rawcontinue&cmtitle=" + encodeURIComponent(this.title) + "&cmtype=" + cmtype;
            var rv = [];
            console.log(requestUrl);
            return $.ajax({
                url: requestUrl,
            }).then(params => {
                console.log(params);
                var members = params.query.categorymembers;
                rv = rv.concat(members.map(member => {
                    return member.title
                }));
                return rv;
            });
        }
    }

    class PostBodyBuilder {
        private CRLF = "\r\n";
        //private _buffer: string;
        private _arrayBuffers: Array<ArrayBuffer>;
        private _boundaryPlus: string;

        constructor(boundary: string) {
            this._boundaryPlus = "--" + boundary;
            this._arrayBuffers = new Array<ArrayBuffer>();
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
            var buffer = this._boundaryPlus + this.CRLF;
            buffer += "Content-Disposition: form-data; name=\"" + key + "\"" + this.CRLF;
            buffer += "Content-Type: text/plain; charset=UTF-8" + this.CRLF;
            buffer += "Content-Transfer-Encoding: 8bit" + this.CRLF;
            buffer += this.CRLF;
            buffer += value + this.CRLF;
            this._arrayBuffers.push(string2Uint8Array(buffer).buffer);
            return this;
        }

        appendFile(key: string, file_name: string, content: ArrayBuffer): PostBodyBuilder {
            var buffer = this._boundaryPlus + this.CRLF;
            buffer += "Content-Disposition: form-data; name=\"" + key + "\"; filename=\"" + file_name + "\"" + this.CRLF;
            buffer += "Content-Type: application/octet-stream; charset=UTF-8" + this.CRLF;
            buffer += "Content-Transfer-Encoding: binary" + this.CRLF;
            buffer += this.CRLF;
            this._arrayBuffers.push(string2Uint8Array(buffer).buffer);
            this._arrayBuffers.push(content);
            this._arrayBuffers.push(string2Uint8Array(this.CRLF).buffer);
            return this;
        }

        //		toString(): string {
        //			this._buffer += this._boundaryPlus + "--";
        //			return this._buffer;
        //		}

        toBlob(): Blob {
            this._arrayBuffers.push(string2Uint8Array(this._boundaryPlus + "--").buffer);
            return new Blob(this._arrayBuffers);
        }
    }
}