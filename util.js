var TARGET_WIKI_URL = "http://lotr.huiji.wiki";
var TARGET_WIKI_API_URL = TARGET_WIKI_URL + "/api.php";

function isWikiUrl(url){
	return url.indexOf("/wiki/") >= 0;
}

function getFirstChildInObject(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      return obj[key];
    }
  }
}