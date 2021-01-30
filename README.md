Firefox Extension. Show tweets translation based on Bing Translator.

This extension is written for self-use, therefore no feature requests may be accepted. You are still welcomed to post issues / pull requests though.

## Usage

1. Install this extension
2. Open sidebar for this extension
3. Visit twitter website (only support new UI)
4. Focus some tweets / Point mouse to some tweets
5. Translation will appear in sidebar

## Configuration

No configuration UI was implemented yet (and maybe never). Currently, you need to edit the JSON config dircetly. The JSON object contains following keys:

* `darkMode`: enable dark theme or not
* `backgroundWorkerPoolSize`: how many bing translator page opened in background
* `backgroundCacheSize`: how many tweets may cached in background
* `sidebarFontSize`: font size of sidebar in px
* `translateTargetLang`: language translate to, use values on bing translate select box
    * The value of select box for language translated to on https://www.bing.com/translator
    * Supported values when this readme write would includes
        > `af`, `ar`, `as`, `bg`, `bn`, `bs`, `ca`, `cs`, `cy`, `da`, `de`, `el`, `en`, `es`, `es`, `et`, `fa`, `fi`, `fil`, `fj`, `fr`, `fr-ca`, `ga`, `gu`, `he`, `hi`, `hr`, `ht`, `hu`, `id`, `is`, `it`, `iu`, `ja`, `kk`, `kmr`, `kn`, `ko`, `ku`, `lt`, `lv`, `mg`, `mi`, `ml`, `mr`, `ms`, `mt`, `mww`, `nb`, `nl`, `or`, `otq`, `pa`, `pl`, `prs`, `ps`, `pt`, `pt-pt`, `ro`, `ru`, `sk`, `sl`, `sm`, `sr-Cyrl`, `sr-Latn`, `sv`, `sw`, `ta`, `te`, `th`, `tlh-Latn`, `tlh-Piqd`, `to`, `tr`, `ty`, `uk`, `ur`, `vi`, `yua`, `yue`, `zh-Hans`, `zh-Hant`
    * For example, Chinese Simplified is `zh-Hans`, not `zh-CN` nor `zh`
* `translateIgnoreLang`: language in this list will not be translated
    * Use `lang` attribute set by Twitter. You may find out its value by inspect elements of tweets.
    * This may be different from above key. For example, Chinese is `zh`, not `zh-Hans`

A restart would be required to make any modification applied.

## FAQ

* For users in China,  https://www.bing.com/translator may redirect to cn.bing.com. This extension won't work due to mismatched domain name. 使用中国 IP 访问必应翻译时，可能会重定向到 cn.bing.com。此时本扩展会因域名不匹配而不可用。
* Make sure https://www.bing.com/translator works on your browser. Some extensions (e.g. NoScript) may break its functionality, and also break this extension.

## Privacy

An webpage connect to bing.com will always be opened in background.

This extension will send all tweets to bing.com for translation. Make sure check their privacy statement first.

## License

You may use this extension under the MPL-2.0. Checkout LICENSE file for more details.
