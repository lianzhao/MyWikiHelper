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