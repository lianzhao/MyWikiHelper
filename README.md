# MyWikiHelper
It's a chrome extension.
Port wiki text to http://*.huiji.wiki

## Feature
搬运维基页面至灰机
前提：
* 你在灰机登录，且对目标页面有编辑权限
* 目标页面不存在

## Install
木有发布到chrome store因为木有钱。。。

提供两种变通的安装方式：
1. 以开发者模式从源代码安装
2. 下载crx安装https://raw.githubusercontent.com/lianzhao/MyWikiHelper/master/dist/MyWikiHelper.crx

详细方法请自行google

## Supported Wiki Sites
See: https://github.com/lianzhao/MyWikiHelper/blob/master/src/wiki_sites.ts

WIKI_SITES中的第一个将被当作目标维基网站
如果希望添加源维基网站，或者想要修改目标维基网站，请自行修改代码。
* 简单的增加对这个维基站点的支持，请参考[1](https://github.com/lianzhao/MyWikiHelper/commit/8726fba1db04074e8e8c7a9c316a0184a153bda8)和[2](https://github.com/lianzhao/MyWikiHelper/commit/759f38f4e679ed3dafb09ac175f5df0953e3eda7)
* 进一步自定义搬运过程，请参考[这里](https://github.com/lianzhao/MyWikiHelper/commit/0aa08fd6842f3219e8b0e7f71a1d04d6856e5549)

## 免责声明
注意：使用本软件搬运维基页面属于个人行为，本软件不为因此产生的版权纠纷背书。

## License
MIT License: https://raw.githubusercontent.com/lianzhao/MyWikiHelper/master/LICENSE
