/// <reference path="typings/jquery/jquery.d.ts"/>
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

function handleAjaxError(jqXHR, textStatus, errorThrown) {
  console.log(jqXHR);
  console.log(textStatus);
  console.log(errorThrown);
  $("#msgText").text("error, see log.");
  $("#msgText").show();
  $("#loadingImg").hide();
}

$(document).ready(function () {
  $("#navBtn").hide();
  getCurrentTabUrl(function (url) {
    var sourceSite = getSourceWiki(url);
    if (sourceSite === null){
      
      $("#msgText").text("Not a valid wiki page.");
      $("#portBtn").hide();
      $("#loadingImg").hide();
      return;
    }
    
    var targetSite = WIKI_SITES[0];//todo
    var title = url.substring(sourceSite.page_url.length);
    $("#msgText").text();
    $("#portBtn").show();
    $("#portBtn").text("Port " + title + " to " + targetSite.name);
    $("#loadingImg").hide();
    
    $("#portBtn").click(function () {
      $("#loadingImg").show();
      $("#portBtn").hide();      
      
      $("#navBtn").click(function () {
        chrome.tabs.create({ url: targetSite.page_url + title});
      });
      var getWikiTextRequestUrl = sourceSite.api_url + "?action=query&prop=revisions&rvprop=content&format=json&titles=" + title;
      $.ajax({
        url: getWikiTextRequestUrl
      }).done(function (wikiTextParams) {
        var pagesNode = wikiTextParams.query.pages;
        var pageNode = getFirstChildInObject(pagesNode);
        var wikitext = getFirstChildInObject(pageNode.revisions[0]);
        console.log(wikitext);
        $.ajax({
          url: targetSite.api_url + "?action=query&meta=tokens&format=json",
        }).done(function(tokensParam){
          console.log(tokensParam);
          var token = tokensParam.query.tokens.csrftoken;
          console.log(token);
          var editRequestUrl = targetSite.api_url + "?action=edit&format=json&createonly&summary=port&title=" + title;
          var postWikitext = getWikiTextPrefix(url) + wikitext;
          var postBody = {
            "token" : token,
            "text" : postWikitext
          };
          console.log(editRequestUrl);
          $.ajax({
            url: editRequestUrl,
            type: "POST",
            data: postBody,
          }).done(function (params2){
            $("#msgText").text("Done!");
            $("#targetLink").text("See it");
            $("#msgText").show();
            $("#navBtn").show();
            $("#loadingImg").hide();
          }).error(handleAjaxError);
        }).error(handleAjaxError);;
      }).error(handleAjaxError);;
    });
  });
});