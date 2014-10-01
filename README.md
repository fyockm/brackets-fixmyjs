brackets-fixmyjs
================

[Brackets](http://brackets.io/) Extension for [fixmyjs](https://github.com/jshint/fixmyjs).

> Automagically fix JSHint lint warnings using [fixmyjs](https://github.com/jshint/fixmyjs)

## Install

Search for "fixmyjs" in [Extension Manager](https://github.com/adobe/brackets/wiki/Brackets-Extensions), then click on `Install` for FixMyJS by Drew Fyock.

### Alternative Install

Download zip and extract into arbitrary directory (or clone source files), then move the folder to the extensions folder (you can open this folder by clicking "Help > Show Extensions Folder" menu).


##Usage

`Edit > FixMyJS` menu or ?? key.

<img src="https://cloud.githubusercontent.com/assets/170270/4474662/ceab387a-4962-11e4-99ab-17dd5c44847c.gif" width="399">

*Issues with the output should be reported on the fixmyjs [issue tracker](https://github.com/jshint/fixmyjs/issues).*

Can also be run on just a selection. For example the code in a `<script>` tag.


## Legacy mode

By default, this plugin uses the FixMyJS `legacy` mode. This option uses the last stable version of the module which uses JSHint to detect errors in your code and fix them.

It does not include all of the fixes the current version of FixMyJS exposes, but does do a much better job of preserving source formatting. Legacy mode can be disabled in the Settings.


## License

MIT © [Drew Fyock](http://steelbisondev.com)