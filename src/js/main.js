/**
 * Created by Duy_Minh_Le on 4/27/2016.
 */
"use strict";
window.jQuery = window.$ = require('jquery');
require('bootstrap');
var strUtil = require('snakecase_cdp');
$("body").on("click", "#hello", function () {
    console.log(strUtil.toSnakeCase("noRmAL\nstring   TO conVert"));
});