/// <reference path="typings/jquery/jquery.d.ts"/>
'use strict';

function getFirstChildInObject(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      return obj[key];
    }
  }
}

function port(tab){
var TARGET_WIKI_API_URL_BASE = "http://lotr.huiji.wiki/api.php";
  var tempIndex = tab.url.indexOf("/wiki/");
  if (tempIndex < 0){
    console.log("Not a valid wiki url");
    return;
  }
  var title = tab.url.substring(tempIndex + 6);
  console.log(title);
  var requestUrl = tab.url.replace("/wiki/", "/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=");
  console.log(requestUrl);
  $.ajax({
    url: requestUrl
  }).done(function (params) {
    var pagesNode = params.query.pages;
    var pageNode = getFirstChildInObject(pagesNode);
    var wikitext = getFirstChildInObject(pageNode.revisions[0]);
    console.log(wikitext);
    $.ajax({
      url: TARGET_WIKI_API_URL_BASE + "?action=query&meta=tokens&format=json",
    }).done(function(tokensParam){
      console.log(tokensParam);
      var token = tokensParam.query.tokens.csrftoken;
      console.log(token);
      var editRequestUrl = TARGET_WIKI_API_URL_BASE + "?action=edit&format=json&createonly&summary=port&title=" + title;
      var postBody = {
        "token" : token,
        "text" : wikitext
      }
      console.log(editRequestUrl);
      $.ajax({
        url: editRequestUrl,
        type: "POST",
        data: postBody,
      }).done(function (params2){
        console.log(params2);
      }).error(function( jqXHR, textStatus, errorThrown){
        console.log(jqXHR);
        console.log(textStatus);
        console.log(errorThrown);
      });
    });
  });
}

// Listener for when the user clicks on the Wikimapper button
chrome.browserAction.onClicked.addListener(function() {
 // chrome.tabs.create({'url': chrome.extension.getURL('html/index.html')}, function() {
 // });
  chrome.tabs.getSelected(null, function (tab){
    port(tab);
  });
});
