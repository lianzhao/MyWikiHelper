/// <reference path="typings/jquery/jquery.d.ts"/>
/// <reference path="wiki_porter.ts"/>

function getCurrentTabUrl(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };
  chrome.tabs.query(queryInfo, function (tabs) {
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
    templateManagerPorter.can_port_predicate = (source, target) => {
      return source.site.name === "模板仓库";
    };
    WikiPorter.Config.registerPorter(templateManagerPorter, 0);

    //port from Wikimedia Commons: http://commons.wikimedia.org/wiki/Main_Page
    var commonsMediaWikiFilePorter = new WikiPorter.FilePorter();
    commonsMediaWikiFilePorter.can_port_predicate = (source, target) => {
      return source.site.name === "Wikimedia Commons";
    };
    commonsMediaWikiFilePorter.wiki_text_mapping_func = (wikiText, source, target) => {
      var d = $.Deferred()
      d.resolve("'''这个文件来自[http://commons.wikimedia.org Wikimedia Commons]。您可以前往[" + source.url + " 源地址]查看版权声明。'''[[Category:Files from Wikimedia Commons]]<br>" + wikiText);
      return d.promise();
    }
    WikiPorter.Config.registerPorter(commonsMediaWikiFilePorter, 0);

    //port from saki wiki: http://saki.cc
    var sakiWikiPorter = new WikiPorter.DefaultPorter();
    sakiWikiPorter.can_port_predicate = (source, target) => {
      return source.site.name === "SakiWiki";
    }
    sakiWikiPorter.wiki_text_mapping_func = (wikiText, source, target) => {
      var rv;
      if (wikiText.indexOf("#") === 0) {
        // SakiWiki的重定向存在问题：
        // 当访问http://saki.cc/日本麻雀的规则
        // 浏览器没有被重定向至http://saki.cc/日本麻将的规则
        // 只是网页内容展现为“日本麻将的规则”
        // 因此source.title依然是“日本麻雀的规则”，取得的wikitext为“#REDIRECT [[日本麻将的规则]]”
        // 因此，此处不加入{{SakiWiki}}模版
        rv = wikiText;
      } else {
        rv = "{{SakiWiki|" + source.title + "}}\r\n" + wikiText;
      }
      var d = $.Deferred();
      d.resolve(rv);
      return d.promise();
    }
    WikiPorter.Config.registerPorter(sakiWikiPorter, 0);

    //port from http://coppermind.net
    var cmWikiPorter = new WikiPorter.DefaultPorter();
    cmWikiPorter.can_port_predicate = (source, target) => {
      return source.site.name === "the Coppermind" && target.site.name === "红铜智库中文维基" && !source.isFilePage && !source.isCategoryPage;
    };
    cmWikiPorter.wiki_text_mapping_func = (wikiText, source, target, options) => {
      var d = $.Deferred();
      source.getProps(['revisions']).done(pageNode => {
        var text = "{{需要翻译}}\r\n{{CmPermission}}\r\n" + wikiText;
        var revid = pageNode.revisions[0].revid
        if (revid) {
          text = text + "\r\n{{ensync|" + revid + "}}"
        }
        if (options.moveTo) {
          text = text.replace("'''" + source.title + "'''", "'''" + options.moveTo + "'''{{en|" + source.title + "}}");
        }
        d.resolve(text)
      }).fail(err => {
        d.reject(err);
      })
      return d.promise();
    }
    WikiPorter.Config.registerPorter(cmWikiPorter, 0);

    var page = WikiPorter.Config.parsePage(url);
    if (page === null) {
      console.log("Not a valid wiki page.")
      $("#msgText").text("Not a valid wiki page.");
      $("#portBtn").hide();
      $("#targetSiteDropDown").hide();
      $("#moveto-container").hide();
      $("#loadingImg").hide();
      return;
    }
    if (page.isCategoryPage) {
      $("#categoryconfig").removeClass('hide');
    }
    console.log("source_page=" + page.url);
    console.log($("#portBtn"));
    console.log($("#targetSiteDropDown"));
    console.log($("#msgText"));

    WIKI_SITES.forEach((site, i) => {
      $("#targetSiteDropDown").append(new Option(site.name, site.name, false, i === 0));
      if (i === 0) {
        $("#portBtn").text("Port " + page.title + " to " + site.name);
      }
    });
    $("#targetSiteDropDown").change(e => {
      var targetSiteName = $("#targetSiteDropDown").find("option:selected").text();
      $("#portBtn").text("Port " + page.title + " to " + targetSiteName);
    });
    $("#msgText").text();
    $("#portBtn").show();
    $("#targetSiteDropDown").show();
    $("#moveto-container").show();
    $("#loadingImg").hide();
    $("#portBtn").click(() => {
      var targetSiteName = $("#targetSiteDropDown").find("option:selected").text();
      var targetSite = new Wiki.WikiSite(WIKI_SITES.filter((site, i) => site.name === targetSiteName)[0]);
      console.log(targetSite);
      var targetPage = new Wiki.WikiPage(page.title, targetSite);
      var porter = WikiPorter.Config.getPorter(page, targetPage);
      if (porter === null) {
        // something went wrong...
        return;
      }
      var options = {
        overwriteExist: false,//todo
        portCategoryOptions: $('input[name=portCategory]:checked').map((i, e) => $(e).val()).toArray(),
        moveTo: $('input[name=moveto]').val()
      }
      if (page.isCategoryPage && options.portCategoryOptions.length <= 0) {
        return;
      }
      console.log(options);
      $("#navBtn").click(function () {
        chrome.tabs.create({ url: targetPage.url });
      });
      $("#loadingImg").show();
      $("#portBtn").hide();
      $("#targetSiteDropDown").hide();
      $("#moveto-container").hide();
      porter.port(page, targetPage, options).done(params => {
        $("#msgText").text("Done!");
        $("#targetLink").text("See it");
        $("#msgText").show();
        $("#navBtn").show();
        $("#loadingImg").hide();
        $("#categoryconfig").hide();
      }).fail(params => {
        console.log(params.message);
        $("#msgText").text("error, see log.");
        $("#msgText").show();
        $("#loadingImg").hide();
        $("#categoryconfig").hide();
      })
    })
  })
})