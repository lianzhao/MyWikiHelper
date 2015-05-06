function getWikiTextPrefix(url){
	return "'''这个页面由[https://github.com/lianzhao/MyWikiHelper Wiki Porter]自动搬运。搬运中产生的版权问题由搬运者自行解决，Wiki Porter不为此搬运行为背书。您可以前往["+url+" 源地址]查看版权声明。'''[[Category:WikiPorter搬运]]<br>";
}

function getFirstChildInObject(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      return obj[key];
    }
  }
}

var WIKI_SITES = [
  {
    name : "魔戒中文维基",
    desc : "魔戒中文维基",
    url : "http://lotr.huiji.wiki",
    page_url : "http://lotr.huiji.wiki/wiki/",
    api_url : "http://lotr.huiji.wiki/api.php",
  },
  {
    name : "Tolkein Gateway",
    desc : "Tolkein Gateway",
    url : "http://www.tolkiengateway.net",
    page_url : "http://www.tolkiengateway.net/wiki/",
    api_url : "http://www.tolkiengateway.net/w/api.php",
  },
//  {
//    name : "",
//    desc : "",
//    url : "",
//    page_url : "",
//    api_url : "",
//  },
];

function getSourceWiki(url){
  for (var index = 0; index < WIKI_SITES.length; index++) {
    var site = WIKI_SITES[index];
    if (url.indexOf(site.page_url) == 0){
      return site;
    }
  }
  return null;
}