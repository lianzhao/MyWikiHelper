var TARGET_WIKI_URL = "http://lotr.huiji.wiki";
var TARGET_WIKI_API_URL = TARGET_WIKI_URL + "/api.php";

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