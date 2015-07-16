/// <reference path="typings/jquery/jquery.d.ts"/>
/// <reference path="wiki_porter.ts"/>

function getCurrentTabUrl(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };
  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    var url = tab.url;
    callback(url);
  });
}

$(document).ready(() => {
  getCurrentTabUrl(url => {
    $("#navBtn").hide();
    WikiPorter.Config.init();
    
    //custom config
    //port from template manageer: http://templatemanager.huiji.wiki
    var templateManagerPorter = new WikiPorter.DefaultPorter();
    templateManagerPorter.can_port_predicate = (source, target)=>{
      return source.site.name === "模板仓库";
    };
    WikiPorter.Config.registerPorter(templateManagerPorter, 0);
    
    //port from Wikimedia Commons: http://commons.wikimedia.org/wiki/Main_Page
    var commonsMediaWikiFilePorter = new WikiPorter.FilePorter();
    commonsMediaWikiFilePorter.can_port_predicate = (source, target)=>{
      return source.site.name === "Wikimedia Commons";
    };
    commonsMediaWikiFilePorter.wiki_text_mapping_func = (wikiText, source, target)=>{
				return "'''这个文件来自[http://commons.wikimedia.org Wikimedia Commons]。您可以前往[" + source.url + " 源地址]查看版权声明。'''[[Category:Files from Wikimedia Commons]]<br>" + wikiText;
    }
    WikiPorter.Config.registerPorter(commonsMediaWikiFilePorter, 0);
    
    //port from saki wiki: http://saki.cc
    var sakiWikiPorter = new WikiPorter.DefaultPorter();
    sakiWikiPorter.can_port_predicate = (source, target)=>{
      return source.site.name === "SakiWiki";
    }
    sakiWikiPorter.wiki_text_mapping_func = (wikiText, source, target)=>{
      if (wikiText.indexOf("#") === 0){
        // SakiWiki的重定向存在问题：
        // 当访问http://saki.cc/日本麻雀的规则
        // 浏览器没有被重定向至http://saki.cc/日本麻将的规则
        // 只是网页内容展现为“日本麻将的规则”
        // 因此source.title依然是“日本麻雀的规则”，取得的wikitext为“#REDIRECT [[日本麻将的规则]]”
        // 因此，此处不加入{{SakiWiki}}模版
        return wikiText;
      }
				return "{{SakiWiki|" + source.title + "}}\r\n" + wikiText;
    }
    WikiPorter.Config.registerPorter(sakiWikiPorter, 0);
    
    //port from http://coppermind.net to http://coppermind.huiji.wiki
    var cmWikiPorter = new WikiPorter.DefaultPorter();
    cmWikiPorter.can_port_predicate = (source, target)=>{
      return source.site.name === "the Coppermind" && target.site.name === "红铜智库中文维基" && !source.isFilePage;
    };
    WikiPorter.Config.registerPorter(cmWikiPorter, 0);
    
    var page = WikiPorter.Config.parsePage(url);
    if (page === null) {
      $("#msgText").text("Not a valid wiki page.");
      $("#portBtn").hide();
      $("#loadingImg").hide();
      return;
    }
    console.log("source_page=" + page.url);

    var targetSite = WikiPorter.Config.target_wiki_site;//todo
    var targetPage = new Wiki.WikiPage(page.title, targetSite);//todo support differet name
    $("#msgText").text();
    $("#portBtn").show();
    $("#portBtn").text("Port " + page.title + " to " + targetSite.name);
    $("#loadingImg").hide();
    var porter = WikiPorter.Config.getPorter(page, targetPage);
    if (porter === null) {
      // something went wrong...
      return;
    }
    $("#navBtn").click(function() {
      chrome.tabs.create({ url: targetPage.url });
    });
    console.log(porter);
    $("#portBtn").click(() => {
      $("#loadingImg").show();
      $("#portBtn").hide();
      porter.port(page, targetPage).done(params => {
        $("#msgText").text("Done!");
        $("#targetLink").text("See it");
        $("#msgText").show();
        $("#navBtn").show();
        $("#loadingImg").hide();
      }).fail(params => {
        console.log(params.message);
        $("#msgText").text("error, see log.");
        $("#msgText").show();
        $("#loadingImg").hide();
      })
    })
  })
})