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

$(document).ready(function () {
  $("#navBtn").hide();
  getCurrentTabUrl(function (url) {
    var tempIndex = url.indexOf("/wiki/");
    if (tempIndex < 0){
      $("#msgText").text("Not a valid wiki page.");
      $("#portBtn").hide();
      $("#loadingImg").hide();
      return;
    }
    $("#msgText").text();
    $("#portBtn").show();
    $("#portBtn").text("Port to " + TARGET_WIKI_URL);
    $("#loadingImg").hide();
    
    $("#portBtn").click(function () {
      $("#loadingImg").show();
      $("#portBtn").hide();
      
      var title = url.substring(tempIndex + 6);
      $("#navBtn").click(function () {
        chrome.tabs.create({ url: TARGET_WIKI_URL + "/wiki/" + title});
      })
      var requestUrl = url.replace("/wiki/", "/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=");
      $.ajax({
        url: requestUrl
      }).done(function (params) {
        var pagesNode = params.query.pages;
        var pageNode = getFirstChildInObject(pagesNode);
        var wikitext = getFirstChildInObject(pageNode.revisions[0]);
        console.log(wikitext);
        $.ajax({
          url: TARGET_WIKI_API_URL + "?action=query&meta=tokens&format=json",
        }).done(function(tokensParam){
          console.log(tokensParam);
          var token = tokensParam.query.tokens.csrftoken;
          console.log(token);
          var editRequestUrl = TARGET_WIKI_API_URL + "?action=edit&format=json&createonly&summary=port&title=" + title;
          var postBody = {
            "token" : token,
            "text" : wikitext
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
          }).error(function( jqXHR, textStatus, errorThrown){
            console.log(jqXHR);
            console.log(textStatus);
            console.log(errorThrown);
            $("#msgText").text("error, see log.");
            $("#msgText").show();
            $("#loadingImg").hide();
          });
        });
      });
    });
  });
});