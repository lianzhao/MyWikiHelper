/// <reference path="typings/encoding.ts"/>
function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}
function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function uInt8Array2String(array: Uint8Array) {
  return String.fromCharCode.apply(null, array);  
}

function uInt16Array2String(array: Uint16Array) {
  return String.fromCharCode.apply(null, array);  
}

//if (!XMLHttpRequest.prototype.sendAsBinary) {
//  XMLHttpRequest.prototype.sendAsBinary = function(sData) {
//    var nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
//    for (var nIdx = 0; nIdx < nBytes; nIdx++) {
//      ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
//    }
//    /* send as ArrayBufferView...: */
//    this.send(ui8Data);
//    /* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
//  };
//}

function string2Uint8Array(str: string):Uint8Array {
//  var nBytes = str.length;
//  var ui8Data = new Uint8Array(nBytes);
//    for (var nIdx = 0; nIdx < nBytes; nIdx++) {
//      ui8Data[nIdx] = str.charCodeAt(nIdx) & 0xff;
//    }
//    return ui8Data;
var encoder = new TextEncoder("UTF-8");
return encoder.encode(str);
}